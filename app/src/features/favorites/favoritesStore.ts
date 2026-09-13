import { create } from 'zustand';
import { Station } from '@/types/database.types';
import {
  getFavoriteStations,
  addFavorite as apiAddFavorite,
  removeFavorite as apiRemoveFavorite,
  FavoriteItem,
} from '@/services/users.service';

export interface FavoriteStation {
  id: string;
  stationId: string;
  created_at: string;
  station: Station;
}

export interface FavoritesState {
  favorites: FavoriteStation[];
  stationIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  lastFetchedAt: number;

  fetchFavorites: (force?: boolean) => Promise<void>;
  isFavorited: (stationId: string) => boolean;
  addFavorite: (stationId: string, stationData?: Station) => Promise<boolean>;
  removeFavorite: (stationId: string) => Promise<boolean>;
  toggleFavorite: (stationId: string, stationData?: Station) => Promise<boolean>;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  stationIds: new Set<string>(),
  isLoading: false,
  error: null,
  hasLoaded: false,
  lastFetchedAt: 0,

  fetchFavorites: async (force = false) => {
    const { isLoading, lastFetchedAt } = get();
    // Guard against concurrent fetches
    if (isLoading) return;

    // Guard against rapid duplicate fetches within 8 seconds unless explicitly forced
    const now = Date.now();
    if (!force && now - lastFetchedAt < 8000) return;

    set({ isLoading: true, error: null });
    try {
      const data = await getFavoriteStations();
      const stationIds = new Set<string>(
        data.map((f) => f.stationId || f.station?.id).filter(Boolean)
      );

      set({
        favorites: data,
        stationIds,
        isLoading: false,
        hasLoaded: true,
        lastFetchedAt: Date.now(),
      });
    } catch (err: any) {
      console.error('[FavoritesStore] fetchFavorites failed:', err);
      set({
        error: err?.message || 'Failed to fetch favorites',
        isLoading: false,
      });
    }
  },

  isFavorited: (stationId: string) => {
    if (!stationId) return false;
    return get().stationIds.has(stationId);
  },

  addFavorite: async (stationId: string, stationData?: Station): Promise<boolean> => {
    if (!stationId) return false;
    const { favorites, stationIds } = get();

    if (stationIds.has(stationId)) {
      return true; // Already favorited
    }

    // Fallback station if stationData wasn't supplied
    const fallbackStation: Station = stationData || {
      id: stationId,
      name: 'Charging Station',
      latitude: 23.0370,
      longitude: 72.5622,
      address: 'Ahmedabad, Gujarat',
      city: 'Ahmedabad',
      total_chargers: 4,
      available_chargers: 2,
      rating: 4.8,
      amenities: ['wifi', 'restrooms', 'cafe', 'parking', '24h'],
      image_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&auto=format&fit=crop&q=80',
      is_active: true,
      greenness_score: 85,
      co2_saved_kg: 15.2,
      price_from: 12.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newFavItem: FavoriteStation = {
      id: `fav_${stationId}_${Date.now()}`,
      stationId,
      created_at: new Date().toISOString(),
      station: fallbackStation,
    };

    // Optimistic update
    const updatedFavorites = [newFavItem, ...favorites];
    const updatedIds = new Set(stationIds);
    updatedIds.add(stationId);

    set({ favorites: updatedFavorites, stationIds: updatedIds });

    try {
      const ok = await apiAddFavorite('', stationId);
      if (!ok) throw new Error('Failed to save favorite');

      // Throttled background sync to update server ID
      get().fetchFavorites(true);
      return true;
    } catch (err: any) {
      console.error('[FavoritesStore] addFavorite failed, rolling back:', err);
      // Rollback
      set({ favorites, stationIds });
      return false;
    }
  },

  removeFavorite: async (stationId: string): Promise<boolean> => {
    if (!stationId) return false;
    const { favorites, stationIds } = get();

    // Optimistic removal
    const updatedFavorites = favorites.filter(
      (f) => f.stationId !== stationId && f.station?.id !== stationId
    );
    const updatedIds = new Set(stationIds);
    updatedIds.delete(stationId);

    set({ favorites: updatedFavorites, stationIds: updatedIds });

    try {
      const ok = await apiRemoveFavorite('', stationId);
      if (!ok) throw new Error('Failed to remove favorite');
      return true;
    } catch (err: any) {
      console.error('[FavoritesStore] removeFavorite failed, rolling back:', err);
      // Rollback
      set({ favorites, stationIds });
      return false;
    }
  },

  toggleFavorite: async (stationId: string, stationData?: Station): Promise<boolean> => {
    if (!stationId) return false;
    const isCurrentlyFav = get().stationIds.has(stationId);

    if (isCurrentlyFav) {
      await get().removeFavorite(stationId);
      return false;
    } else {
      await get().addFavorite(stationId, stationData);
      return true;
    }
  },

  clearFavorites: () => {
    set({
      favorites: [],
      stationIds: new Set<string>(),
      isLoading: false,
      error: null,
      hasLoaded: false,
      lastFetchedAt: 0,
    });
  },
}));
