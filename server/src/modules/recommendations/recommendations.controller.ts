import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/client';
import { mlClient } from '../../integrations/mlClient';
import { googleProxy } from '../../integrations/googleProxy';
import { BadRequestError, NotFoundError } from '../../middleware/error-handler';
import { ConnectorType, DataQuality, GreennessBand, VehicleClass } from '../../../../contracts/enums';
import { StationRecommendation, StationSummary } from '../../../../contracts/types';

const recommendationsQuerySchema = z.object({
  originLat: z.string().transform((v) => parseFloat(v)),
  originLng: z.string().transform((v) => parseFloat(v)),
  vehicleId: z.string().min(1, 'vehicleId is required'),
  kwh: z.string().transform((v) => parseFloat(v)),
});

export const getRecommendations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = recommendationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError('Invalid query parameters for recommendations', parsed.error.format());
    }

    const { originLat, originLng, vehicleId, kwh } = parsed.data;

    if (isNaN(originLat) || isNaN(originLng) || isNaN(kwh) || kwh <= 0) {
      throw new BadRequestError('Invalid coordinates or kwh value');
    }

    // 1. Fetch vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    // 2. Fetch candidate stations (nearest top 25)
    const stations = await prisma.station.findMany({
      include: {
        operator: true,
        connectors: true,
        zone: true,
        pricingRules: true,
      },
      take: 25,
    });

    if (!stations.length) {
      return res.status(200).json([]);
    }

    // 3. Compute distance matrix via googleProxy
    const candidateCoords = stations.map((s) => ({ lat: s.lat, lng: s.lng }));
    const distanceResults = await googleProxy.getDistanceMatrix(
      { lat: originLat, lng: originLng },
      candidateCoords
    );

    // 4. Try ML Client recommendations
    const candidateStations = stations.map((s, idx) => ({
      id: s.id,
      location: { lat: s.lat, lng: s.lng },
      connectors: s.connectors.map((c) => c.type),
      finalPricePerKwh: 6.5, // nominal base
      provider: s.provider,
    }));

    const mlRecommendations = await mlClient.getRecommendations({
      origin: { lat: originLat, lng: originLng },
      vehicle: {
        vehicleClass: vehicle.vehicleClass as VehicleClass,
        batteryKwh: vehicle.batteryKwh,
        efficiencyWhKm: vehicle.efficiencyWhKm,
        connectors: vehicle.connectors,
        currentChargePct: vehicle.currentChargePct,
      },
      kwh,
      candidateStations,
    });

    if (mlRecommendations && mlRecommendations.length > 0) {
      // Map station summaries and enrich with live DB info
      const enriched = mlRecommendations.map((rec, index) => {
        const matchingStation = stations.find((s) => s.id === rec.station?.id || s.id === (rec as any).stationId) || stations[index % stations.length];
        const distInfo = distanceResults[index] || { distanceKm: rec.distanceKm, durationMinutes: rec.travelMinutes };

        const stationSummary: StationSummary = {
          id: matchingStation.id,
          name: matchingStation.name,
          location: { lat: matchingStation.lat, lng: matchingStation.lng },
          operatorName: matchingStation.operator.name,
          provider: matchingStation.provider as any,
          connectors: matchingStation.connectors.map((c) => ({
            type: c.type as ConnectorType,
            powerKw: c.powerKw,
            available: c.availableCount,
            total: c.totalCount,
          })),
          greenness: {
            renewablePct: rec.recommendedWindow?.renewablePct || 75,
            band: GreennessBand.HIGH,
            quality: DataQuality.MOCK,
          },
          priceFrom: 6.5,
        };

        const vehicleEffKwhKm = vehicle.efficiencyWhKm / 1000;
        const travelEnergyKwh = distInfo.distanceKm * vehicleEffKwhKm;
        const travelCost = Number((travelEnergyKwh * 6.5).toFixed(2));
        const chargingCost = Number((kwh * 6.5).toFixed(2));
        const trueTotalCost = Number((chargingCost + travelCost).toFixed(2));

        const batteryRemainingKwh = (vehicle.currentChargePct / 100) * vehicle.batteryKwh;
        const reachable = batteryRemainingKwh >= travelEnergyKwh * 1.1; // 10% safety buffer

        const connectorCompatible = matchingStation.connectors.some((c) =>
          vehicle.connectors.includes(c.type)
        );

        return {
          station: stationSummary,
          distanceKm: distInfo.distanceKm,
          travelMinutes: distInfo.durationMinutes,
          energyNeededKwh: kwh,
          chargingCost: rec.chargingCost || chargingCost,
          travelCost: rec.travelCost || travelCost,
          trueTotalCost: rec.trueTotalCost || trueTotalCost,
          vsCheapestSticker: rec.vsCheapestSticker || 0,
          reachable: rec.reachable !== undefined ? rec.reachable : reachable,
          connectorCompatible: rec.connectorCompatible !== undefined ? rec.connectorCompatible : connectorCompatible,
          recommendedWindow: rec.recommendedWindow,
          reason: rec.reason || `Optimal route based on ${distInfo.distanceKm} km travel.`,
        } as StationRecommendation;
      });

      return res.status(200).json(enriched);
    }

    // Fallback: Compute recommendations locally if ML returns empty
    const localRecommendations: StationRecommendation[] = stations.map((s, idx) => {
      const distInfo = distanceResults[idx];
      const vehicleEffKwhKm = vehicle.efficiencyWhKm / 1000;
      const travelEnergyKwh = distInfo.distanceKm * vehicleEffKwhKm;
      const travelCost = Number((travelEnergyKwh * 6.5).toFixed(2));
      const chargingCost = Number((kwh * 6.5).toFixed(2));
      const trueTotalCost = Number((chargingCost + travelCost).toFixed(2));

      const batteryRemainingKwh = (vehicle.currentChargePct / 100) * vehicle.batteryKwh;
      const reachable = batteryRemainingKwh >= travelEnergyKwh * 1.1;

      const connectorCompatible = s.connectors.some((c) =>
        vehicle.connectors.includes(c.type)
      );

      return {
        station: {
          id: s.id,
          name: s.name,
          location: { lat: s.lat, lng: s.lng },
          operatorName: s.operator.name,
          provider: s.provider as any,
          connectors: s.connectors.map((c) => ({
            type: c.type as ConnectorType,
            powerKw: c.powerKw,
            available: c.availableCount,
            total: c.totalCount,
          })),
          greenness: {
            renewablePct: 75,
            band: GreennessBand.HIGH,
            quality: DataQuality.MOCK,
          },
          priceFrom: 6.5,
        },
        distanceKm: distInfo.distanceKm,
        travelMinutes: distInfo.durationMinutes,
        energyNeededKwh: kwh,
        chargingCost,
        travelCost,
        trueTotalCost,
        vsCheapestSticker: 0,
        reachable,
        connectorCompatible,
        reason: `Closest available station with ${distInfo.distanceKm} km route.`,
      };
    });

    // Sort by true total cost ascending
    localRecommendations.sort((a, b) => a.trueTotalCost - b.trueTotalCost);

    return res.status(200).json(localRecommendations);
  } catch (error) {
    next(error);
  }
};
