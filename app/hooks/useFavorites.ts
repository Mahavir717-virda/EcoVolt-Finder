/**
 * useFavorites Hook
 * React hook for managing user's favorite stations
 */

import {
    addFavorite,
    getFavoriteStations,
    isFavorite,
    removeFavorite,
    toggleFavorite,
} from '@/services/users.service';
import { Station } from '@/types/database.types';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';

interface FavoriteStation {
  id: string;
  created_at: string;
  station: Station;
}

/**
 * Hook to manage user's favorite stations
 */
export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getFavoriteStations(user.id);
      setFavorites(data);
    } catch (err) {
      setError('Failed to fetch favorites');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const add = useCallback(async (stationId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    const success = await addFavorite(user.id, stationId);
    if (success) {
      await fetchFavorites();
    }
    return success;
  }, [user?.id, fetchFavorites]);

  const remove = useCallback(async (stationId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    const success = await removeFavorite(user.id, stationId);
    if (success) {
      setFavorites(prev => prev.filter(f => f.station?.id !== stationId));
    }
    return success;
  }, [user?.id]);

  const toggle = useCallback(async (stationId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    const isFav = await toggleFavorite(user.id, stationId);
    await fetchFavorites();
    return isFav;
  }, [user?.id, fetchFavorites]);

  const checkIsFavorite = useCallback(async (stationId: string): Promise<boolean> => {
    if (!user?.id) return false;
    return isFavorite(user.id, stationId);
  }, [user?.id]);

  // Quick check if station is in current favorites list
  const isFavorited = useCallback((stationId: string): boolean => {
    return favorites.some(f => f.station?.id === stationId);
  }, [favorites]);

  return {
    favorites,
    stations: favorites.map(f => f.station).filter(Boolean) as Station[],
    loading,
    error,
    refresh: fetchFavorites,
    add,
    remove,
    toggle,
    isFavorited,
    checkIsFavorite,
  };
}

/**
 * Hook to check/toggle favorite status for a single station
 */
export function useFavoriteStatus(stationId: string | null) {
  const { user } = useAuth();
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!user?.id || !stationId) return;

    setLoading(true);
    try {
      const result = await isFavorite(user.id, stationId);
      setIsFav(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, stationId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const toggle = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !stationId) return false;

    setLoading(true);
    try {
      const newStatus = await toggleFavorite(user.id, stationId);
      setIsFav(newStatus);
      return newStatus;
    } catch (err) {
      console.error(err);
      return isFav;
    } finally {
      setLoading(false);
    }
  }, [user?.id, stationId, isFav]);

  return {
    isFavorite: isFav,
    loading,
    toggle,
    refresh: checkStatus,
  };
}
