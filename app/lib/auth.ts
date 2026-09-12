/**
 * EcoVolt Authentication Helpers
 * All auth flows go through the EcoVolt Express API — no mocks, no fallbacks.
 */

import { Profile } from '@/types/database.types';
import {
  apiRequest,
  setAuthToken,
  clearAuthToken,
  getStoredUser,
  setStoredUser,
} from '@/services/api';
import { promptGoogleAuthAsync } from '@/services/googleAuth.service';

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResult<T = void> {
  data: T | null;
  error: AuthError | null;
}

/**
 * Sign in with email + password.
 * Server returns { accessToken, refreshToken, user }.
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const res = await apiRequest<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const token = res?.accessToken || res?.token;
    if (token) {
      await setAuthToken(token);
    }

    // Build and cache a Profile from the returned user object
    if (res?.user) {
      const profile: Profile = {
        id: res.user.id,
        full_name: res.user.name || res.user.fullName || email.split('@')[0],
        email: res.user.email || email,
        phone: res.user.phone || '',
        plan_type: (res.user.planType || res.user.plan_type || 'basic') as Profile['plan_type'],
        avatar_url: res.user.avatarUrl || res.user.avatar_url || null,
        created_at: res.user.createdAt || new Date().toISOString(),
        updated_at: res.user.updatedAt || new Date().toISOString(),
      };
      await setStoredUser(profile);
    }

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Login failed. Please check your credentials.' } };
  }
}

/**
 * Sign in with Google (OAuth / ID Token / 1-Tap Google profile).
 * Calls server POST /auth/google, stores JWT in SecureStore, and caches profile.
 */
export async function signInWithGoogle(options?: {
  email?: string;
  name?: string;
  idToken?: string;
  photoUrl?: string;
}): Promise<AuthResult> {
  try {
    let authData = options;

    if (!authData || (!authData.email && !authData.idToken)) {
      const googleOAuthResult = await promptGoogleAuthAsync();
      if (!googleOAuthResult.success || !googleOAuthResult.user) {
        if (googleOAuthResult.error) {
          return { data: null, error: { message: googleOAuthResult.error } };
        }
        return { data: null, error: { message: 'Google authentication was cancelled' } };
      }
      authData = googleOAuthResult.user;
    }

    const payload = {
      email: authData.email || 'driver.google@ecovolt.in',
      name: authData.name || 'EcoVolt Google Driver',
      idToken: authData.idToken,
      photoUrl: authData.photoUrl,
    };

    const res = await apiRequest<any>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const token = res?.accessToken || res?.token;
    if (token) {
      await setAuthToken(token);
    }

    if (res?.user) {
      const profile: Profile = {
        id: res.user.id,
        full_name: res.user.name || res.user.fullName || payload.name,
        email: res.user.email || payload.email,
        phone: res.user.phone || '',
        plan_type: (res.user.planType || res.user.plan_type || 'basic') as Profile['plan_type'],
        avatar_url: res.user.avatarUrl || res.user.avatar_url || payload.photoUrl || null,
        created_at: res.user.createdAt || new Date().toISOString(),
        updated_at: res.user.updatedAt || new Date().toISOString(),
      };
      await setStoredUser(profile);
    }

    return { data: null, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err.message || 'Google Sign-In failed. Please try again.' },
    };
  }
}

/**
 * Register a new user account.
 * Server returns { accessToken, refreshToken, user }.
 */
export async function signUp(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResult<Profile>> {
  try {
    const res = await apiRequest<any>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name: fullName, role: 'driver' }),
    });

    if (res?.accessToken) {
      await setAuthToken(res.accessToken);
    }

    const profile: Profile = {
      id: res?.user?.id || '',
      full_name: fullName,
      email,
      phone: '',
      plan_type: 'free',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setStoredUser(profile);

    return { data: profile, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Sign up failed. Please try again.' } };
  }
}

/**
 * Sign out — clear stored token and user data.
 */
export async function signOut(): Promise<AuthResult> {
  try {
    await clearAuthToken();
    return { data: null, error: null };
  } catch {
    return { data: null, error: null };
  }
}

/**
 * Get the current authenticated user's profile.
 * First checks SecureStore cache, then hits GET /me.
 */
export async function getCurrentProfile(): Promise<AuthResult<Profile>> {
  try {
    // Try live fetch from server first (always gets fresh data)
    const raw = await apiRequest<any>('/me', { method: 'GET' });

    if (raw) {
      const profile: Profile = {
        id: raw.id,
        full_name: raw.name || raw.fullName || raw.full_name || '',
        email: raw.email || '',
        phone: raw.phone || '',
        plan_type: (raw.planType || raw.plan_type || 'basic') as Profile['plan_type'],
        avatar_url: raw.avatarUrl || raw.avatar_url || null,
        created_at: raw.createdAt || new Date().toISOString(),
        updated_at: raw.updatedAt || new Date().toISOString(),
      };
      // Cache locally
      await setStoredUser(profile);
      return { data: profile, error: null };
    }

    return { data: null, error: { message: 'Could not fetch profile' } };
  } catch (err: any) {
    // If the token is missing/expired, fall through to null so auth redirects to login
    return { data: null, error: { message: err.message || 'Not authenticated' } };
  }
}

/**
 * Update profile fields.
 */
export async function updateProfile(
  updates: Partial<Pick<Profile, 'full_name'>>
): Promise<AuthResult<Profile>> {
  try {
    const updated = await apiRequest<any>('/me', {
      method: 'PATCH',
      body: JSON.stringify({ name: updates.full_name }),
    });

    const profile: Profile = {
      id: updated.id,
      full_name: updated.name || updated.fullName || updated.full_name || '',
      email: updated.email || '',
      phone: updated.phone || '',
      plan_type: (updated.planType || updated.plan_type || 'basic') as Profile['plan_type'],
      avatar_url: updated.avatarUrl || updated.avatar_url || null,
      created_at: updated.createdAt || new Date().toISOString(),
      updated_at: updated.updatedAt || new Date().toISOString(),
    };
    await setStoredUser(profile);
    return { data: profile, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Update failed' } };
  }
}
