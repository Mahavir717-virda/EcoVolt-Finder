/**
 * Stations Service
 * Handles station fetching, searching, and geo-filtering via EcoVolt API
 */

import { Station, Charger } from '@/types/database.types';
import { apiRequest, MockFallbacks } from './api';
import {
  adaptEcoVoltStation,
  adaptEcoVoltChargers,
  StationWithChargers,
  StationWithDistance,
} from './adapters';
import { calculateDistance } from '@/utils/distance';

export interface StationFilters {
  chargerType?: string;
  connectorType?: string;
  minPower?: number;
  availableOnly?: boolean;
  minGreenness?: number;
  searchQuery?: string;
}

export async function getStations(filters?: StationFilters): Promise<Station[]> {
  try {
    const rawList = await apiRequest<any[]>(
      '/stations',
      { method: 'GET' },
      MockFallbacks.stations
    );

    let stations: Station[] = (rawList || []).map(adaptEcoVoltStation);

    if (filters) {
      if (filters.availableOnly) {
        stations = stations.filter((s) => s.available_chargers > 0);
      }
      if (filters.minGreenness !== undefined && filters.minGreenness > 0) {
        stations = stations.filter((s) => (s.greenness_score || 0) >= filters.minGreenness!);
      }
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        stations = stations.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.address.toLowerCase().includes(q) ||
            s.city.toLowerCase().includes(q)
        );
      }
    }

    return stations;
  } catch (err) {
    console.error('Failed to get stations:', err);
    return (MockFallbacks.stations || []).map(adaptEcoVoltStation);
  }
}

export async function getStationById(id: string): Promise<StationWithChargers | null> {
  try {
    const fallbackRaw = (MockFallbacks.stations || []).find(
      (s: any) => String(s.id) === String(id) || String(s.stationId) === String(id)
    ) || MockFallbacks.stations[0];

    const raw = await apiRequest<any>(
      `/stations/${id}`,
      { method: 'GET' },
      fallbackRaw
    );

    if (!raw) return null;

    const station = adaptEcoVoltStation(raw);
    const chargers: Charger[] = adaptEcoVoltChargers(raw);

    return {
      ...station,
      chargers,
    };
  } catch (err) {
    console.error(`Failed to get station ${id}:`, err);
    const fallbackRaw = MockFallbacks.stations[0];
    return {
      ...adaptEcoVoltStation(fallbackRaw),
      chargers: adaptEcoVoltChargers(fallbackRaw),
    };
  }
}

export interface NearbyStationsOptions {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
  filters?: StationFilters;
}

export async function getNearbyStations(
  optionsOrLat: number | NearbyStationsOptions,
  maybeLng?: number,
  maybeRadius?: number
): Promise<StationWithDistance[]> {
  let lat: number;
  let lng: number;
  let radius = 25;
  let filters: StationFilters | undefined;
  let limit: number | undefined;

  if (typeof optionsOrLat === 'object') {
    lat = optionsOrLat.latitude;
    lng = optionsOrLat.longitude;
    radius = optionsOrLat.radiusKm ?? 25;
    filters = optionsOrLat.filters;
    limit = optionsOrLat.limit;
  } else {
    lat = optionsOrLat;
    lng = maybeLng!;
    radius = maybeRadius ?? 25;
  }

  const allStations = await getStations(filters);
  const withDistance: StationWithDistance[] = allStations.map((station) => {
    const dist = calculateDistance(
      { latitude: lat, longitude: lng },
      { latitude: station.latitude, longitude: station.longitude }
    );
    return {
      ...station,
      distance: dist,
    };
  });

  let results = withDistance
    .filter((s) => s.distance <= radius)
    .sort((a, b) => a.distance - b.distance);

  if (limit) {
    results = results.slice(0, limit);
  }

  return results;
}

export async function searchStations(query: string): Promise<Station[]> {
  return getStations({ searchQuery: query });
}

export type { StationWithChargers, StationWithDistance };
