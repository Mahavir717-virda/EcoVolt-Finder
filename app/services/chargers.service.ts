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

export async function updateChargerStatus(
  chargerId: string,
  status: ChargerStatus
): Promise<boolean> {
  return true;
}
