/**
 * useRealtime Hook
 * React hook for managing realtime subscriptions
 */

import {
    subscribeToAllChargers,
    subscribeToCharger,
    subscribeToStationChargers,
    subscribeToUserReservations,
    unsubscribe,
} from '@/lib/realtime';
import { Charger, Reservation } from '@/types/database.types';
import { useEffect, useRef } from 'react';

type RealtimeChannel = any;

/**
 * Hook to subscribe to charger updates for a station
 */
export function useStationChargers(
  stationId: string | null,
  onUpdate: (charger: Charger) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onUpdate);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!stationId) return;

    // Subscribe to charger updates
    channelRef.current = subscribeToStationChargers(
      stationId,
      (charger) => callbackRef.current(charger)
    );

    // Cleanup on unmount or stationId change
    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [stationId]);

  return channelRef.current;
}

/**
 * Hook to subscribe to a single charger's updates
 */
export function useChargerRealtime(
  chargerId: string | null,
  onUpdate: (charger: Charger) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onUpdate);

  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!chargerId) return;

    channelRef.current = subscribeToCharger(
      chargerId,
      (charger) => callbackRef.current(charger)
    );

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [chargerId]);

  return channelRef.current;
}

/**
 * Hook to subscribe to user's reservation updates
 */
export function useUserReservationsRealtime(
  userId: string | null,
  callbacks: {
    onInsert?: (reservation: Reservation) => void;
    onUpdate?: (reservation: Reservation) => void;
    onDelete?: (reservation: Reservation) => void;
  }
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (!userId) return;

    channelRef.current = subscribeToUserReservations(
      userId,
      (res) => callbacksRef.current.onInsert?.(res),
      (res) => callbacksRef.current.onUpdate?.(res),
      (res) => callbacksRef.current.onDelete?.(res)
    );

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);

  return channelRef.current;
}

/**
 * Hook to subscribe to all charger updates (for map)
 */
export function useAllChargersRealtime(
  enabled: boolean,
  onUpdate: (charger: Charger) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onUpdate);

  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) return;

    channelRef.current = subscribeToAllChargers(
      (charger) => callbackRef.current(charger)
    );

    return () => {
      if (channelRef.current) {
        unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled]);

  return channelRef.current;
}
