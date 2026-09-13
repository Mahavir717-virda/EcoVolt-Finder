/**
 * useFavorites Hook
 * Shared reactive state for user favorite stations backed by Zustand favoritesStore.
 */

import { Station } from '@/types/database.types';
import { useCallback, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useFavoritesStore, FavoriteStation } from '../src/features/favorites/favoritesStore';

export type { FavoriteStation };

/**
 * Hook to manage user's favorite stations across the entire app
 */
export function useFavorites() {
  const { user } = useAuth();
  const favorites = useFavoritesStore((s) => s.favorites);
  const loading = useFavoritesStore((s) => s.isLoading);
  const error = useFavoritesStore((s) => s.error);
  const hasLoaded = useFavoritesStore((s) => s.hasLoaded);
  const fetchFavorites = useFavoritesStore((s) => s.fetchFavorites);
  const addFavorite = useFavoritesStore((s) => s.addFavorite);
  const removeFavorite = useFavoritesStore((s) => s.removeFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const isFavorited = useFavoritesStore((s) => s.isFavorited);

  // Initial load only if user is logged in and not loaded yet
  useEffect(() => {
    if (user?.id && !hasLoaded) {
      fetchFavorites();
    }
  }, [user?.id, hasLoaded, fetchFavorites]);

  const stations = useMemo(
    () => favorites.map((f) => f.station).filter(Boolean) as Station[],
    [favorites]
  );

  const refresh = useCallback(
    () => fetchFavorites(true),
    [fetchFavorites]
  );

  const add = useCallback(
    async (stationId: string, stationData?: Station): Promise<boolean> => {
      return addFavorite(stationId, stationData);
    },
    [addFavorite]
  );

  const remove = useCallback(
    async (stationId: string): Promise<boolean> => {
      return removeFavorite(stationId);
    },
    [removeFavorite]
  );

  const toggle = useCallback(
    async (stationId: string, stationData?: Station): Promise<boolean> => {
      return toggleFavorite(stationId, stationData);
    },
    [toggleFavorite]
  );

  const checkIsFavorite = useCallback(
    async (stationId: string): Promise<boolean> => {
      return isFavorited(stationId);
    },
    [isFavorited]
  );

  return {
    favorites,
    stations,
    loading,
    error,
    refresh,
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
  const isFav = useFavoritesStore((s) => (stationId ? s.isFavorited(stationId) : false));
  const toggleFav = useFavoritesStore((s) => s.toggleFavorite);
  const fetchFavorites = useFavoritesStore((s) => s.fetchFavorites);
  const loading = useFavoritesStore((s) => s.isLoading);

  const toggle = useCallback(
    async (stationData?: Station): Promise<boolean> => {
      if (!stationId) return false;
      return toggleFav(stationId, stationData);
    },
    [stationId, toggleFav]
  );

  const refresh = useCallback(
    () => fetchFavorites(true),
    [fetchFavorites]
  );

  return {
    isFavorite: isFav,
    loading,
    toggle,
    refresh,
  };
}
