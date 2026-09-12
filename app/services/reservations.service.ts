/**
 * Reservations Service
 * Handles booking slots, fetching user reservations, and cancellations
 */

import { apiRequest, MockFallbacks } from './api';
import {
  adaptEcoVoltReservation,
  ReservationWithDetails,
} from './adapters';

export interface CreateReservationParams {
  userId: string;
  stationId: string;
  chargerId: string;
  startTime: string;
  endTime: string;
  vehicleId?: string;
  totalPrice?: number;
}

// In-memory cache of session created reservations to allow immediate updates
let localReservations: ReservationWithDetails[] = [];

export async function getUserReservations(userId: string): Promise<ReservationWithDetails[]> {
  try {
    const rawList = await apiRequest<any[]>(
      '/bookings',
      { method: 'GET' },
      MockFallbacks.bookings
    );

    const mapped = (rawList || []).map((b) => adaptEcoVoltReservation(b));
    // Merge with any newly booked items created locally in this session
    const combined = [...localReservations, ...mapped.filter(m => !localReservations.some(lr => lr.id === m.id))];
    return combined;
  } catch (err) {
    console.error('Failed to fetch reservations:', err);
    return (MockFallbacks.bookings || []).map((b: any) => adaptEcoVoltReservation(b));
  }
}

export async function getReservationById(reservationId: string): Promise<ReservationWithDetails | null> {
  // Check local creations first
  const foundLocal = localReservations.find((r) => r.id === reservationId);
  if (foundLocal) return foundLocal;

  try {
    const fallbackRaw = (MockFallbacks.bookings || []).find(
      (b: any) => String(b.id) === String(reservationId)
    ) || MockFallbacks.bookings[0];

    const raw = await apiRequest<any>(
      `/bookings/${reservationId}`,
      { method: 'GET' },
      fallbackRaw
    );

    if (!raw) return null;
    return adaptEcoVoltReservation(raw);
  } catch (err) {
    console.error(`Failed to get reservation ${reservationId}:`, err);
    const fallback = MockFallbacks.bookings[0];
    return fallback ? adaptEcoVoltReservation(fallback) : null;
  }
}

export async function createReservation(params: CreateReservationParams): Promise<ReservationWithDetails> {
  const newBookingPayload = {
    id: `book_${Date.now()}`,
    userId: params.userId,
    stationId: params.stationId,
    chargerId: params.chargerId,
    windowStart: params.startTime,
    windowEnd: params.endTime,
    vehicleId: params.vehicleId || 'veh_nexon_1',
    status: 'active',
    lockedPrice: 6.2,
    cost: params.totalPrice || 124.0,
    createdAt: new Date().toISOString(),
  };

  try {
    const res = await apiRequest<any>(
      '/bookings',
      {
        method: 'POST',
        body: JSON.stringify(newBookingPayload),
      },
      newBookingPayload
    );

    const adapted = adaptEcoVoltReservation(res);
    localReservations = [adapted, ...localReservations];
    return adapted;
  } catch (err) {
    console.warn('API booking creation failed, using local session state:', err);
    const adapted = adaptEcoVoltReservation(newBookingPayload);
    localReservations = [adapted, ...localReservations];
    return adapted;
  }
}

export async function cancelReservation(reservationId: string, userId?: string): Promise<boolean> {
  try {
    await apiRequest<any>(
      `/bookings/${reservationId}/cancel`,
      { method: 'PATCH' },
      { success: true }
    );

    localReservations = localReservations.map((r) =>
      r.id === reservationId ? { ...r, status: 'cancelled' as const } : r
    );
    return true;
  } catch (err) {
    console.warn(`Cancel reservation ${reservationId} failed on server, updated locally:`, err);
    localReservations = localReservations.map((r) =>
      r.id === reservationId ? { ...r, status: 'cancelled' as const } : r
    );
    return true;
  }
}

export async function completeReservation(reservationId: string): Promise<boolean> {
  localReservations = localReservations.map((r) =>
    r.id === reservationId ? { ...r, status: 'completed' as const } : r
  );
  return true;
}

export async function getActiveReservationCount(userId: string): Promise<number> {
  const all = await getUserReservations(userId);
  return all.filter((r) => r.status === 'active').length;
}

export type { ReservationWithDetails };
