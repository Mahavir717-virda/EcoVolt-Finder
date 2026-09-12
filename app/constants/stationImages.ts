import { ImageSourcePropType } from 'react-native';

/**
 * High-Impact Photorealistic Station Images Registry
 * Maps each mock/live charging station ID and name to custom generated high-resolution assets.
 */
export const STATION_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  'station-001': require('../assets/images/stations/station-001.jpg'),
  'station-002': require('../assets/images/stations/station-002.jpg'),
  'station-003': require('../assets/images/stations/station-003.jpg'),
  'station-004': require('../assets/images/stations/station-004.jpg'),
  'station-005': require('../assets/images/stations/station-005.jpg'),
  'station-006': require('../assets/images/stations/station-006.jpg'),
  'default': require('../assets/images/stations/default.jpg'),
};

/**
 * Returns a React Native ImageSource for a given station ID, name, or index.
 */
export function getStationImageSource(stationIdOrName?: string | null): ImageSourcePropType {
  if (!stationIdOrName) return STATION_IMAGE_MAP['station-001'];

  const raw = String(stationIdOrName).trim();
  const normalized = raw.toLowerCase();

  // Exact ID match
  if (STATION_IMAGE_MAP[raw]) {
    return STATION_IMAGE_MAP[raw];
  }

  // Adani / Satellite / Prahlad Nagar
  if (
    normalized.includes('adani') ||
    normalized.includes('satellite') ||
    normalized.includes('prahlad') ||
    normalized.includes('station-003') ||
    normalized.includes('station-3') ||
    normalized.includes('003') ||
    normalized === '3'
  ) {
    return STATION_IMAGE_MAP['station-003'];
  }

  // Torrent / CG Road
  if (
    normalized.includes('torrent') ||
    normalized.includes('cg road') ||
    normalized.includes('station-001') ||
    normalized.includes('station-1') ||
    normalized.includes('001') ||
    normalized === '1'
  ) {
    return STATION_IMAGE_MAP['station-001'];
  }

  // GUVNL / Navrangpura
  if (
    normalized.includes('guvnl') ||
    normalized.includes('navrangpura') ||
    normalized.includes('station-002') ||
    normalized.includes('station-2') ||
    normalized.includes('002') ||
    normalized === '2'
  ) {
    return STATION_IMAGE_MAP['station-002'];
  }

  // Tata Power / SG Highway
  if (
    normalized.includes('tata') ||
    normalized.includes('ez charge') ||
    normalized.includes('station-004') ||
    normalized.includes('station-4') ||
    normalized.includes('004') ||
    normalized === '4'
  ) {
    return STATION_IMAGE_MAP['station-004'];
  }

  // Charanka / Solar Park / Mehsana
  if (
    normalized.includes('charanka') ||
    normalized.includes('solar park') ||
    normalized.includes('mehsana') ||
    normalized.includes('station-005') ||
    normalized.includes('station-5') ||
    normalized.includes('005') ||
    normalized === '5'
  ) {
    return STATION_IMAGE_MAP['station-005'];
  }

  // Statiq / Sindhu Bhavan / Gandhinagar
  if (
    normalized.includes('statiq') ||
    normalized.includes('sindhu') ||
    normalized.includes('infocity') ||
    normalized.includes('station-006') ||
    normalized.includes('station-6') ||
    normalized.includes('006') ||
    normalized === '6'
  ) {
    return STATION_IMAGE_MAP['station-006'];
  }

  return STATION_IMAGE_MAP['station-001'];
}

export default STATION_IMAGE_MAP;
