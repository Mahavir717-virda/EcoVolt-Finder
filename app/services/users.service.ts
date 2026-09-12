/**
 * Users Service
 * Manages user profile, vehicle fleet, and eco stats
 */

import { Profile } from '@/types/database.types';
import { apiRequest, MockFallbacks, getStoredUser, setStoredUser } from './api';

export async function getUserProfile(userId: string): Promise<Profile | null> {
  const cached = await getStoredUser();
  if (cached) return cached;

  const defaultProfile: Profile = {
    id: userId || 'usr_driver_101',
    full_name: 'Deep Pathak',
    email: 'deep@ecovolt.io',
    phone: '+91 98765 43210',
    plan_type: 'premium',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const raw = await apiRequest<any>('/me', { method: 'GET' }, MockFallbacks.me);
    if (raw) {
      const p: Profile = {
        id: raw.id || userId,
        full_name: raw.fullName || raw.name || defaultProfile.full_name,
        email: raw.email || defaultProfile.email,
        phone: raw.phone || defaultProfile.phone,
        plan_type: raw.planType || 'premium',
        avatar_url: defaultProfile.avatar_url,
        created_at: raw.createdAt || defaultProfile.created_at,
        updated_at: raw.updatedAt || defaultProfile.updated_at,
      };
      await setStoredUser(p);
      return p;
    }
  } catch {}

  return defaultProfile;
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

export async function getUserVehicles(userId: string): Promise<any[]> {
  try {
    const raw = await apiRequest<any[]>('/vehicles', { method: 'GET' }, MockFallbacks.vehicles);
    return raw || MockFallbacks.vehicles;
  } catch {
    return MockFallbacks.vehicles;
  }
}
