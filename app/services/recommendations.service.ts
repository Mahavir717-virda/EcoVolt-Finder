/**
 * EcoVolt Recommendations Service
 * Connects frontend to the server & ML recommendation engine with full device GPS and user context.
 */

import { apiRequest } from './api';

export interface StationRecommendationResult {
  station: {
    id: string;
    name: string;
    location: { lat: number; lng: number };
    operatorName: string;
    provider: string;
    connectors: Array<{
      type: string;
      powerKw: number;
      available: number;
      total: number;
    }>;
    greenness: {
      renewablePct: number;
      band: string;
      quality: string;
    };
    priceFrom: number;
  };
  distanceKm: number;
  travelMinutes: number;
  energyNeededKwh: number;
  chargingCost: number;
  travelCost: number;
  trueTotalCost: number;
  vsCheapestSticker: number;
  reachable: boolean;
  connectorCompatible: boolean;
  recommendedWindow?: {
    startLocal: string;
    endLocal: string;
    renewablePct: number;
    expectedSavings: number;
  };
  reason: string;
}

export interface GetRecommendationsParams {
  originLat?: number;
  originLng?: number;
  vehicleId?: string;
  kwh?: number;
  currentChargePct?: number;
  batteryKwh?: number;
}

export async function fetchPersonalizedRecommendations(
  params: GetRecommendationsParams
): Promise<StationRecommendationResult[]> {
  try {
    const query = new URLSearchParams();
    if (params.originLat !== undefined) query.append('originLat', params.originLat.toString());
    if (params.originLng !== undefined) query.append('originLng', params.originLng.toString());
    if (params.vehicleId) query.append('vehicleId', params.vehicleId);
    if (params.kwh !== undefined) query.append('kwh', params.kwh.toString());

    const endpoint = `/recommendations?${query.toString()}`;
    const res = await apiRequest<StationRecommendationResult[]>(endpoint, { method: 'GET' });
    return Array.isArray(res) ? res : [];
  } catch (error) {
    console.warn('[recommendations.service] Failed to fetch recommendations:', error);
    return [];
  }
}
