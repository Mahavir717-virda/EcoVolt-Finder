import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { http } from '../../api/http';
import { GeoPoint, StationSummary, Vehicle } from '@contracts/types';
import { ConnectorType, VehicleClass } from '@contracts/enums';
import { StationFilterState, StationWithMeta } from './types';
import {
  calculateHaversineDistanceKm,
  estimateTravelMinutes,
  calculateTravelCost,
  checkStationReachability,
} from './utils';

export const initialFilterState: StationFilterState = {
  query: '',
  connectorTypes: [],
  minPowerKw: null,
  vehicleClass: VehicleClass.CAR,
  reachableOnly: false,
  sortBy: 'trueCost',
};

interface UseNearbyStationsProps {
  driverCoords: GeoPoint;
  filters: StationFilterState;
  activeVehicle?: Partial<Vehicle> | null;
}

export function useNearbyStations({
  driverCoords,
  filters,
  activeVehicle,
}: UseNearbyStationsProps) {
  const query = useQuery<StationSummary[]>({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await http.get<StationSummary[]>('/stations');
      return res;
    },
    staleTime: 30000,
  });

  // Calculate default vehicle parameters based on vehicle class
  const vehicleConfig = useMemo(() => {
    const isBike = filters.vehicleClass === VehicleClass.BIKE;
    return {
      batteryKwh: activeVehicle?.batteryKwh ?? (isBike ? 3.5 : 40.5),
      efficiencyWhKm: activeVehicle?.efficiencyWhKm ?? (isBike ? 40 : 140),
      currentChargePct: activeVehicle?.currentChargePct ?? (isBike ? 35 : 42),
      supportedConnectors: activeVehicle?.connectors ?? (isBike
        ? [ConnectorType.THREE_PIN, ConnectorType.BHARAT_AC_001, ConnectorType.TYPE2_AC]
        : [ConnectorType.CCS2, ConnectorType.TYPE2_AC, ConnectorType.BHARAT_DC_001]),
    };
  }, [filters.vehicleClass, activeVehicle]);

  // Enrich raw stations with dynamic distance, travel cost, true total cost, and reachability
  const enrichedStations: StationWithMeta[] = useMemo(() => {
    const rawList = query.data || [];
    if (rawList.length === 0) return [];

    const energyNeeded = filters.vehicleClass === VehicleClass.BIKE ? 2.5 : 18.0;

    const list = rawList.map((station) => {
      const distanceKm = calculateHaversineDistanceKm(driverCoords, station.location);
      const travelMinutes = estimateTravelMinutes(distanceKm, filters.vehicleClass);
      const travelCost = calculateTravelCost(
        distanceKm,
        vehicleConfig.efficiencyWhKm,
        station.priceFrom
      );
      const chargingCost = Math.round(station.priceFrom * energyNeeded * 10) / 10;
      const trueTotalCost = Math.round((chargingCost + travelCost) * 10) / 10;

      const reachCheck = checkStationReachability(
        distanceKm,
        vehicleConfig.batteryKwh,
        vehicleConfig.currentChargePct,
        vehicleConfig.efficiencyWhKm
      );

      const connectorCompatible = station.connectors.some((c) =>
        vehicleConfig.supportedConnectors.includes(c.type)
      );

      return {
        ...station,
        distanceKm,
        travelMinutes,
        travelCost,
        energyNeededKwh: energyNeeded,
        chargingCost,
        trueTotalCost,
        vsCheapestSticker: 0, // Computed below relative to lowest sticker
        reachable: reachCheck.reachable,
        maxRangeKm: reachCheck.maxRangeKm,
        unreachableReason: reachCheck.reason,
        connectorCompatible,
      };
    });

    // Find the cheapest sticker station to calculate vsCheapestSticker
    const stickerMin = Math.min(...list.map((s) => s.priceFrom));
    const stickerMinStation = list.find((s) => s.priceFrom === stickerMin);
    const baselineTrueCost = stickerMinStation ? stickerMinStation.trueTotalCost : 0;

    return list.map((s) => ({
      ...s,
      vsCheapestSticker: Math.round((s.trueTotalCost - baselineTrueCost) * 10) / 10,
    }));
  }, [query.data, driverCoords, filters.vehicleClass, vehicleConfig]);

  // Filter and sort
  const filteredStations = useMemo(() => {
    return enrichedStations
      .filter((station) => {
        // Query search
        if (filters.query.trim().length > 0) {
          const q = filters.query.toLowerCase();
          const matchName = station.name.toLowerCase().includes(q);
          const matchOp = station.operatorName.toLowerCase().includes(q);
          const matchProv = station.provider.toLowerCase().includes(q);
          if (!matchName && !matchOp && !matchProv) return false;
        }

        // Connector filter
        if (filters.connectorTypes.length > 0) {
          const hasConnector = station.connectors.some((c) =>
            filters.connectorTypes.includes(c.type)
          );
          if (!hasConnector) return false;
        }

        // Min power filter
        if (filters.minPowerKw !== null && filters.minPowerKw > 0) {
          const hasPower = station.connectors.some(
            (c) => c.powerKw >= (filters.minPowerKw || 0)
          );
          if (!hasPower) return false;
        }

        // Reachable only filter
        if (filters.reachableOnly && !station.reachable) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sortBy === 'trueCost') {
          // Reachable first, then lowest true total cost
          if (a.reachable !== b.reachable) return a.reachable ? -1 : 1;
          return a.trueTotalCost - b.trueTotalCost;
        }
        if (filters.sortBy === 'greenest') {
          return b.greenness.renewablePct - a.greenness.renewablePct;
        }
        if (filters.sortBy === 'nearest') {
          return a.distanceKm - b.distanceKm;
        }
        return 0;
      });
  }, [enrichedStations, filters]);

  return {
    stations: filteredStations,
    allStations: enrichedStations,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}
