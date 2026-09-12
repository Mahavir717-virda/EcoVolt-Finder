/**
 * useReservations Hook
 * React hook for managing reservation data and operations
 */

import {
    cancelReservation,
    createReservation,
    getActiveReservationCount,
    getReservationById,
    getUserReservations,
    ReservationWithDetails
} from '@/services/reservations.service';
import { Reservation } from '@/types/database.types';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useUserReservationsRealtime } from './useRealtime';

/**
 * Hook to fetch and manage user's reservations
 */
export function useReservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getUserReservations(user.id);
      setReservations(data);
    } catch (err) {
      setError('Failed to fetch reservations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Handle realtime updates
  const handleInsert = useCallback((reservation: Reservation) => {
    // Refetch to get full details with joins
    fetchReservations();
  }, [fetchReservations]);

  const handleUpdate = useCallback((reservation: Reservation) => {
    setReservations(prev =>
      prev.map(r => (r.id === reservation.id ? { ...r, ...reservation } : r))
    );
  }, []);

  const handleDelete = useCallback((reservation: Reservation) => {
    setReservations(prev => prev.filter(r => r.id !== reservation.id));
  }, []);

  // Subscribe to realtime updates
  useUserReservationsRealtime(user?.id || null, {
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
  });

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Computed values
  const activeReservations = reservations.filter(r => r.status === 'active');
  const pastReservations = reservations.filter(r => 
    r.status === 'completed' || r.status === 'cancelled' || r.status === 'expired'
  );

  return {
    reservations,
    activeReservations,
    pastReservations,
    loading,
    error,
    refresh: fetchReservations,
  };
}

/**
 * Hook for creating reservations
 */
export function useCreateReservation() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (
    chargerId: string,
    startTime: Date,
    endTime: Date
  ): Promise<Reservation | null> => {
    if (!user?.id) {
      setError('You must be logged in to make a reservation');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const reservation = await createReservation({
        userId: user.id,
        stationId: 'station-001',
        chargerId,
        startTime: startTime instanceof Date ? startTime.toISOString() : String(startTime),
        endTime: endTime instanceof Date ? endTime.toISOString() : String(endTime),
      });
      return reservation;
    } catch (err: any) {
      setError(err.message || 'Failed to create reservation');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    create,
    loading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook for cancelling reservations
 */
export function useCancelReservation() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancel = useCallback(async (
    reservationId: string
  ): Promise<boolean> => {
    if (!user?.id) {
      setError('You must be logged in');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      await cancelReservation(reservationId, user.id);
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservation');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return {
    cancel,
    loading,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook to get active reservation count
 */
export function useActiveReservationCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const result = await getActiveReservationCount(user.id);
      setCount(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    count,
    loading,
    refresh: fetchCount,
  };
}

/**
 * Hook to get a single reservation
 */
export function useReservation(reservationId: string | null) {
  const [reservation, setReservation] = useState<ReservationWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReservation = useCallback(async () => {
    if (!reservationId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getReservationById(reservationId);
      setReservation(data);
    } catch (err) {
      setError('Failed to fetch reservation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    fetchReservation();
  }, [fetchReservation]);

  return {
    reservation,
    loading,
    error,
    refresh: fetchReservation,
  };
}
