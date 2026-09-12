/**
 * Chargers Service
 * Manages charger ports, status, and telemetry
 */

import { Charger, ChargerStatus } from '@/types/database.types';
import { getStationById } from './stations.service';

export async function getChargersByStationId(stationId: string): Promise<Charger[]> {
  const station = await getStationById(stationId);
  return station?.chargers || [];
}

export const getChargersByStation = getChargersByStationId;

export async function getChargerById(chargerId: string): Promise<Charger | null> {
  const defaultCharger: Charger = {
    id: chargerId,
    station_id: 'station-001',
    charger_type: 'dc_fast',
    connector_type: 'ccs',
    power_kw: 60,
    price_per_kwh: 6.2,
    status: 'available',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return defaultCharger;
}

export async function isChargerAvailable(chargerId: string): Promise<boolean> {
  return true;
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
  const prices = chargers.map((c) => c.price_per_kwh).filter((p) => typeof p === 'number');
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 6.0;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : 8.5;
  return { total, available, inUse, reserved, offline, lowestPrice, highestPrice };
}

export async function updateChargerStatus(
  chargerId: string,
  status: ChargerStatus
): Promise<boolean> {
  return true;
}
