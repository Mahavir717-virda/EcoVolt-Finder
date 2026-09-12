/**
 * Users Service
 * Manages user profile, favorites, vehicles, and plan operations
 */

import { Profile, PlanType, Station } from '@/types/database.types';
import { apiRequest, MockFallbacks, getStoredUser, setStoredUser } from './api';
import { getStations } from './stations.service';

const DEFAULT_PROFILE: Profile = {
  id: 'usr_driver_101',
  full_name: 'Deep Pathak',
  email: 'deep@ecovolt.io',
  phone: '+91 98765 43210',
  plan_type: 'premium',
  avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export interface UpdateProfileParams {
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  return getUserProfile(userId);
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const cached = await getStoredUser();
  if (cached) return cached;

  try {
    const raw = await apiRequest<any>('/me', { method: 'GET' }, MockFallbacks.me);
    if (raw) {
      const p: Profile = {
        id: raw.id || userId,
        full_name: raw.fullName || raw.name || DEFAULT_PROFILE.full_name,
        email: raw.email || DEFAULT_PROFILE.email,
        phone: raw.phone || DEFAULT_PROFILE.phone,
        plan_type: raw.planType || 'premium',
        avatar_url: DEFAULT_PROFILE.avatar_url,
        created_at: raw.createdAt || DEFAULT_PROFILE.created_at,
        updated_at: raw.updatedAt || DEFAULT_PROFILE.updated_at,
      };
      await setStoredUser(p);
      return p;
    }
  } catch {}

  return DEFAULT_PROFILE;
}

export async function updateProfile(
  userId: string,
  updates: UpdateProfileParams
): Promise<Profile | null> {
  const current = await getUserProfile(userId);
  const updated: Profile = {
    ...current!,
    full_name: updates.fullName !== undefined ? updates.fullName : current!.full_name,
    avatar_url: updates.avatarUrl !== undefined ? updates.avatarUrl : current!.avatar_url,
    phone: updates.phone !== undefined ? updates.phone : current!.phone,
    updated_at: new Date().toISOString(),
  };
  await setStoredUser(updated);
  return updated;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  const current = await getUserProfile(userId);
  const updated: Profile = {
    ...current!,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  await setStoredUser(updated);
  return updated;
}

export async function updatePlanType(
  userId: string,
  planType: PlanType
): Promise<Profile | null> {
  const current = await getUserProfile(userId);
  const updated: Profile = {
    ...current!,
    plan_type: planType,
    updated_at: new Date().toISOString(),
  };
  await setStoredUser(updated);
  return updated;
}

// In-memory favorite station IDs for driver
let favoriteStationIds = new Set<string>(['station-001', 'station-002']);

export async function getFavoriteStations(userId: string): Promise<any[]> {
  const allStations = await getStations();
  return allStations
    .filter((s) => favoriteStationIds.has(s.id))
    .map((s) => ({
      id: `fav_${s.id}`,
      created_at: new Date().toISOString(),
      station: s,
    }));
}

export async function isFavorite(userId: string, stationId: string): Promise<boolean> {
  return favoriteStationIds.has(stationId);
}

export async function addFavorite(userId: string, stationId: string): Promise<boolean> {
  favoriteStationIds.add(stationId);
  return true;
}

export async function removeFavorite(userId: string, stationId: string): Promise<boolean> {
  favoriteStationIds.delete(stationId);
  return true;
}

export async function toggleFavorite(userId: string, stationId: string): Promise<boolean> {
  if (favoriteStationIds.has(stationId)) {
    favoriteStationIds.delete(stationId);
    return false;
  } else {
    favoriteStationIds.add(stationId);
    return true;
  }
}

export async function getUserVehicles(userId: string): Promise<any[]> {
  try {
    const raw = await apiRequest<any[]>('/vehicles', { method: 'GET' }, MockFallbacks.vehicles);
    return raw || MockFallbacks.vehicles;
  } catch {
    return MockFallbacks.vehicles;
  }
}
