import { ConnectorType, PowerProvider, VehicleClass } from '@contracts/enums';
import { GeoPoint } from '@contracts/types';

/**
 * Computes Haversine distance in kilometers between two geo coordinates.
 */
export function calculateHaversineDistanceKm(
  origin: GeoPoint,
  destination: GeoPoint
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((destination.lat - origin.lat) * Math.PI) / 180;
  const dLng = ((destination.lng - origin.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((origin.lat * Math.PI) / 180) *
      Math.cos((destination.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

/**
 * Estimates driving travel duration in minutes based on distance and vehicle class.
 */
export function estimateTravelMinutes(
  distanceKm: number,
  vehicleClass: VehicleClass = VehicleClass.CAR
): number {
  // Average urban EV speed: Car ~ 25 km/h, Bike ~ 30 km/h in traffic
  const speedKmh = vehicleClass === VehicleClass.BIKE ? 30 : 25;
  const minutes = Math.round((distanceKm / speedKmh) * 60);
  return Math.max(minutes, 3);
}

/**
 * Calculates travel energy consumption and ₹ cost.
 */
export function calculateTravelCost(
  distanceKm: number,
  efficiencyWhKm: number = 140, // 140 Wh/km for car, ~40 Wh/km for bike
  gridRatePerKwh: number = 6.0
): number {
  const kwhConsumed = (distanceKm * efficiencyWhKm) / 1000;
  const cost = kwhConsumed * gridRatePerKwh;
  return Math.round(cost * 10) / 10;
}

/**
 * Evaluates whether station is within vehicle's current remaining battery range.
 */
export function checkStationReachability(
  distanceKm: number,
  batteryKwh: number = 40.5,
  chargePct: number = 42,
  efficiencyWhKm: number = 140
): { reachable: boolean; maxRangeKm: number; reason?: string } {
  const remainingKwh = batteryKwh * (chargePct / 100);
  const maxRangeKm = Math.round(((remainingKwh * 1000) / efficiencyWhKm) * 10) / 10;

  if (distanceKm <= maxRangeKm) {
    return {
      reachable: true,
      maxRangeKm,
    };
  }

  return {
    reachable: false,
    maxRangeKm,
    reason: `Unreachable: Battery range is ${maxRangeKm} km (at ${chargePct}%), but station is ${distanceKm} km away.`,
  };
}

/**
 * Returns human-readable label for EV connector types.
 */
export function formatConnectorName(type: ConnectorType | string): string {
  switch (type) {
    case ConnectorType.CCS2:
    case 'ccs2':
      return 'CCS2 Fast DC';
    case ConnectorType.TYPE2_AC:
    case 'type2_ac':
      return 'Type 2 AC';
    case ConnectorType.BHARAT_DC_001:
    case 'bharat_dc_001':
      return 'Bharat DC-001';
    case ConnectorType.BHARAT_AC_001:
    case 'bharat_ac_001':
      return 'Bharat AC-001';
    case ConnectorType.CHADEMO:
    case 'chademo':
      return 'CHAdeMO';
    case ConnectorType.THREE_PIN:
    case 'three_pin':
      return '3-Pin 16A';
    default:
      return String(type);
  }
}

/**
 * Returns human-readable label for power distribution companies.
 */
export function formatProviderName(provider: PowerProvider | string): string {
  switch (provider) {
    case PowerProvider.TORRENT:
    case 'torrent_power':
      return 'Torrent Power';
    case PowerProvider.GUVNL_GB:
    case 'guvnl_gb':
      return 'GUVNL / Gujarat Grid';
    case PowerProvider.ADANI:
    case 'adani_energy':
      return 'Adani Total Energies';
    case PowerProvider.TATA:
    case 'tata_power':
      return 'Tata Power EV';
    case PowerProvider.BSES:
    case 'bses':
      return 'BSES Delhi';
    case PowerProvider.MSEDCL:
    case 'msedcl':
      return 'MSEDCL Maharashtra';
    default:
      return 'Independent EV Network';
  }
}
