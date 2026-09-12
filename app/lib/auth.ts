/**
 * EcoVolt Authentication Helpers (Replacing direct Supabase with EcoVolt Express API)
 */

import { Profile } from '@/types/database.types';
import {
  apiRequest,
  setAuthToken,
  clearAuthToken,
  getStoredUser,
  setStoredUser,
  MockFallbacks,
} from '@/services/api';

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResult<T = void> {
  data: T | null;
  error: AuthError | null;
}

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

export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const res = await apiRequest<any>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      {
        token: 'mock_jwt_token_ecovolt',
        user: { ...DEFAULT_PROFILE, email },
      }
    );

    if (res?.token) {
      await setAuthToken(res.token);
    }

    const profile: Profile = {
      ...DEFAULT_PROFILE,
      id: res?.user?.id || DEFAULT_PROFILE.id,
      email: res?.user?.email || email,
      full_name: res?.user?.name || res?.user?.fullName || DEFAULT_PROFILE.full_name,
    };
    await setStoredUser(profile);

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Login failed' } };
  }
}

export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult<Profile>> {
  try {
    const res = await apiRequest<any>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name: fullName }),
      },
      {
        token: 'mock_jwt_token_ecovolt',
        user: { ...DEFAULT_PROFILE, email, full_name: fullName },
      }
    );

    if (res?.token) {
      await setAuthToken(res.token);
    }

    const profile: Profile = {
      ...DEFAULT_PROFILE,
      id: res?.user?.id || `usr_${Date.now()}`,
      email,
      full_name: fullName,
    };
    await setStoredUser(profile);

    return { data: profile, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Signup failed' } };
  }
}

export async function signOut(): Promise<AuthResult> {
  try {
    await clearAuthToken();
    return { data: null, error: null };
  } catch {
    return { data: null, error: null };
  }
}

export async function resetPassword(email: string): Promise<AuthResult> {
  return { data: null, error: null };
}

export async function getCurrentProfile(): Promise<AuthResult<Profile>> {
  try {
    const cached = await getStoredUser();
    if (cached) {
      return { data: cached, error: null };
    }
    return { data: DEFAULT_PROFILE, error: null };
  } catch {
    return { data: DEFAULT_PROFILE, error: null };
  }
}

export async function updateProfile(
  updates: Partial<Pick<Profile, 'full_name'>>
): Promise<AuthResult<Profile>> {
  try {
    const current = (await getCurrentProfile()).data || DEFAULT_PROFILE;
    const updated: Profile = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await setStoredUser(updated);
    return { data: updated, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Update failed' } };
  }
}
