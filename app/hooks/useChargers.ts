/**
 * useChargers Hook
 * React hook for fetching and managing charger data
 */

import {
    getChargerById,
    getChargersByStation,
    getChargerStats,
    isChargerAvailable
} from '@/services/chargers.service';
import { Charger } from '@/types/database.types';
import { useCallback, useEffect, useState } from 'react';
import { useStationChargers } from './useRealtime';

/**
 * Hook to fetch chargers for a station with realtime updates
 */
export function useChargers(stationId: string | null) {
  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(Boolean(stationId));
  const [error, setError] = useState<string | null>(null);

  const fetchChargers = useCallback(async () => {
    if (!stationId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getChargersByStation(stationId);
      setChargers(data);
    } catch (err) {
      setError('Failed to fetch chargers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  // Handle realtime updates
  const handleChargerUpdate = useCallback((updatedCharger: Charger) => {
    setChargers(prev =>
      prev.map(c => (c.id === updatedCharger.id ? updatedCharger : c))
    );
  }, []);

  // Subscribe to realtime updates
  useStationChargers(stationId, handleChargerUpdate);

  useEffect(() => {
    fetchChargers();
  }, [fetchChargers]);

  // Computed values
  const availableChargers = chargers.filter(c => c.status === 'available');
  const inUseChargers = chargers.filter(c => c.status === 'in_use');
  const reservedChargers = chargers.filter(c => c.status === 'reserved');

  return {
    chargers,
    availableChargers,
    inUseChargers,
    reservedChargers,
    loading,
    error,
    refresh: fetchChargers,
  };
}

/**
 * Hook to fetch a single charger
 */
export function useCharger(chargerId: string | null) {
  const [charger, setCharger] = useState<Charger | null>(null);
  const [loading, setLoading] = useState(Boolean(chargerId));
  const [error, setError] = useState<string | null>(null);

  const fetchCharger = useCallback(async () => {
    if (!chargerId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getChargerById(chargerId);
      setCharger(data);
    } catch (err) {
      setError('Failed to fetch charger');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [chargerId]);

  useEffect(() => {
    fetchCharger();
  }, [fetchCharger]);

  return {
    charger,
    loading,
    error,
    refresh: fetchCharger,
  };
}

/**
 * Hook to get charger statistics for a station
 */
export function useChargerStats(stationId: string | null) {
  const [stats, setStats] = useState<{
    total: number;
    available: number;
    inUse: number;
    reserved: number;
    offline: number;
    lowestPrice: number | null;
    highestPrice: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!stationId) return;

    setLoading(true);
    try {
      const data = await getChargerStats(stationId);
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    refresh: fetchStats,
  };
}

/**
 * Hook to check charger availability
 */
export function useChargerAvailability(chargerId: string | null) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkAvailability = useCallback(async () => {
    if (!chargerId) return;

    setChecking(true);
    try {
      const result = await isChargerAvailable(chargerId);
      setAvailable(result);
    } catch (err) {
      console.error(err);
      setAvailable(false);
    } finally {
      setChecking(false);
    }
  }, [chargerId]);

  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  return {
    available,
    checking,
    recheck: checkAvailability,
  };
}
