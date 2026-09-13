/**
 * Users Service
 * Manages user profile, favorites, and vehicles via EcoVolt Express API.
 * All operations hit real DB endpoints — no in-memory state.
 */

import { Profile, PlanType, Station } from '@/types/database.types';
import { apiRequest, setStoredUser } from './api';
import { adaptEcoVoltStation } from './adapters';

export interface UpdateProfileParams {
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
}

/**
 * Map raw server user object → Profile shape
 */
function mapRawToProfile(raw: any): Profile {
  return {
    id: raw.id,
    full_name: raw.name || raw.fullName || raw.full_name || '',
    email: raw.email || '',
    phone: raw.phone || '',
    plan_type: (raw.planType || raw.plan_type || 'basic') as Profile['plan_type'],
    avatar_url: raw.avatarUrl || raw.avatar_url || null,
    created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
    updated_at: raw.updatedAt || raw.updated_at || new Date().toISOString(),
  };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  return getUserProfile(userId);
}

export async function getUserProfile(_userId: string): Promise<Profile | null> {
  const raw = await apiRequest<any>('/me', { method: 'GET' });
  if (!raw) return null;
  const profile = mapRawToProfile(raw);
  await setStoredUser(profile);
  return profile;
}

export async function updateProfile(
  _userId: string,
  updates: UpdateProfileParams
): Promise<Profile | null> {
  const raw = await apiRequest<any>('/me', {
    method: 'PATCH',
    body: JSON.stringify({
      ...(updates.fullName !== undefined ? { name: updates.fullName } : {}),
      ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
      ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
    }),
  });
  if (!raw) return null;
  const profile = mapRawToProfile(raw);
  await setStoredUser(profile);
  return profile;
}

export async function updateUserProfile(
  _userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  const raw = await apiRequest<any>('/me', {
    method: 'PATCH',
    body: JSON.stringify({
      ...(updates.full_name !== undefined ? { name: updates.full_name } : {}),
      ...(updates.avatar_url !== undefined ? { avatarUrl: updates.avatar_url } : {}),
      ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
    }),
  });
  if (!raw) return null;
  const profile = mapRawToProfile(raw);
  await setStoredUser(profile);
  return profile;
}


// ─── Favorites ────────────────────────────────────────────────────────────────
 
export interface FavoriteItem {
  id: string;
  stationId: string;
  created_at: string;
  station: Station;
}

/**
 * Get all favorite stations for the current user from DB.
 */
export async function getFavoriteStations(_userId?: string): Promise<FavoriteItem[]> {
  try {
    const raw = await apiRequest<any[]>('/me/favorites', { method: 'GET' });
    if (!Array.isArray(raw)) return [];
    return raw
      .map((fav: any) => {
        if (!fav) return null;
        const stationObj = fav.station ? adaptEcoVoltStation(fav.station) : null;
        if (!stationObj) return null;
        return {
          id: String(fav.id || `fav_${fav.stationId || stationObj.id}`),
          stationId: String(fav.stationId || stationObj.id),
          created_at: fav.createdAt || fav.created_at || new Date().toISOString(),
          station: stationObj,
        };
      })
      .filter((fav): fav is FavoriteItem => fav !== null);
  } catch (err) {
    console.error('getFavoriteStations error:', err);
    return [];
  }
}

/**
 * Check if a station is in the user's favorites (client-side check from list).
 */
export async function isFavorite(_userId: string, stationId: string): Promise<boolean> {
  const favorites = await getFavoriteStations(_userId);
  return favorites.some((f: any) => f.stationId === stationId || f.station?.id === stationId);
}

/**
 * Add a station to favorites (POST /me/favorites/:stationId).
 */
export async function addFavorite(_userId: string, stationId: string): Promise<boolean> {
  try {
    await apiRequest<any>(`/me/favorites/${stationId}`, { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a station from favorites (DELETE /me/favorites/:stationId).
 */
export async function removeFavorite(_userId: string, stationId: string): Promise<boolean> {
  try {
    await apiRequest<any>(`/me/favorites/${stationId}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Toggle a station's favorite status. Returns new status (true = now favorited).
 */
export async function toggleFavorite(_userId: string, stationId: string): Promise<boolean> {
  const currentlyFav = await isFavorite(_userId, stationId);
  if (currentlyFav) {
    await removeFavorite(_userId, stationId);
    return false;
  } else {
    await addFavorite(_userId, stationId);
    return true;
  }
}

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export async function getUserVehicles(userId?: string): Promise<any[]> {
  const query = userId ? `?userId=${userId}` : '';
  const raw = await apiRequest<any[]>(`/vehicles${query}`, { method: 'GET' });
  const list = Array.isArray(raw) ? raw : (raw as any)?.data || (raw as any)?.vehicles || [];
  return list;
}
