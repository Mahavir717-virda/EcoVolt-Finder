import { PowerProvider, ConnectorType } from '@prisma/client';
import { GreennessBand, DataQuality } from '../../../../contracts/enums';
import { prisma } from '../../db/client';
import { mlClient } from '../../integrations/mlClient';
import { NotFoundError, BadRequestError } from '../../middleware/error-handler';
import {
  SearchStationsQuery,
  CreateStationInput,
  UpdateStationInput,
  CreateConnectorInput,
  UpdateConnectorInput,
} from './stations.schema';

export interface StationSummaryResponse {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  operatorName: string;
  provider: PowerProvider;
  connectors: {
    type: ConnectorType;
    powerKw: number;
    available: number;
    total: number;
  }[];
  greenness: {
    renewablePct: number;
    band: GreennessBand;
    quality: DataQuality;
  };
  priceFrom: number;
  distanceKm?: number;
}

export interface CachedForecast {
  renewablePct: number;
  quality: DataQuality;
  cachedAt: number;
}

const FORECAST_CACHE_TTL_MS = 15 * 1000; // 15s in-memory cache (matches ML service TTL)
const forecastMemoryCache = new Map<string, CachedForecast>();

/**
 * Resolves real-time renewable % for a zone.
 * Priority: ML live grid → DB forecastCache → hardcoded Indian-grid default.
 * Results are cached in-process for FORECAST_CACHE_TTL_MS to avoid hammering the ML service.
 */
export async function getZoneForecast(zoneId: string): Promise<CachedForecast> {
  const cached = forecastMemoryCache.get(zoneId);
  const now = Date.now();
  if (cached && (now - cached.cachedAt) < FORECAST_CACHE_TTL_MS) {
    return cached;
  }

  // 1. Try ML live grid first (real-time data)
  try {
    const liveGrid = await mlClient.getLiveGrid(zoneId);
    if (liveGrid && typeof liveGrid.renewablePct === 'number') {
      const result: CachedForecast = {
        renewablePct: liveGrid.renewablePct,
        quality: liveGrid.quality || DataQuality.LIVE,
        cachedAt: now,
      };
      forecastMemoryCache.set(zoneId, result);
      return result;
    }
  } catch (mlErr) {
    console.warn(`[getZoneForecast] ML live grid failed for zone ${zoneId}, falling back to DB:`, mlErr);
  }

  // 2. Fall back to DB forecastCache (populated by sessions worker)
  try {
    const forecast = await prisma.forecastCache.findFirst({
      where: {
        zoneId,
        hourStartLocal: { lte: new Date() },
      },
      orderBy: { hourStartLocal: 'desc' },
    });

    if (forecast) {
      const result: CachedForecast = {
        renewablePct: forecast.renewablePct,
        quality: DataQuality.CACHED,
        cachedAt: now,
      };
      forecastMemoryCache.set(zoneId, result);
      return result;
    }
  } catch (dbErr) {
    console.warn(`[getZoneForecast] DB forecastCache lookup failed for zone ${zoneId}:`, dbErr);
  }

  // 3. Last-resort hardcoded fallback (Indian grid average)
  const fallback: CachedForecast = {
    renewablePct: zoneId === 'IN-WE' ? 68 : 55,
    quality: DataQuality.MOCK,
    cachedAt: now,
  };
  forecastMemoryCache.set(zoneId, fallback);
  return fallback;
}

export class StationsService {
  /**
   * Calculate Haversine distance in km between two geo-points
   */
  public static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Determine greenness band from renewable percentage
   */
  public static getGreennessBand(renewablePct: number): GreennessBand {
    if (renewablePct >= 75) return GreennessBand.VERY_HIGH;
    if (renewablePct >= 60) return GreennessBand.HIGH;
    if (renewablePct >= 40) return GreennessBand.MEDIUM;
    if (renewablePct >= 20) return GreennessBand.LOW;
    return GreennessBand.VERY_LOW;
  }

