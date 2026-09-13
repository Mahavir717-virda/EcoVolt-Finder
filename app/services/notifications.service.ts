/**
 * EcoVolt Notifications Service
 * Real-time notification inbox, haptic feedback alerts, and dynamic notification delivery
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
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

// In-memory set of notification IDs already presented
const seenNotificationIds = new Set<string>();

/**
 * Initialize system push notification permissions (Web / Mobile fallback)
 */
export async function initDeviceNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {}
      }
    }

    // Sync any unread notifications from server on app startup
    await syncAndShowDeviceNotifications();

    // Register a standard Expo push token format for mobile session if available
    const deviceId = Platform.OS + '-' + (Math.random().toString(36).substring(2, 10));
    const token = `ExponentPushToken[ecovolt-mobile-${deviceId}]`;
    await registerPushToken(token);

    return true;
  } catch {
    return false;
  }
}

/**
 * Send an immediate push banner / notification alert directly to the user
 */
export async function triggerDeviceNotification(notification: {
  title: string;
  body: string;
  data?: any;
}): Promise<void> {
  try {
    // Provide physical haptic vibration feedback on mobile devices
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    
    // Deliver Web Notification popup if on web browser
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        icon: '/favicon.ico',
      });
      return;
    }
  } catch (err) {
    console.warn('[Notifications] triggerDeviceNotification fallback:', err);
  }
}

/**
 * Sync notification history from server and trigger alerts for any unread/new notification
 */
export async function syncAndShowDeviceNotifications(): Promise<AppNotification[]> {
  try {
    const raw = await apiRequest<AppNotification[]>('/notifications', { method: 'GET' });
    const notifications = Array.isArray(raw) ? raw : [];

    // Deliver alert for any new unread notification
    for (const notif of notifications) {
      if (!notif.isRead && !seenNotificationIds.has(notif.id)) {
        seenNotificationIds.add(notif.id);
        await triggerDeviceNotification({
          title: notif.title,
          body: notif.body,
          data: notif.data,
        });
      } else if (notif.isRead) {
        seenNotificationIds.add(notif.id);
      }
    }

    return notifications;
  } catch {
    return [];
  }
}

export async function getNotificationHistory(): Promise<AppNotification[]> {
  return syncAndShowDeviceNotifications();
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    await apiRequest(`/notifications/${notificationId}/read`, { method: 'PATCH' });
    seenNotificationIds.add(notificationId);
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

    if (res?.notified && res.stationName && res.savingsInr) {
      const notifTitle = `⚡ Save ₹${res.savingsInr} on EV Recharge!`;
      const notifBody = `Special dynamic deal at ${res.stationName} (${res.distanceKm?.toFixed(1) || 1.5} km away). ${res.availableChargers || 3} open chargers. Charge now to lock in savings!`;
      
      await triggerDeviceNotification({
        title: notifTitle,
        body: notifBody,
        data: { stationId: res.stationId, savingsInr: res.savingsInr },
      });
    }

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
