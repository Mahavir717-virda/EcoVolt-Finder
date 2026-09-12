import { ImageSourcePropType } from 'react-native';

export const STATION_IMAGE_MAP: Record<string, ImageSourcePropType> = {
  'station-001': require('../../../assets/images/stations/station-001.jpg'),
  'station-002': require('../../../assets/images/stations/station-002.jpg'),
  'station-003': require('../../../assets/images/stations/station-003.jpg'),
  'station-004': require('../../../assets/images/stations/station-004.jpg'),
  'station-005': require('../../../assets/images/stations/station-005.jpg'),
  'station-006': require('../../../assets/images/stations/station-006.jpg'),
  'default': require('../../../assets/images/stations/default.jpg'),
};

export function getStationImageSource(stationIdOrName?: string | null): ImageSourcePropType {
  if (!stationIdOrName) return STATION_IMAGE_MAP['default'];

  const normalized = String(stationIdOrName).toLowerCase().trim();

  if (STATION_IMAGE_MAP[stationIdOrName]) {
    return STATION_IMAGE_MAP[stationIdOrName];
  }

  if (normalized.includes('torrent') || normalized.includes('cg road') || normalized.includes('001') || normalized.includes('1')) {
    return STATION_IMAGE_MAP['station-001'];
  }
  if (normalized.includes('guvnl') || normalized.includes('navrangpura') || normalized.includes('002') || normalized.includes('2')) {
    return STATION_IMAGE_MAP['station-002'];
  }
  if (normalized.includes('adani') || normalized.includes('satellite') || normalized.includes('prahlad') || normalized.includes('003') || normalized.includes('3')) {
    return STATION_IMAGE_MAP['station-003'];
  }
  if (normalized.includes('tata') || normalized.includes('ez charge') || normalized.includes('004') || normalized.includes('4')) {
    return STATION_IMAGE_MAP['station-004'];
  }
  if (normalized.includes('charanka') || normalized.includes('solar park') || normalized.includes('mehsana') || normalized.includes('005') || normalized.includes('5')) {
    return STATION_IMAGE_MAP['station-005'];
  }
  if (normalized.includes('statiq') || normalized.includes('sindhu') || normalized.includes('infocity') || normalized.includes('006') || normalized.includes('6')) {
    return STATION_IMAGE_MAP['station-006'];
  }

  return STATION_IMAGE_MAP['station-001'];
}

export default STATION_IMAGE_MAP;
