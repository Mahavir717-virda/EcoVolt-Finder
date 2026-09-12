/**
 * EcoVolt Express REST API Client
 */

import * as SecureStore from 'expo-secure-store';
import { ENV } from '../src/api/config';

const TOKEN_KEY = 'ecovolt_access_token';
const USER_KEY = 'ecovolt_user_data';

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {}
}

export async function clearAuthToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  } catch {}
}

export async function getStoredUser(): Promise<any | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setStoredUser(user: any): Promise<void> {
  try {
    if (!user) return;
    const cleanUser = {
      id: user.id,
      name: user.name || user.full_name || user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role || user.plan_type,
    };
    const str = JSON.stringify(cleanUser);
    if (str.length < 2000) {
      await SecureStore.setItemAsync(USER_KEY, str);
    }
  } catch {}
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${ENV.API_BASE_URL}${cleanPath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        try {
          const { useAuthStore } = require('../src/features/auth/authStore');
          useAuthStore.getState().logout();
        } catch {}
      }
      // Try to parse a server error message
      let errMsg = `API error ${response.status}`;
      try {
        const errBody = await response.json();
        if (typeof errBody?.error === 'string') {
          errMsg = errBody.error;
        } else if (typeof errBody?.error?.message === 'string') {
          errMsg = errBody.error.message;
        } else if (typeof errBody?.message === 'string') {
          errMsg = errBody.message;
        }
      } catch {}
      throw new Error(errMsg);
    }

    const text = await response.text();
    if (!text || text.trim().length === 0) {
      return {} as T;
    }
    const data = JSON.parse(text);
    return data?.data ?? data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw error;
  }
}