  /**
   * Search nearby stations with Haversine formula and K-candidate cap (Edge Case #26)
   */
  public static async searchNearbyStations(
    query: SearchStationsQuery
  ): Promise<StationSummaryResponse[]> {
    const { lat, lng, radiusKm, connector, class: vehicleClass, sort } = query;

    // Fetch active stations with connectors, operator, tariffs & pricing rules
    const stations = await prisma.station.findMany({
      where: {
        isActive: true,
        ...(connector
          ? {
              connectors: {
                some: {
                  type: connector as ConnectorType,
                },
              },
            }
          : {}),
        ...(vehicleClass === 'bike'
          ? {
              connectors: {
                some: {
                  type: {
                    in: [
                      ConnectorType.type2_ac,
                      ConnectorType.three_pin,
                      ConnectorType.bharat_ac_001,
                    ],
                  },
                },
              },
            }
          : {}),
      },
      include: {
        operator: true,
        connectors: true,
        pricingRules: true,
        zone: {
          include: {
            tariffs: true,
          },
        },
      },
    });

    // Batch resolve distinct zones in 1 roundtrip (or cache hit)
    const distinctZones = Array.from(new Set(stations.map((s) => s.zoneId)));
    const zoneForecasts = new Map<string, { renewablePct: number; quality: DataQuality }>();
    await Promise.all(
      distinctZones.map(async (zid) => {
        const fc = await getZoneForecast(zid);
        zoneForecasts.set(zid, fc);
      })
    );

    // Compute distance and map synchronously in memory with zero extra DB calls
    const evaluatedRaw: StationSummaryResponse[] = stations.map((station) => {
      const distanceKm = this.calculateDistance(lat, lng, station.lat, station.lng);

      // Compute priceFrom
      const tariff = station.zone.tariffs.find((t) => t.provider === station.provider);
      const baseRate = tariff ? tariff.baseRate : 13.0;
      const markup = station.pricingRules[0]?.providerMarkup ?? 2.5;
      const priceFrom = Math.round((baseRate + markup) * 10) / 10;

      const forecast = zoneForecasts.get(station.zoneId) || {
        renewablePct: station.zoneId === 'IN-WE' ? 72 : 55,
        quality: DataQuality.CACHED,
      };
      const renewablePct = forecast.renewablePct;

      return {
        id: station.id,
        name: station.name,
        location: {
          lat: station.lat,
          lng: station.lng,
        },
        operatorName: station.operator.name,
        provider: station.provider,
        connectors: station.connectors.map((c) => ({
          id: c.id,
          type: c.type,
          powerKw: c.powerKw,
          available: c.availableCount,
          total: c.totalCount,
        })),
        greenness: {
          renewablePct,
          band: this.getGreennessBand(renewablePct),
          quality: forecast.quality,
        },
        priceFrom,
        distanceKm,
      };
    });

    let evaluated = evaluatedRaw.filter((s) => s.distanceKm! <= radiusKm);
    if (evaluated.length === 0 && evaluatedRaw.length > 0) {
      evaluated = [...evaluatedRaw];
    }

    // Sort results
    if (sort === 'greenest') {
      evaluated.sort((a, b) => b.greenness.renewablePct - a.greenness.renewablePct);
    } else {
      // Default: nearest
      evaluated.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    // Cap candidate set to top K = 25 (Edge Case #26)
    return evaluated.slice(0, 25);
  }

  /**
   * Get full station detail
   */
  public static async getStationDetail(stationId: string, userLat?: number, userLng?: number) {
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        operator: true,
        connectors: true,
        pricingRules: true,
        zone: {
          include: {
            tariffs: true,
          },
        },
      },
    });

    if (!station) {
      throw new NotFoundError(`Station not found with id: ${stationId}`);
    }

    const tariff = station.zone.tariffs.find((t) => t.provider === station.provider);
    const baseRate = tariff ? tariff.baseRate : 13.0;
    const markup = station.pricingRules[0]?.providerMarkup ?? 2.5;

    // Fetch renewable % from cached ForecastCache for the station's zone
    const forecast = await getZoneForecast(station.zoneId);
    const renewablePct = forecast.renewablePct;
    const band = this.getGreennessBand(renewablePct);

    let distanceKm: number | undefined;
    if (userLat !== undefined && userLng !== undefined && !isNaN(userLat) && !isNaN(userLng)) {
      distanceKm = this.calculateDistance(userLat, userLng, station.lat, station.lng);
    }

    return {
      ...station,
      operatorName: station.operator?.name || 'EV Network',
      location: {
        lat: station.lat,
        lng: station.lng,
      },
      connectors: station.connectors.map((c) => ({
        id: c.id,
        type: c.type,
        powerKw: c.powerKw,
        available: c.availableCount,
        total: c.totalCount,
        availableCount: c.availableCount,
        totalCount: c.totalCount,
        status: c.status,
      })),
      priceFrom: Math.round((baseRate + markup) * 10) / 10,
      distanceKm,
      greenness: {
        zoneId: station.zoneId,
        renewablePct,
        band,
        quality: forecast.quality,
      },
    };
  }

  /**
   * Create a station (Manager only)
   */
  public static async createStation(userId: string, input: CreateStationInput, ignoreDuplicate: boolean = false) {
    let operator = await prisma.operator.findFirst({
      where: { userId },
    });

    if (!operator) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      operator = await prisma.operator.create({
        data: {
          userId,
          name: `${user?.name || 'Manager'} EV Network`,
          contactEmail: user?.email,
        },
      });
    }

    if (!ignoreDuplicate) {
      // Check for nearby duplicates (e.g., within 50m / 0.05km)
      const existingStations = await prisma.station.findMany({
        where: { isActive: true },
        select: { id: true, lat: true, lng: true, name: true }
      });
      for (const s of existingStations) {
        const dist = this.calculateDistance(input.location.lat, input.location.lng, s.lat, s.lng);
        if (dist < 0.05) {
          throw new BadRequestError(`Duplicate Warning: Station '${s.name}' exists nearby (${dist * 1000}m). Use ignoreDuplicate=true to bypass.`);
        }
      }
    }

    return prisma.station.create({
      data: {
        operatorId: operator.id,
        name: input.name,
        lat: input.location.lat,
        lng: input.location.lng,
        address: input.address,
        provider: input.provider as PowerProvider,
        zoneId: input.zoneId,
        connectors: input.connectors
          ? {
              create: input.connectors.map((c) => ({
                type: c.type as ConnectorType,
                powerKw: c.powerKw,
                totalCount: c.totalCount,
                availableCount: c.availableCount,
              })),
            }
          : undefined,
        pricingRules: {
          create: {
            providerMarkup: 2.5,
            enableDynamicDiscount: true,
            discountMaxKwh: 2.5,
          },
        },
      },
      include: {
        connectors: true,
        operator: true,
      },
    });
  }

  /**
   * Update station (Manager, ownership guarded)
   */
  public static async updateStation(stationId: string, input: UpdateStationInput) {
    return prisma.station.update({
      where: { id: stationId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.address ? { address: input.address } : {}),
        ...(input.provider ? { provider: input.provider as PowerProvider } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: {
        connectors: true,
      },
    });
  }

  /**
   * Update station demand cap (Manager)
   */
  public static async updateDemandCap(stationId: string, maxTransformerKw: number) {
    return prisma.station.update({
      where: { id: stationId },
      data: { maxTransformerKw },
    });
  }

  /**
   * List operators
   */
  public static async listOperators() {
    return prisma.operator.findMany({
      include: {
        _count: {
          select: { stations: true },
        },
      },
    });
  }

  /**
   * Add connector to station
   */
  public static async addConnector(stationId: string, input: CreateConnectorInput) {
    return prisma.connector.create({
      data: {
        stationId,
        type: input.type as ConnectorType,
        powerKw: input.powerKw,
        totalCount: input.totalCount,
        availableCount: input.availableCount,
        status: input.status,
      },
    });
  }

  /**
   * Get connector by ID
   */
  public static async getConnectorDetail(connectorId: string) {
    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
      include: {
        station: {
          include: {
            pricingRules: true,
            zone: {
              include: { tariffs: true },
            },
          },
        },
      },
    });

    if (!connector) {
      throw new NotFoundError(`Connector not found with id: ${connectorId}`);
    }

    // Calculate price
    const station = connector.station;
    const tariff = station.zone.tariffs.find((t) => t.provider === station.provider);
    const baseRate = tariff ? tariff.baseRate : 13.0;
    const markup = station.pricingRules[0]?.providerMarkup ?? 2.5;
    const pricePerKwh = Math.round((baseRate + markup) * 10) / 10;

    // Return flattened object matching what the frontend expects
    return {
      id: connector.id,
      stationId: connector.stationId,
      type: connector.type,
      powerKw: connector.powerKw,
      status: connector.status,
      pricePerKwh: pricePerKwh,
      createdAt: connector.createdAt,
      updatedAt: connector.updatedAt,
    };
  }

  /**
   * Update connector status
   */
  public static async updateConnectorStatus(connectorId: string, status: string) {
    return prisma.connector.update({
      where: { id: connectorId },
      data: { status },
    });
  }

  /**
   * Update connector (Manager, with validation for count reduction)
   */
  public static async updateConnector(connectorId: string, input: UpdateConnectorInput) {
    const connector = await prisma.connector.findUnique({
      where: { id: connectorId },
      include: {
        sessions: {
          where: { status: 'active' }
        }
      }
    });

    if (!connector) {
      throw new NotFoundError(`Connector not found`);
    }

    // Edge Case #15: Prevent count reduction if it would drop below active sessions
    if (input.totalCount !== undefined && input.totalCount < connector.totalCount) {
      const activeCount = connector.sessions.length;
      if (input.totalCount < activeCount) {
        throw new BadRequestError(`Cannot reduce connector count to ${input.totalCount}. There are currently ${activeCount} active sessions.`);
      }
      
      // Re-adjust availableCount
      const newAvailable = Math.max(0, input.totalCount - activeCount);
      input.availableCount = newAvailable;
    }

    return prisma.connector.update({
      where: { id: connectorId },
      data: {
        ...(input.powerKw !== undefined ? { powerKw: input.powerKw } : {}),
        ...(input.totalCount !== undefined ? { totalCount: input.totalCount } : {}),
        ...(input.availableCount !== undefined ? { availableCount: input.availableCount } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
  }

  /**
   * Get Manager Stations
   */
  public static async getManagerStations(userId: string) {
    const operator = await prisma.operator.findFirst({
      where: { userId },
      include: {
        stations: {
          include: {
            operator: true,
            connectors: true,
            pricingRules: true,
            zone: {
              include: { tariffs: true }
            },
            sessions: {
              where: {
                startedAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
              }
            }
          }
        }
      }
    });

    if (!operator || !operator.stations) {
      return [];
    }

    const stations = operator.stations;
    
    // Batch resolve distinct zones
    const distinctZones = Array.from(new Set(stations.map((s) => s.zoneId)));
    const zoneForecasts = new Map<string, { renewablePct: number; quality: DataQuality }>();
    await Promise.all(
      distinctZones.map(async (zid) => {
        const fc = await getZoneForecast(zid);
        zoneForecasts.set(zid, fc);
      })
    );

    return stations.map(station => {
      const forecast = zoneForecasts.get(station.zoneId) || { renewablePct: 55 };
      const renewableSharePct = forecast.renewablePct;
      
      const pricing = station.pricingRules[0] || null;
      const tariff = station.zone.tariffs.find(t => t.provider === station.provider);
      
      const revenueToday = station.sessions.reduce((acc, s) => acc + (s.cost || 0), 0);
      const energyDeliveredTodayKwh = station.sessions.reduce((acc, s) => acc + (s.energyKwh || 0), 0);
      
      const demandRisk = station.maxTransformerKw ? (
        // Mock currentDemandKw based on active sessions powerKw (simplified)
        station.connectors.reduce((acc, c) => acc + (c.totalCount - c.availableCount) * c.powerKw, 0)
        / station.maxTransformerKw >= 0.8 ? 'high' : 'low'
      ) : 'low';
      
      const currentDemandKw = station.connectors.reduce((acc, c) => acc + (c.totalCount - c.availableCount) * c.powerKw, 0);

      return {
        id: station.id,
        managerId: userId,
        name: station.name,
        address: station.address,
        location: { lat: station.lat, lng: station.lng },
        operatorName: station.operator.name,
        operatorPhone: station.operator.contactEmail || '',
        provider: station.provider,
        zoneId: station.zoneId,
        currentDemandKw,
        maxTransformerKw: station.maxTransformerKw,
        demandRisk,
        revenueToday,
        energyDeliveredTodayKwh,
        renewableSharePct,
        connectors: station.connectors.map(c => ({
          type: c.type,
          powerKw: c.powerKw,
          available: c.availableCount,
          total: c.totalCount,
          status: c.status === 'offline' ? 'offline' : 'online'
        })),
        pricing: pricing ? {
          baseTariff: tariff ? tariff.baseRate : 13.0,
          providerMarkup: pricing.providerMarkup,
          dynamicGreenDiscount: pricing.enableDynamicDiscount,
          maxGreenDiscount: pricing.discountMaxKwh
        } : undefined
      };
    });
  }

  /**
   * Update connector status by Type for a specific station (bulk updates if multiple)
   */
  public static async updateConnectorStatusByType(stationId: string, connectorType: string, status: string) {
    const connectors = await prisma.connector.findMany({
      where: { stationId, type: connectorType as ConnectorType }
    });

    if (connectors.length === 0) {
      throw new NotFoundError(`Connectors not found`);
    }

    await prisma.connector.updateMany({
      where: { stationId, type: connectorType as ConnectorType },
      data: { status }
    });
    
    return { success: true };
  }
}

