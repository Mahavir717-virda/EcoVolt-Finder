/**
 * EcoVolt Notifications Service
 * Real-time notification inbox, push registration, and smart savings evaluation
 */

import { apiRequest } from './api';

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: {
    stationId?: string;
    stationName?: string;
    savingsInr?: number;
    distanceKm?: number;
    availableChargers?: number;
    effectiveRate?: number;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string;
}

export interface EvaluateSavingsResponse {
  evaluated: boolean;
  notified: boolean;
  reason?: string;
  message?: string;
  savingsInr?: number;
  stationName?: string;
  stationId?: string;
  distanceKm?: number;
  availableChargers?: number;
}

export async function getNotificationHistory(): Promise<AppNotification[]> {
  try {
    const raw = await apiRequest<AppNotification[]>('/notifications', { method: 'GET' });
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    await apiRequest(`/notifications/${notificationId}/read`, { method: 'PATCH' });
    return true;
  } catch {
    return false;
  }
}

export async function evaluateNearbySavings(
  coords?: { latitude: number; longitude: number },
  force: boolean = false
): Promise<EvaluateSavingsResponse | null> {
  try {
    const res = await apiRequest<EvaluateSavingsResponse>('/notifications/evaluate-savings', {
      method: 'POST',
      body: JSON.stringify({
        lat: coords?.latitude,
        lng: coords?.longitude,
        force,
      }),
    });
    return res;
  } catch (e) {
    return null;
  }
}

export async function registerPushToken(token: string): Promise<boolean> {
  try {
    await apiRequest('/notifications/token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    return true;
  } catch {
    return false;
  }
}
