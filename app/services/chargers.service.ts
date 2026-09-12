/**
 * Chargers Service
 * Manages charger ports, status, and telemetry via EcoVolt Express API.
 */

import { Charger, ChargerStatus } from '@/types/database.types';
import { apiRequest } from './api';
import { getStationById } from './stations.service';

export async function getChargersByStationId(stationId: string): Promise<Charger[]> {
  const station = await getStationById(stationId);
  return station?.chargers || [];
}

export const getChargersByStation = getChargersByStationId;

/**
 * Get a specific charger/connector by ID.
 * Fetches from server; returns null if not found.
 */
export async function getChargerById(chargerId: string): Promise<Charger | null> {
  try {
    const raw = await apiRequest<any>(`/stations/connectors/${chargerId}`, { method: 'GET' });
    if (!raw) return null;
    return {
      id: raw.id,
      station_id: raw.stationId,
      charger_type: raw.powerKw >= 50 ? 'dc_fast' : 'ac_level2',
      connector_type: raw.type,
      power_kw: raw.powerKw,
      price_per_kwh: raw.pricePerKwh || null,
      status: (raw.status || 'available') as ChargerStatus,
      created_at: raw.createdAt || new Date().toISOString(),
      updated_at: raw.updatedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function isChargerAvailable(chargerId: string): Promise<boolean> {
  const charger = await getChargerById(chargerId);
  return charger?.status === 'available';
}

export async function getChargerStats(stationId: string): Promise<{
  total: number;
  available: number;
  inUse: number;
  reserved: number;
  offline: number;
  lowestPrice: number | null;
  highestPrice: number | null;
}> {
  const chargers = await getChargersByStationId(stationId);
  const total = chargers.length;
  const available = chargers.filter((c) => c.status === 'available').length;
  const inUse = chargers.filter((c) => c.status === 'in_use').length;
  const reserved = chargers.filter((c) => c.status === 'reserved').length;
  const offline = chargers.filter((c) => c.status === 'offline').length;
  const prices = chargers.map((c) => c.price_per_kwh).filter((p): p is number => typeof p === 'number');
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : null;
  return { total, available, inUse, reserved, offline, lowestPrice, highestPrice };
}

export async function updateChargerStatus(
  chargerId: string,
  status: ChargerStatus
): Promise<boolean> {
  try {
    await apiRequest<any>(`/stations/connectors/${chargerId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return true;
  } catch {
    return false;
  }
}
