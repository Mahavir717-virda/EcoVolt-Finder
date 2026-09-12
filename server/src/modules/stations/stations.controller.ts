import { Request, Response, NextFunction } from 'express';
import { StationsService } from './stations.service';
import {
  searchStationsQuerySchema,
  createStationSchema,
  updateStationSchema,
  createConnectorSchema,
} from './stations.schema';
import { ValidationError, UnauthorizedError } from '../../middleware/error-handler';

export class StationsController {
  public static async searchStations(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const parsed = searchStationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new ValidationError('Invalid station query parameters', parsed.error.format()));
    }

    try {
      const stations = await StationsService.searchNearbyStations(parsed.data);
      res.status(200).json(stations);
    } catch (err) {
      next(err);
    }
  }

  public static async getStation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = req.params.id;
      const stationId = Array.isArray(rawId) ? rawId[0] : rawId;
      const userLat = req.query.lat ? parseFloat(String(req.query.lat)) : undefined;
      const userLng = req.query.lng ? parseFloat(String(req.query.lng)) : undefined;
      const station = await StationsService.getStationDetail(stationId, userLat, userLng);
      res.status(200).json(station);
    } catch (err) {
      next(err);
    }
  }

  public static async getManagerStations(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    try {
      const stations = await StationsService.getManagerStations(req.user.sub);
      res.status(200).json(stations);
    } catch (err) {
      next(err);
    }
  }

  public static async createStation(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const parsed = createStationSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid station creation data', parsed.error.format()));
    }

    try {
      const ignoreDuplicate = req.query.ignoreDuplicate === 'true';
      const station = await StationsService.createStation(req.user.sub, parsed.data, ignoreDuplicate);
      res.status(201).json(station);
    } catch (err) {
      next(err);
    }
  }

  public static async updateStation(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = updateStationSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid station update data', parsed.error.format()));
    }

    try {
      const rawId = req.params.id;
      const stationId = Array.isArray(rawId) ? rawId[0] : rawId;
      const updated = await StationsService.updateStation(stationId, parsed.data);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async updateDemandCap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = req.params.id;
      const stationId = Array.isArray(rawId) ? rawId[0] : rawId;
      const capKw = req.body.maxTransformerKw;
      if (typeof capKw !== 'number') {
        throw new ValidationError('Invalid demand cap value', { capKw: { _errors: ['Required number'] } });
      }
      const updated = await StationsService.updateDemandCap(stationId, capKw);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async listOperators(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const operators = await StationsService.listOperators();
      res.status(200).json(operators);
    } catch (err) {
      next(err);
    }
  }

  public static async addConnector(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = createConnectorSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid connector creation data', parsed.error.format()));
    }

    try {
      const rawId = req.params.id;
      const stationId = Array.isArray(rawId) ? rawId[0] : rawId;
      const connector = await StationsService.addConnector(stationId, parsed.data);
      res.status(201).json(connector);
    } catch (err) {
      next(err);
    }
  }

  public static async getConnector(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = req.params.id;
      const connectorId = Array.isArray(rawId) ? rawId[0] : rawId;
      const connector = await StationsService.getConnectorDetail(connectorId);
      res.status(200).json(connector);
    } catch (err) {
      next(err);
    }
  }

  public static async updateConnectorStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    const status = req.body.status;
    if (!status || typeof status !== 'string') {
      return next(new ValidationError('Invalid status', { status: { _errors: ['Required string'] } }));
    }

    try {
      const rawId = req.params.id;
      const connectorId = Array.isArray(rawId) ? rawId[0] : rawId;
      const updated = await StationsService.updateConnectorStatus(connectorId, status);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async updateConnector(req: Request, res: Response, next: NextFunction): Promise<void> {
    // We would ideally have updateConnectorSchema imported, but I can use it directly if it's there
    // For safety, let's just pass req.body since validation can be done inside or we import it.
    // Actually it is not imported here.
    try {
      const rawId = req.params.connectorId || req.params.id;
      const connectorId = Array.isArray(rawId) ? rawId[0] : rawId;
      const updated = await StationsService.updateConnector(connectorId, req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async updateConnectorStatusByType(req: Request, res: Response, next: NextFunction): Promise<void> {
    const status = req.body.status;
    if (!status || typeof status !== 'string') {
      return next(new ValidationError('Invalid status', { status: { _errors: ['Required string'] } }));
    }

    try {
      const rawId = req.params.id;
      const stationId = Array.isArray(rawId) ? rawId[0] : rawId;
      const rawType = req.params.connectorType;
      const connectorType = Array.isArray(rawType) ? rawType[0] : rawType;
      
      const updated = await StationsService.updateConnectorStatusByType(stationId, connectorType, status);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
}
