/**
 * Adapters to map between EcoVolt Express Backend Models and VoltSpot UI Models
 */

import { Station, Charger, Reservation, Profile } from '@/types/database.types';

export interface StationWithChargers extends Station {
  chargers: Charger[];
}

export interface StationWithDistance extends Station {
  distance: number;
}

export interface ReservationWithDetails extends Reservation {
  charger: Charger;
  station: Station;
}

export function adaptEcoVoltStation(raw: any): Station {
  const connectors = raw.connectors || [];
  const totalChargers = connectors.reduce((acc: number, c: any) => acc + (c.total || 1), 0) || raw.total_chargers || raw.totalChargers || 4;
  const availableChargers = connectors.reduce((acc: number, c: any) => acc + (c.available ?? 1), 0) || raw.available_chargers || raw.availableChargers || 2;
  const greenPct = raw.greenness?.renewablePct ?? raw.greennessPct ?? raw.greenness_score ?? 85;

  const idStr = String(raw.id || raw.stationId || 'station-001');
  const stationImageFallbacks: Record<string, string> = {
    'station-001': 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&auto=format&fit=crop&q=80',
    'station-002': 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80',
    'station-003': 'https://images.unsplash.com/photo-1558441719-2345b85ab814?w=1200&auto=format&fit=crop&q=80',
    'station-004': 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1200&auto=format&fit=crop&q=80',
    'station-005': 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&auto=format&fit=crop&q=80',
    'station-006': 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1200&auto=format&fit=crop&q=80',
  };

  return {
    id: idStr,
    name: raw.name || raw.stationName || 'EcoVolt Green Hub',
    latitude: raw.location?.lat ?? raw.latitude ?? raw.lat ?? 23.0370,
    longitude: raw.location?.lng ?? raw.longitude ?? raw.lng ?? 72.5622,
    address: raw.address || `${raw.operatorName || 'Green Grid'}, Ahmedabad`,
    city: raw.city || 'Ahmedabad',
    total_chargers: totalChargers,
    available_chargers: availableChargers,
    rating: raw.rating ?? 4.8,
    amenities: raw.amenities || ['wifi', 'restrooms', 'cafe', 'solar_canopy'],
    image_url: raw.image_url || raw.imageUrl || stationImageFallbacks[idStr] || stationImageFallbacks['station-001'],
    is_active: raw.is_active ?? true,
    greenness_score: greenPct,
    co2_saved_kg: raw.co2_saved_kg ?? raw.co2AvoidedKg ?? 15.2,
    price_from: raw.priceFrom ?? 12.5,
    created_at: raw.createdAt || raw.created_at || new Date().toISOString(),
    updated_at: raw.updatedAt || raw.updated_at || new Date().toISOString(),
  };
}

