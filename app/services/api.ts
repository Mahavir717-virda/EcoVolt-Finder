/**
 * EcoVolt Express REST API Client with Offline Mock Fallback
 */

import * as SecureStore from 'expo-secure-store';
import { ENV } from '../src/api/config';

const TOKEN_KEY = 'ecovolt_access_token';
const USER_KEY = 'ecovolt_user_data';

// Local mock data imports for zero-downtime offline fallback
const mockStations = require('../src/api/mocks/data/stations.json');
const mockBookings = require('../src/api/mocks/data/bookings.json');
const mockVehicles = require('../src/api/mocks/data/vehicles.json');
const mockMe = require('../src/api/mocks/data/me.json');

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
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch {}
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {},
  fallbackData?: any
): Promise<T> {
  // If USE_MOCKS is active and mock fallback data is provided, return it instantly
  if (ENV.USE_MOCKS && fallbackData !== undefined) {
    return fallbackData;
  }

  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${ENV.API_BASE_URL}${cleanPath}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`API request ${cleanPath} returned status ${response.status}. Using fallback if available.`);
      if (fallbackData !== undefined) return fallbackData;
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    return data?.data ?? data;
  } catch (error) {
    // Graceful fallback to mock fixtures if server is offline
    if (fallbackData !== undefined) {
      return fallbackData;
    }
    throw error;
  }
}

export const MockFallbacks = {
  stations: mockStations,
  bookings: mockBookings,
  vehicles: mockVehicles,
  me: mockMe,
};
