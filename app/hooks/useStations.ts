/**
 * useStations Hook
 * React hook for fetching and managing station data
 */

import {
    getNearbyStations,
    getStationById,
    getStations,
    searchStations,
    StationFilters,
} from '@/services/stations.service';
import { Station } from '@/types/database.types';
import { useCallback, useEffect, useState } from 'react';

interface UseStationsOptions {
  autoFetch?: boolean;
  filters?: StationFilters;
  userCoords?: { latitude: number; longitude: number } | null;
}

interface UseStationsReturn {
  stations: (Station & { distance?: number })[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<void>;
}

/**
 * Hook to fetch all stations
 */
export function useStations(options: UseStationsOptions = {}): UseStationsReturn {
  const { autoFetch = true, filters, userCoords } = options;
  const [stations, setStations] = useState<(Station & { distance?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStations(filters, userCoords);
      setStations(data);
    } catch (err) {
      setError('Failed to fetch stations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, userCoords]);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      await fetchStations();
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const data = await searchStations(query);
      setStations(data);
    } catch (err) {
      setError('Search failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [fetchStations]);

  useEffect(() => {
    if (autoFetch) {
      fetchStations();
    }
  }, [autoFetch, fetchStations]);

  return {
    stations,
    loading,
    error,
    refresh: fetchStations,
    search,
  };
}

interface UseNearbyStationsOptions {
  latitude: number | null;
  longitude: number | null;
  radiusKm?: number;
  limit?: number;
  filters?: StationFilters;
  enabled?: boolean;
}

/**
 * Hook to fetch nearby stations based on location
 */
export function useNearbyStations({
  latitude,
  longitude,
  radiusKm = 25,
  limit = 20,
  filters,
  enabled = true,
}: UseNearbyStationsOptions) {
  const [stations, setStations] = useState<(Station & { distance?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNearby = useCallback(async () => {
    if (!latitude || !longitude || !enabled) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getNearbyStations({
        latitude,
        longitude,
        radiusKm,
        limit,
        filters,
      });
      setStations(data);
    } catch (err) {
      setError('Failed to fetch nearby stations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [latitude, longitude, radiusKm, limit, filters, enabled]);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  return {
    stations,
    loading,
    error,
    refresh: fetchNearby,
  };
}

/**
 * Hook to fetch a single station
 */
export function useStation(
  stationId: string | null,
  userCoords?: { latitude: number; longitude: number } | null
) {
  const [station, setStation] = useState<(Station & { chargers?: any[]; distance?: number }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStation = useCallback(async () => {
    if (!stationId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getStationById(stationId, userCoords);
      setStation(data);
    } catch (err) {
      setError('Failed to fetch station');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [stationId, userCoords]);

  useEffect(() => {
    fetchStation();
  }, [fetchStation]);

  return {
    station,
    loading,
    error,
    refresh: fetchStation,
  };
}