export function adaptEcoVoltChargers(rawStation: any): Charger[] {
  const stationId = String(rawStation.id || rawStation.stationId || 'station-001');

  if (rawStation.chargers && rawStation.chargers.length > 0) {
    return rawStation.chargers.map((c: any) => ({
      id: String(c.id),
      station_id: stationId,
      charger_type: c.charger_type || 'dc_fast',
      connector_type: c.connector_type || 'ccs',
      power_kw: Number(c.power_kw || c.powerKw || 50),
      price_per_kwh: Number(c.price_per_kwh || c.pricePerKwh || 6.0),
      status: c.status || 'available',
      created_at: c.created_at || new Date().toISOString(),
      updated_at: c.updated_at || new Date().toISOString(),
    }));
  }

  const connectors = rawStation.connectors || [
    { type: 'ccs2', powerKw: 60, available: 2, total: 3 },
    { type: 'type2_ac', powerKw: 22, available: 1, total: 2 },
  ];

  return connectors.map((c: any, index: number) => {
    const isAvailable = (c.available ?? 1) > 0;
    const connectorType = c.type === 'ccs2' ? 'ccs' : c.type === 'type2_ac' ? 'type2' : 'chademo';
    const chargerType = (c.powerKw || 50) >= 50 ? 'dc_fast' : 'level_2';
    return {
      id: c.id || `${stationId}-c${index + 1}`,
      station_id: stationId,
      charger_type: chargerType as any,
      connector_type: connectorType as any,
      power_kw: Number(c.powerKw || 50),
      price_per_kwh: Number(rawStation.priceFrom || rawStation.lockedPrice || 6.2),
      status: (isAvailable ? 'available' : 'in_use') as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

export function adaptEcoVoltReservation(raw: any, stationData?: any): ReservationWithDetails {
  const stationRaw = stationData || raw.station;
  const station = stationRaw ? adaptEcoVoltStation(stationRaw) : {
    id: String(raw.stationId || 'station-001'),
    name: raw.stationName || 'Torrent Charging Hub – CG Road',
    latitude: 23.0370,
    longitude: 72.5622,
    address: 'CG Road, Navrangpura, Ahmedabad',
    city: 'Ahmedabad',
    total_chargers: 4,
    available_chargers: 2,
    rating: 4.9,
    amenities: ['wifi', 'restrooms', 'cafe'],
    image_url: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&auto=format&fit=crop&q=60',
    is_active: true,
    greenness_score: raw.greennessPct || 85,
    co2_saved_kg: raw.co2AvoidedKg || 12.6,
    created_at: raw.createdAt || new Date().toISOString(),
    updated_at: raw.createdAt || new Date().toISOString(),
  };

  const rawPrice =
    typeof raw.lockedPrice === 'object' && raw.lockedPrice !== null
      ? (raw.lockedPrice.finalPrice ?? raw.lockedPrice.baseTariff ?? 6.2)
      : raw.lockedPrice;
  const pricePerKwh = Number(rawPrice) || 6.2;
  const powerKw = Number(raw.connector?.powerKw || raw.powerKw || 60);

  const charger: Charger & { station?: Station } = {
    id: String(raw.connectorId || raw.chargerId || `${station.id}-c1`),
    station_id: station.id,
    charger_type: powerKw >= 50 ? 'dc_fast' : 'level_2',
    connector_type: raw.connectorType === 'type2_ac' ? 'type2' : 'ccs',
    power_kw: powerKw,
    price_per_kwh: pricePerKwh,
    status: raw.status === 'active' ? 'in_use' : 'available',
    created_at: raw.createdAt || new Date().toISOString(),
    updated_at: raw.createdAt || new Date().toISOString(),
    station,
  };

  let mappedStatus: 'active' | 'completed' | 'cancelled' | 'expired' = 'active';
  if (raw.status === 'completed') mappedStatus = 'completed';
  else if (raw.status === 'cancelled') mappedStatus = 'cancelled';
  else if (raw.status === 'expired') mappedStatus = 'expired';
  else mappedStatus = 'active';

  const startTime = raw.windowStart || raw.start_time || new Date().toISOString();
  const endTime = raw.windowEnd || raw.end_time || new Date(Date.now() + 3600000).toISOString();
  const durationMinutes =
    Number(raw.durationMinutes || raw.duration_minutes) ||
    Math.max(15, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000));

  const calculatedCost =
    raw.cost != null
      ? Number(raw.cost)
      : raw.energyKwh != null
      ? Number(raw.energyKwh) * pricePerKwh
      : Number((powerKw * (durationMinutes / 60) * pricePerKwh).toFixed(2));

  return {
    id: String(raw.id || `book_${Date.now()}`),
    user_id: String(raw.userId || raw.user_id || 'usr_driver_101'),
    charger_id: charger.id,
    start_time: startTime,
    end_time: endTime,
    duration_minutes: durationMinutes,
    status: mappedStatus,
    total_price: calculatedCost,
    estimated_cost: calculatedCost,
    created_at: raw.createdAt || new Date().toISOString(),
    updated_at: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    station,
    charger,
    vehicle: raw.vehicle,
  } as any;
}
