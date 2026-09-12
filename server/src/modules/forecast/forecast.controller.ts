import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/client';
import { mlClient } from '../../integrations/mlClient';
import { NotFoundError } from '../../middleware/error-handler';

export const getForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { zoneId, stationId } = req.query;

    let targetZoneId = (zoneId as string) || 'IN-WE';

    if (stationId) {
      const station = await prisma.station.findUnique({
        where: { id: stationId as string },
        include: { zone: true },
      });

      if (!station) {
        throw new NotFoundError('Station not found');
      }
      targetZoneId = station.zone.id;
    }

    const forecast = await mlClient.getForecast(targetZoneId, 24);
    return res.status(200).json(forecast);
  } catch (error) {
    next(error);
  }
};

export const getLiveGrid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { zoneId, stationId } = req.query;
    let targetZoneId = (zoneId as string) || 'IN-WE';

    if (stationId) {
      const station = await prisma.station.findUnique({
        where: { id: stationId as string },
        include: { zone: true },
      });

      if (!station) {
        throw new NotFoundError('Station not found');
      }
      targetZoneId = station.zone.id;
    }

    const live = await mlClient.getLiveGrid(targetZoneId);
    return res.status(200).json(live);
  } catch (error) {
    next(error);
  }
};
