/**
 * Stations Service
 * Handles station fetching, searching, and geo-filtering via EcoVolt API.
 * No mock fallbacks — all data comes from the real DB.
 */

import { Station, Charger } from '@/types/database.types';
import { apiRequest } from './api';
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

export async function getStations(
  filters?: StationFilters,
  userCoords?: { latitude: number; longitude: number } | null
): Promise<StationWithDistance[]> {
  const queryParams = new URLSearchParams();
  if (userCoords?.latitude && userCoords?.longitude) {
    queryParams.append('lat', userCoords.latitude.toString());
    queryParams.append('lng', userCoords.longitude.toString());
  }

  const endpoint = queryParams.toString() ? `/stations?${queryParams.toString()}` : '/stations';
  const rawList = await apiRequest<any[]>(endpoint, { method: 'GET' });

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

  return stations.map((st) => ({
    ...st,
    distance: userCoords?.latitude && userCoords?.longitude
      ? calculateDistance(
          { latitude: userCoords.latitude, longitude: userCoords.longitude },
          { latitude: st.latitude, longitude: st.longitude }
        )
      : calculateDistance(
          { latitude: 23.0370, longitude: 72.5622 },
          { latitude: st.latitude, longitude: st.longitude }
        ),
  }));
}

export async function getStationById(
  id: string,
  userCoords?: { latitude: number; longitude: number } | null
): Promise<(StationWithChargers & { distance?: number }) | null> {
  const queryParams = new URLSearchParams();
  if (userCoords?.latitude && userCoords?.longitude) {
    queryParams.append('lat', userCoords.latitude.toString());
    queryParams.append('lng', userCoords.longitude.toString());
  }
  const endpoint = queryParams.toString() ? `/stations/${id}?${queryParams.toString()}` : `/stations/${id}`;
  const raw = await apiRequest<any>(endpoint, { method: 'GET' });
  if (!raw) return null;

  const station = adaptEcoVoltStation(raw);
  const chargers: Charger[] = adaptEcoVoltChargers(raw);

  const distance = userCoords?.latitude && userCoords?.longitude
    ? calculateDistance(
        { latitude: userCoords.latitude, longitude: userCoords.longitude },
        { latitude: station.latitude, longitude: station.longitude }
      )
    : (raw.distanceKm ?? undefined);

  return {
    ...station,
    distance,
    chargers,
  };
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

  // Use the server-side nearby endpoint when possible
  try {
    const rawList = await apiRequest<any[]>(
      `/stations?lat=${lat}&lng=${lng}&radiusKm=${radius}${limit ? `&limit=${limit}` : ''}${filters?.connectorType ? `&connector=${filters.connectorType}` : ''}`,
      { method: 'GET' }
    );

    const stations: Station[] = (rawList || []).map(adaptEcoVoltStation);
    return stations.map((station) => ({
      ...station,
      distance: calculateDistance(
        { latitude: lat, longitude: lng },
        { latitude: station.latitude, longitude: station.longitude }
      ),
    }));
  } catch {
    // Fallback to client-side filtering if server doesn't support query params
    const allStations = await getStations(filters);
    const withDistance: StationWithDistance[] = allStations.map((station) => ({
      ...station,
      distance: calculateDistance(
        { latitude: lat, longitude: lng },
        { latitude: station.latitude, longitude: station.longitude }
      ),
    }));

    let results = withDistance
      .filter((s) => s.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    if (results.length === 0 && withDistance.length > 0) {
      results = [...withDistance].sort((a, b) => a.distance - b.distance);
    }

    if (limit) {
      results = results.slice(0, limit);
    }

    return results;
  }
}

export async function searchStations(query: string): Promise<Station[]> {
  return getStations({ searchQuery: query });
}

export type { StationWithChargers, StationWithDistance };
