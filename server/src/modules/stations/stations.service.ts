import { PowerProvider, ConnectorType } from '@prisma/client';
import { GreennessBand, DataQuality } from '../../../../contracts/enums';
import { prisma } from '../../db/client';
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

    // Compute distance and filter within radius
    const evaluatedRaw = await Promise.all(stations.map(async (station) => {
        const distanceKm = this.calculateDistance(lat, lng, station.lat, station.lng);

        // Compute priceFrom
        const tariff = station.zone.tariffs.find((t) => t.provider === station.provider);
        const baseRate = tariff ? tariff.baseRate : 13.0;
        const markup = station.pricingRules[0]?.providerMarkup ?? 2.5;
        const priceFrom = Math.round((baseRate + markup) * 10) / 10;

        // Fetch renewable % from ForecastCache for the station's zone (current hour)
        const now = new Date();
        const forecast = await prisma.forecastCache.findFirst({
          where: {
            zoneId: station.zoneId,
            hourStartLocal: { lte: now },
          },
          orderBy: { hourStartLocal: 'desc' },
        });
        const renewablePct = forecast ? forecast.renewablePct : (station.zoneId === 'IN-WE' ? 72 : 55);

        const summary: StationSummaryResponse = {
          id: station.id,
          name: station.name,
          location: {
            lat: station.lat,
            lng: station.lng,
          },
          operatorName: station.operator.name,
          provider: station.provider,
          connectors: station.connectors.map((c) => ({
            type: c.type,
            powerKw: c.powerKw,
            available: c.availableCount,
            total: c.totalCount,
          })),
          greenness: {
            renewablePct,
            band: this.getGreennessBand(renewablePct),
            quality: forecast ? DataQuality.LIVE : DataQuality.CACHED,
          },
          priceFrom,
          distanceKm,
        };

        return summary;
      }));
    const evaluated = evaluatedRaw.filter((s) => s.distanceKm! <= radiusKm);


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
  public static async getStationDetail(stationId: string) {
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

    // Fetch renewable % from ForecastCache for the station's zone (current hour)
    const now = new Date();
    const forecast = await prisma.forecastCache.findFirst({
      where: {
        zoneId: station.zoneId,
        hourStartLocal: { lte: now },
      },
      orderBy: { hourStartLocal: 'desc' },
    });
    const renewablePct = forecast ? forecast.renewablePct : 65;
    const band = this.getGreennessBand(renewablePct);

    return {
      ...station,
      priceFrom: Math.round((baseRate + markup) * 10) / 10,
      greenness: {
        zoneId: station.zoneId,
        renewablePct,
        band,
        quality: forecast ? DataQuality.LIVE : DataQuality.CACHED,
      },
    };
  }

  /**
   * Create a station (Manager only)
   */
  public static async createStation(userId: string, input: CreateStationInput) {
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
}
