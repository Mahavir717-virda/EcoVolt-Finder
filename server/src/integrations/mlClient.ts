import axios, { AxiosInstance } from 'axios';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { DataQuality, GreennessBand, ConnectorType, VehicleClass } from '../../../contracts/enums';
import {
  GridSnapshot,
  ForecastPoint,
  StationRecommendation,
  GeoPoint,
} from '../../../contracts/types';

// In-memory short-TTL cache entry
interface CacheEntry<T> {
  data: T;
  cachedAt: number; // timestamp ms
  ttlMs: number;
}

class MlClient {
  private client: AxiosInstance;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private examplesDir: string;

  constructor() {
    this.client = axios.create({
      baseURL: env.ML_SERVICE_URL,
      timeout: 2000, // 2-second timeout
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.examplesDir = path.resolve(__dirname, '../../../contracts/examples');
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
      ttlMs,
    });
  }

  private loadMockExample<T>(filename: string): T {
    try {
      const filePath = path.join(this.examplesDir, filename);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as T;
      }
    } catch (e) {
      console.warn(`[MlClient] Failed to read mock file ${filename}:`, e);
    }
    throw new Error(`Mock example not found: ${filename}`);
  }

  /**
   * GET /grid/live?zoneId=IN-WE
   */
  async getLiveGrid(zoneId: string): Promise<GridSnapshot> {
    const cacheKey = `grid_live_${zoneId}`;
    const cached = this.getFromCache<GridSnapshot>(cacheKey);
    if (cached) {
      return {
        ...cached,
        quality: DataQuality.CACHED,
      };
    }

    try {
      const res = await this.client.get<GridSnapshot>('/grid/live', {
        params: { zoneId },
      });
      if (res.data) {
        const data = { ...res.data };
        if (!data.carbonIntensity || data.carbonIntensity <= 0) {
          const renPct = data.renewablePct || 25;
          data.carbonIntensity = Math.round(620 * (1 - (renPct / 100) * 0.55));
        }
        this.setCache(cacheKey, data, 15000);
        return data;
      }
    } catch (err: any) {
      console.warn(`[MlClient] /grid/live failed (${err.message}). Using mock fallback.`);
    }

    // Fallback to contracts/examples/grid_live.json
    try {
      const mock = this.loadMockExample<GridSnapshot>('grid_live.json');
      return {
        ...mock,
        zoneId: zoneId || mock.zoneId,
        quality: DataQuality.MOCK,
      };
    } catch {
      return {
        zoneId: zoneId || 'IN-WE',
        at: new Date().toISOString(),
        renewablePct: 70,
        carbonFreePct: 75,
        carbonIntensity: 420,
        band: GreennessBand.HIGH,
        breakdown: { solar: 4500, wind: 3000, hydro: 1500, coal: 6000 },
        quality: DataQuality.MOCK,
        asOfAgeSec: 0,
      };
    }
  }

  /**
   * GET /grid/forecast?zoneId=IN-WE&hours=24
   */
  async getForecast(zoneId: string, hours: number = 24): Promise<ForecastPoint[]> {
    const cacheKey = `grid_forecast_${zoneId}_${hours}`;
    const cached = this.getFromCache<ForecastPoint[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const res = await this.client.get<ForecastPoint[]>('/grid/forecast', {
        params: { zoneId, hours },
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        this.setCache(cacheKey, res.data, 60000);
        return res.data;
      }
    } catch (err: any) {
      console.warn(`[MlClient] /grid/forecast failed (${err.message}). Using mock fallback.`);
    }

    // Fallback to contracts/examples/grid_forecast.json
    try {
      const mock = this.loadMockExample<ForecastPoint[]>('grid_forecast.json');
      return mock.slice(0, hours);
    } catch {
      // Deterministic synthetic 24-point fallback
      const points: ForecastPoint[] = [];
      const now = new Date();
      for (let i = 0; i < hours; i++) {
        const d = new Date(now.getTime() + i * 3600000);
        points.push({
          hourStartLocal: d.toISOString(),
          renewablePct: Math.round(50 + 30 * Math.sin((i / 24) * Math.PI * 2)),
          carbonIntensity: 450,
          confidence: 0.75,
        });
      }
      return points;
    }
  }

  /**
   * POST /route/matrix
   */
  async getRouteMatrix(
    origin: GeoPoint,
    stationCoords: GeoPoint[]
  ): Promise<{ results: Array<{ distanceKm: number; travelMinutes: number; isEstimated: boolean }> }> {
    try {
      const res = await this.client.post('/route/matrix', {
        origin,
        stationCoords,
      });
      if (res.data && Array.isArray(res.data.results)) {
        return res.data;
      }
    } catch (err: any) {
      console.warn(`[MlClient] /route/matrix failed (${err.message}). Using mock fallback.`);
    }

    try {
      return this.loadMockExample<{
        results: Array<{ distanceKm: number; travelMinutes: number; isEstimated: boolean }>;
      }>('route_matrix.json');
    } catch {
      return {
        results: stationCoords.map((_s, idx) => ({
          distanceKm: 2.5 * (idx + 1),
          travelMinutes: Math.round(8 * (idx + 1)),
          isEstimated: true,
        })),
      };
    }
  }

  /**
   * POST /recommend
   */
  async getRecommendations(params: {
    origin: GeoPoint;
    vehicle: {
      vehicleClass: VehicleClass;
      batteryKwh: number;
      efficiencyWhKm: number;
      connectors: string[];
      currentChargePct: number;
    };
    kwh: number;
    candidateStations: Array<{
      id: string;
      location: GeoPoint;
      connectors: string[];
      finalPricePerKwh: number;
      provider: string;
    }>;
  }): Promise<StationRecommendation[]> {
    try {
      const res = await this.client.post<StationRecommendation[]>('/recommend', params);
      if (Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
    } catch (err: any) {
      console.warn(`[MlClient] /recommend failed (${err.message}). Using mock fallback.`);
    }

    // Fallback: try contracts/examples/recommend.json
    try {
      const rawMock = this.loadMockExample<any[]>('recommend.json');
      // Format as StationRecommendation matching contracts
      const formatted = rawMock.map((m) => {
        const candidate = params.candidateStations.find((s) => s.id === m.stationId) || params.candidateStations[0];
        return {
          station: {
            id: m.stationId,
            name: candidate ? `Station ${candidate.id}` : `Station ${m.stationId}`,
            location: candidate ? candidate.location : { lat: 23.0225, lng: 72.5714 },
            operatorName: 'EcoVolt Partner',
            provider: candidate ? (candidate.provider as any) : 'torrent_power',
            connectors: [
              {
                type: (candidate && candidate.connectors[0]) || 'ccs2',
                powerKw: 50,
                available: 2,
                total: 4,
              },
            ],
            greenness: {
              renewablePct: m.recommendedWindow?.renewablePct || 75,
              band: GreennessBand.HIGH,
              quality: DataQuality.MOCK,
            },
            priceFrom: candidate ? candidate.finalPricePerKwh : 6.5,
          },
          distanceKm: m.distanceKm,
          travelMinutes: m.travelMinutes,
          energyNeededKwh: m.energyNeededKwh,
          chargingCost: m.chargingCost,
          travelCost: m.travelCost,
          trueTotalCost: m.trueTotalCost,
          vsCheapestSticker: m.vsCheapestSticker,
          reachable: m.reachable,
          connectorCompatible: m.connectorCompatible,
          recommendedWindow: m.recommendedWindow,
          reason: m.reason,
        } as StationRecommendation;
      });
      return formatted;
    } catch {
      return [];
    }
  }

  /**
   * POST /smartcharge/plan
   */
  async getSmartChargePlan(params: {
    zoneId: string;
    stationId: string;
    chargeRateKw: number;
    energyNeededKwh: number;
    deadlineLocal: string;
    urgent?: boolean;
    tariff?: number;
  }) {
    try {
      const res = await this.client.post('/smartcharge/plan', params);
      if (res.data) {
        return res.data;
      }
    } catch (err: any) {
      console.warn(`[MlClient] /smartcharge/plan failed (${err.message}). Using mock fallback.`);
    }

    try {
      return this.loadMockExample('smartcharge_plan.json');
    } catch {
      return {
        startLocal: new Date().toISOString(),
        endLocal: new Date(Date.now() + 5400000).toISOString(),
        expectedRenewablePct: 80,
        expectedSavings: 25.0,
        confidence: 0.75,
        isImmediate: false,
        note: 'Fallback simulated smart-charge window.',
      };
    }
  }
}

export const mlClient = new MlClient();
