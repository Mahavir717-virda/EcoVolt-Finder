import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { GeoPoint, StationRecommendation, StationSummary } from '@contracts/types';
import {
  VehicleClass,
  PowerProvider,
  ConnectorType,
  GreennessBand,
  DataQuality,
} from '@contracts/enums';
import {
  Text,
  LinearProgress,
  Chip,
  RouteComparisonCard,
} from '../../components';
import { GreennessPin } from '../../features/stations/GreennessPin';
import { generateInterpolatedRoute, LatLng } from '../../lib/polyline';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

import {
  calculateHaversineDistanceKm,
  estimateTravelMinutes,
  calculateTravelCost,
} from '../../features/stations/utils';
import { useDriverLocation } from '../../features/stations/useDriverLocation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type RouteCompareRouteProp = RouteProp<DriverStackParamList, 'RouteCompare'>;

export const RouteCompareScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteCompareRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const mapRef = useRef<MapView | null>(null);

  const { coords: liveDriverCoords } = useDriverLocation();

  const stationId = route.params?.stationId || 'station-001';
  const driverOrigin: GeoPoint = {
    lat: route.params?.originLat || liveDriverCoords.lat || 23.0370,
    lng: route.params?.originLng || liveDriverCoords.lng || 72.5622,
  };

  const [vehicleClass, setVehicleClass] = useState<VehicleClass>(VehicleClass.CAR);

  // 1. Fetch All Stations & Station Details
  const stationsQuery = useQuery<StationSummary[]>({
    queryKey: ['stations'],
    queryFn: async () => {
      const res = await http.get<StationSummary[]>('/stations');
      return res;
    },
    staleTime: 30000,
  });

  const stationQuery = useQuery<StationSummary>({
    queryKey: ['station', stationId],
    queryFn: async () => {
      const res = await http.get<StationSummary>(`/stations/${stationId}`);
      return res;
    },
    staleTime: 30000,
  });

  // 2. Fetch Recommendations with dynamic origin coordinates
  const recQuery = useQuery<StationRecommendation[]>({
    queryKey: ['recommendations', driverOrigin.lat, driverOrigin.lng],
    queryFn: async () => {
      const res = await http.get<StationRecommendation[]>(
        `/recommendations?originLat=${driverOrigin.lat}&originLng=${driverOrigin.lng}`
      );
      return res;
    },
    staleTime: 30000,
  });

  const isComputing = stationQuery.isLoading || recQuery.isLoading;
  const allStations = stationsQuery.data || [];
  const chosenStation: StationSummary =
    stationQuery.data ||
    allStations.find((s) => s.id === stationId) || {
      id: stationId,
      name: 'Torrent Charging Hub – CG Road',
      location: { lat: 23.0370, lng: 72.5622 },
      operatorName: 'Green Drive Pvt Ltd',
      provider: PowerProvider.TORRENT,
      connectors: [{ type: ConnectorType.CCS2, powerKw: 60, available: 2, total: 3 }],
      greenness: { renewablePct: 85, band: GreennessBand.VERY_HIGH, quality: DataQuality.LIVE },
      priceFrom: 6.2,
    };

  const getStationForRec = (rec?: Partial<StationRecommendation>): StationSummary => {
    if (rec?.station) return rec.station;
    const targetId = rec?.stationId || (rec as any)?.station?.id;
    if (targetId) {
      const matched = allStations.find((s) => s.id === targetId);
      if (matched) return matched;
      if (targetId === stationId) return chosenStation;
    }
    return (
      allStations[0] ||
      chosenStation
    );
  };

  const rawRecommendations = recQuery.data || [];
  const hydratedRecommendations = rawRecommendations.map((r) => ({
    ...r,
    station: getStationForRec(r),
  }));

  // Dynamic calculations for recommended station
  const bestRecStation = getStationForRec(hydratedRecommendations[0]);
  const recDistanceKm = calculateHaversineDistanceKm(driverOrigin, bestRecStation.location);
  const recTravelMins = estimateTravelMinutes(recDistanceKm, vehicleClass);
  const recTravelCost = calculateTravelCost(recDistanceKm, vehicleClass === VehicleClass.BIKE ? 40 : 140, bestRecStation.priceFrom);
  const recChargingCost = Math.round(bestRecStation.priceFrom * (vehicleClass === VehicleClass.BIKE ? 2.5 : 18.0) * 10) / 10;
  const recTrueCost = Math.round((recChargingCost + recTravelCost) * 10) / 10;

  // Recommended station (default to best ranked station with dynamic metrics)
  const recommendedRec: StationRecommendation & { station: StationSummary } =
    hydratedRecommendations[0] || {
      station: bestRecStation,
      stationId: bestRecStation.id,
      distanceKm: recDistanceKm,
      travelMinutes: recTravelMins,
      energyNeededKwh: vehicleClass === VehicleClass.BIKE ? 2.5 : 18.0,
      chargingCost: recChargingCost,
      travelCost: recTravelCost,
      trueTotalCost: recTrueCost,
      vsCheapestSticker: -9.0,
      reachable: true,
      connectorCompatible: true,
      reason: `Closest optimal station (${recDistanceKm} km · ${recTravelMins} mins) with true total cost.`,
    };

  // Dynamic calculations for chosen station
  const chosenDistKm = calculateHaversineDistanceKm(driverOrigin, chosenStation.location);
  const chosenTravelMins = estimateTravelMinutes(chosenDistKm, vehicleClass);
  const chosenTravelCost = calculateTravelCost(chosenDistKm, vehicleClass === VehicleClass.BIKE ? 40 : 140, chosenStation.priceFrom);
  const chosenChargingCost = Math.round(chosenStation.priceFrom * (vehicleClass === VehicleClass.BIKE ? 2.5 : 18.0) * 10) / 10;
  const chosenTrueCost = Math.round((chosenChargingCost + chosenTravelCost) * 10) / 10;

  // Chosen station recommendation
  const chosenRec: StationRecommendation & { station: StationSummary } =
    hydratedRecommendations.find(
      (r) => r.station?.id === stationId || r.stationId === stationId
    ) || {
      station: chosenStation,
      stationId: chosenStation.id,
      distanceKm: chosenDistKm,
      travelMinutes: chosenTravelMins,
      energyNeededKwh: vehicleClass === VehicleClass.BIKE ? 2.5 : 18.0,
      chargingCost: chosenChargingCost,
      travelCost: chosenTravelCost,
      trueTotalCost: chosenTrueCost,
      vsCheapestSticker: Math.round((chosenTrueCost - recTrueCost) * 10) / 10,
      reachable: true,
      connectorCompatible: true,
      reason: `Route calculated (${chosenDistKm} km · ${chosenTravelMins} mins) at ₹${chosenStation.priceFrom}/kWh.`,
    };

  // Generate route polylines
  const chosenDestination: GeoPoint = chosenStation.location;
  const recDestination: GeoPoint = recommendedRec.station.location;

  const chosenRouteCoords: LatLng[] = generateInterpolatedRoute(
    driverOrigin,
    chosenDestination,
    10
  );

  const recRouteCoords: LatLng[] = generateInterpolatedRoute(
    driverOrigin,
    recDestination,
    10
  );

  // Fit camera to show all route points
  useEffect(() => {
    if (mapRef.current && chosenRouteCoords.length > 0) {
      const allCoords = [
        { latitude: driverOrigin.lat, longitude: driverOrigin.lng },
        { latitude: chosenDestination.lat, longitude: chosenDestination.lng },
        { latitude: recDestination.lat, longitude: recDestination.lng },
      ];
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 120, right: 60, bottom: 320, left: 60 },
        animated: true,
      });
    }
  }, [driverOrigin, chosenDestination, recDestination]);

  const handleSelectRecommended = () => {
    navigation.navigate('BookingConfirm', {
      stationId: recommendedRec.station.id,
      connectorType: recommendedRec.station.connectors?.[0]?.type,
    });
  };

  const handleSelectChosen = () => {
    navigation.navigate('BookingConfirm', {
      stationId: chosenRec.station.id,
      connectorType: chosenRec.station.connectors?.[0]?.type,
    });
  };

  const handleUrgentOverride = () => {
    navigation.navigate('BookingConfirm', {
      stationId: chosenRec.station.id,
      connectorType: chosenRec.station.connectors?.[0]?.type,
    });
  };

  return (
    <View style={styles.container}>
      {/* 1. MAP CANVAS */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: driverOrigin.lat,
          longitude: driverOrigin.lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {/* Driver Origin Marker */}
        <Marker
          coordinate={{
            latitude: driverOrigin.lat,
            longitude: driverOrigin.lng,
          }}
          title="Your Starting Location"
        >
          <View style={styles.originMarker}>
            <View style={styles.originMarkerInner} />
          </View>
        </Marker>

        {/* Chosen Station Marker */}
        {chosenStation && (
          <Marker
            coordinate={{
              latitude: chosenStation.location.lat,
              longitude: chosenStation.location.lng,
            }}
            title={chosenStation.name}
            zIndex={20}
          >
            <GreennessPin
              station={{
                ...chosenStation,
                distanceKm: chosenRec.distanceKm,
                travelMinutes: chosenRec.travelMinutes,
                travelCost: chosenRec.travelCost,
                energyNeededKwh: chosenRec.energyNeededKwh,
                chargingCost: chosenRec.chargingCost,
                trueTotalCost: chosenRec.trueTotalCost,
                vsCheapestSticker: chosenRec.vsCheapestSticker,
                reachable: chosenRec.reachable,
                maxRangeKm: 50,
                connectorCompatible: chosenRec.connectorCompatible,
              }}
              isSelected={true}
            />
          </Marker>
        )}

        {/* Recommended Station Marker (if different) */}
        {recommendedRec.station.id !== chosenRec.station.id && (
          <Marker
            coordinate={{
              latitude: recommendedRec.station.location.lat,
              longitude: recommendedRec.station.location.lng,
            }}
            title={recommendedRec.station.name}
            zIndex={15}
          >
            <GreennessPin
              station={{
                ...recommendedRec.station,
                distanceKm: recommendedRec.distanceKm,
                travelMinutes: recommendedRec.travelMinutes,
                travelCost: recommendedRec.travelCost,
                energyNeededKwh: recommendedRec.energyNeededKwh,
                chargingCost: recommendedRec.chargingCost,
                trueTotalCost: recommendedRec.trueTotalCost,
                vsCheapestSticker: recommendedRec.vsCheapestSticker,
                reachable: recommendedRec.reachable,
                maxRangeKm: 50,
                connectorCompatible: recommendedRec.connectorCompatible,
              }}
            />
          </Marker>
        )}

        {/* Chosen Route Polyline (Electric Volt Teal) */}
        <Polyline
          coordinates={chosenRouteCoords}
          strokeColor={colors.brand}
          strokeWidth={4}
        />

        {/* Recommended Route Polyline (Brand Green Dashed) */}
        {recommendedRec.station.id !== chosenRec.station.id && (
          <Polyline
            coordinates={recRouteCoords}
            strokeColor={colors.brand}
            strokeWidth={3}
            lineDashPattern={[6, 6]}
          />
        )}
      </MapView>

      {/* 2. TOP COMPUTING INDICATOR & ROUTE STATS */}
      <View
        style={[
          styles.topHeaderContainer,
          { paddingTop: Math.max(insets.top, spacing.base) },
        ]}
      >
        {isComputing && <LinearProgress style={styles.progressBar} />}

        <View style={styles.topStatsCard}>
          <View style={styles.statsLeft}>
            <Text variant="cardTitle" style={styles.statsTitle}>
              {chosenRec.distanceKm} km · {chosenRec.travelMinutes} mins drive
            </Text>
            <Text variant="micro" color={colors.ink2}>
              Clear route · Travel cost ₹{(chosenRec.travelCost ?? 14.4).toFixed(1)} calculated
            </Text>
          </View>

          {/* Vehicle Profile Switcher (Edge Case #11) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              setVehicleClass((prev) =>
                prev === VehicleClass.CAR ? VehicleClass.BIKE : VehicleClass.CAR
              )
            }
          >
            <Chip
              label={vehicleClass === VehicleClass.CAR ? '🚗 Car' : '🛵 Bike'}
              variant="subtle"
              color={colors.brand}
              backgroundColor={colors.brandTint}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. BOTTOM HEAD-TO-HEAD COMPARISON CARD */}
      <View
        style={[
          styles.bottomCardContainer,
          { paddingBottom: Math.max(insets.bottom, spacing.base) },
        ]}
      >
        <RouteComparisonCard
          chosen={chosenRec}
          recommended={recommendedRec}
          vehicleClass={vehicleClass}
          onSelectRecommended={handleSelectRecommended}
          onSelectChosen={handleSelectChosen}
          onUrgentOverride={handleUrgentOverride}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: spacing.base,
    right: spacing.base,
    zIndex: 20,
    gap: spacing.xs,
  },
  progressBar: {
    borderRadius: radii.pill,
  },
  topStatsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.e2,
  },
  statsLeft: {
    flex: 1,
    gap: 2,
  },
  statsTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  originMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 184, 201, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.brand,
  },
  originMarkerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  bottomCardContainer: {
    position: 'absolute',
    bottom: 0,
    left: spacing.base,
    right: spacing.base,
    zIndex: 20,
  },
});
