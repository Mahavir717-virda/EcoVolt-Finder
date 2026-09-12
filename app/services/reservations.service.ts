/**
 * Reservations Service
 * Handles booking slots, fetching user reservations, and cancellations.
 * All data comes from and is persisted to the EcoVolt Express API / PostgreSQL DB.
 */

import { apiRequest } from './api';
import {
  adaptEcoVoltReservation,
  ReservationWithDetails,
} from './adapters';

export interface CreateReservationParams {
  userId: string;
  stationId: string;
  connectorType: string;   // e.g. 'ccs2', 'type2_ac'
  vehicleId: string;       // must be a real vehicle ID from the user's vehicle list
  startTime: string;       // ISO-8601
  endTime: string;         // ISO-8601
  // Legacy compat alias
  chargerId?: string;
  totalPrice?: number;
}

export async function getUserReservations(_userId: string): Promise<ReservationWithDetails[]> {
  const rawList = await apiRequest<any[]>('/bookings', { method: 'GET' });
  return (rawList || []).map((b) => adaptEcoVoltReservation(b));
}

export async function getReservationById(reservationId: string): Promise<ReservationWithDetails | null> {
  const raw = await apiRequest<any>(`/bookings/${reservationId}`, { method: 'GET' });
  if (!raw) return null;
  return adaptEcoVoltReservation(raw);
}

export async function createReservation(params: CreateReservationParams): Promise<ReservationWithDetails> {
  const payload = {
    stationId: params.stationId,
    // Server accepts connectorType — if only chargerId was passed (legacy), use it as connectorType
    connectorType: params.connectorType || params.chargerId || 'ccs2',
    vehicleId: params.vehicleId,
    windowStart: params.startTime,
    windowEnd: params.endTime,
  };

  const res = await apiRequest<any>('/bookings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return adaptEcoVoltReservation(res);
}

export async function cancelReservation(reservationId: string, _userId?: string): Promise<boolean> {
  await apiRequest<any>(`/bookings/${reservationId}/cancel`, { method: 'PATCH' });
  return true;
}

export async function completeReservation(_reservationId: string): Promise<boolean> {
  // Session completion is handled server-side via POST /sessions/:id/stop
  return true;
}

export async function getActiveReservationCount(_userId: string): Promise<number> {
  const all = await getUserReservations(_userId);
  return all.filter((r) => r.status === 'active' || r.status === 'reserved').length;
}

export type { ReservationWithDetails };
