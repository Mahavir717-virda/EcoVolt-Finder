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
}

interface UseStationsReturn {
  stations: Station[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<void>;
}

/**
 * Hook to fetch all stations
 */
export function useStations(options: UseStationsOptions = {}): UseStationsReturn {
  const { autoFetch = true, filters } = options;
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStations(filters);
      setStations(data);
    } catch (err) {
      setError('Failed to fetch stations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
  radiusKm = 10,
  limit = 20,
  filters,
  enabled = true,
}: UseNearbyStationsOptions) {
  const [stations, setStations] = useState<Station[]>([]);
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
export function useStation(stationId: string | null) {
  const [station, setStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStation = useCallback(async () => {
    if (!stationId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getStationById(stationId);
      setStation(data);
    } catch (err) {
      setError('Failed to fetch station');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

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
