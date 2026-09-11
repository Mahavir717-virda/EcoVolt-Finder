import { ConnectorType, DataQuality, GreennessBand, PowerProvider, VehicleClass } from '@contracts/enums';
import { GeoPoint, StationSummary } from '@contracts/types';

export type StationSortOption = 'trueCost' | 'greenest' | 'nearest';

export interface StationFilterState {
  query: string;
  connectorTypes: ConnectorType[];
  minPowerKw: number | null;
  vehicleClass: VehicleClass;
  reachableOnly: boolean;
  sortBy: StationSortOption;
}

export interface StationWithMeta extends StationSummary {
  distanceKm: number;
  travelMinutes: number;
  travelCost: number;
  energyNeededKwh: number;
  chargingCost: number;
  trueTotalCost: number;
  vsCheapestSticker: number;
  reachable: boolean;
  maxRangeKm: number;
  unreachableReason?: string;
  connectorCompatible: boolean;
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'manual';

export interface DriverLocationState {
  coords: GeoPoint;
  status: LocationPermissionStatus;
  isManual: boolean;
  isLoading: boolean;
  errorMessage?: string;
}
