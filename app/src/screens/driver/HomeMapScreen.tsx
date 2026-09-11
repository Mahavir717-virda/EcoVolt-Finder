import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DriverStackParamList } from '../../navigation/types';
import { GeoPoint } from '@contracts/types';
import {
  useLiveGrid,
  useDriverLocation,
  useNearbyStations,
  initialFilterState,
  StationFilterState,
  StationWithMeta,
  TopGreennessBadge,
  GreennessPin,
  StationCard,
  FilterSheet,
} from '../../features/stations';
import {
  Text,
  Input,
  SkeletonCard,
  EmptyState,
  Chip,
} from '../../components';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - spacing.base * 2;

export const HomeMapScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const mapRef = useRef<MapView | null>(null);
  const carouselRef = useRef<FlatList | null>(null);

  // Filters State
  const [filters, setFilters] = useState<StationFilterState>(initialFilterState);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [isPickOnMapMode, setIsPickOnMapMode] = useState(false);

  // Hooks
  const { grid, isFetching: isGridFetching } = useLiveGrid();
  const {
    coords: driverCoords,
    status: locationStatus,
    isManual,
    errorMessage: locationError,
    setManualLocation,
    recenter,
    retryPermission,
  } = useDriverLocation();

  const {
    stations,
    allStations,
    isLoading: isStationsLoading,
    isFetching: isStationsFetching,
    refetch: refetchStations,
  } = useNearbyStations({
    driverCoords,
    filters,
  });

  // Calculate active filter count
  const activeFilterCount =
    (filters.connectorTypes.length > 0 ? 1 : 0) +
    (filters.minPowerKw !== null ? 1 : 0) +
    (filters.reachableOnly ? 1 : 0) +
    (filters.sortBy !== 'trueCost' ? 1 : 0) +
    (filters.vehicleClass !== 'car' ? 1 : 0);

  // Center map on coordinates
  const animateToCoords = useCallback((coords: GeoPoint, zoomDelta = 0.05) => {
    mapRef.current?.animateToRegion(
      {
        latitude: coords.lat,
        longitude: coords.lng,
        latitudeDelta: zoomDelta,
        longitudeDelta: zoomDelta,
      },
      600
    );
  }, []);

  // Recenter when driver location changes initially
  useEffect(() => {
    if (driverCoords) {
      animateToCoords(driverCoords, 0.08);
    }
  }, [driverCoords, animateToCoords]);

  // Handle station selection
  const handleSelectStation = useCallback(
    (station: StationWithMeta, index?: number) => {
      setSelectedStationId(station.id);
      animateToCoords(station.location, 0.03);

      if (index !== undefined && carouselRef.current) {
        carouselRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      }
    },
    [animateToCoords]
  );

  // Handle Map Tap (Pick on map support)
  const handleMapPress = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    if (isPickOnMapMode || locationStatus === 'denied') {
      setManualLocation({ lat: latitude, lng: longitude });
      setIsPickOnMapMode(false);
    }
  };

  // Navigate to Detail
  const handleViewDetails = (stationId: string) => {
    navigation.navigate('StationDetail', { stationId });
  };

  // Navigate to Route Compare
  const handleCompareRoute = (stationId: string) => {
    navigation.navigate('RouteCompare', {
      stationId,
      originLat: driverCoords.lat,
      originLng: driverCoords.lng,
    });
  };

  const initialRegion: Region = {
    latitude: driverCoords.lat,
    longitude: driverCoords.lng,
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  };

  return (
    <View style={styles.container}>
      {/* 1. MAP CANVAS */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegion}
        onPress={handleMapPress}
        showsUserLocation={locationStatus === 'granted'}
        showsMyLocationButton={false}
      >
        {/* Manual Origin Marker (if custom/denied location) */}
        {isManual && (
          <Marker
            coordinate={{
              latitude: driverCoords.lat,
              longitude: driverCoords.lng,
            }}
            title="Search Origin"
            description="Stations are measured from this point"
          >
            <View style={styles.originMarker}>
              <View style={styles.originMarkerDot} />
            </View>
          </Marker>
        )}

        {/* Greenness Station Pins */}
        {stations.map((station, index) => (
          <Marker
            key={station.id}
            coordinate={{
              latitude: station.location.lat,
              longitude: station.location.lng,
            }}
            onPress={() => handleSelectStation(station, index)}
            zIndex={selectedStationId === station.id ? 99 : 10}
          >
            <GreennessPin
              station={station}
              isSelected={selectedStationId === station.id}
            />
          </Marker>
        ))}
      </MapView>

      {/* 2. TOP FLOATING CONTROLS */}
      <View style={[styles.topOverlay, { paddingTop: Math.max(insets.top, spacing.base) }]}>
        {/* Top Greenness Live Grid Badge */}
        <TopGreennessBadge
          grid={grid}
          isFetching={isGridFetching || isStationsFetching}
          style={styles.topBadge}
        />

        {/* Search Bar & Filter Trigger */}
        <View style={styles.searchRow}>
          <View style={styles.inputContainer}>
            <Input
              placeholder="Search station, operator, area..."
              value={filters.query}
              onChangeText={(text) =>
                setFilters((prev) => ({ ...prev, query: text }))
              }
              containerStyle={styles.searchInput}
              rightElement={
                filters.query.length > 0 ? (
                  <TouchableOpacity
                    onPress={() =>
                      setFilters((prev) => ({ ...prev, query: '' }))
                    }
                  >
                    <Text variant="caption" color={colors.ink3}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                ) : undefined
              }
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsFilterSheetOpen(true)}
            style={[
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive,
            ]}
          >
            <Text
              variant="caption"
              color={activeFilterCount > 0 ? '#FFFFFF' : colors.ink}
              style={styles.filterBtnText}
            >
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Location Permission Denied Warning Banner (Edge Case #19) */}
        {locationStatus === 'denied' && (
          <View style={styles.locationBanner}>
            <View style={styles.locationBannerContent}>
              <Text variant="micro" color={colors.danger} style={styles.bannerText}>
                ⚠️ GPS disabled. Showing Ahmedabad EV hub.
              </Text>
              <View style={styles.bannerActions}>
                <TouchableOpacity
                  onPress={() => setIsPickOnMapMode(!isPickOnMapMode)}
                  style={styles.bannerBtn}
                >
                  <Text variant="micro" color={colors.brand} style={styles.bannerBtnText}>
                    {isPickOnMapMode ? 'Tap map to set' : 'Pick on Map'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={retryPermission} style={styles.bannerBtn}>
                  <Text variant="micro" color={colors.ink2} style={styles.bannerBtnText}>
                    Grant Access
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Pick On Map Banner Instruction */}
        {isPickOnMapMode && (
          <View style={styles.pickModeBanner}>
            <Text variant="caption" color={colors.volt} style={styles.pickModeText}>
              📍 Tap anywhere on the map to set your search origin
            </Text>
          </View>
        )}
      </View>

      {/* 3. FLOATING ACTION BUTTONS */}
      <View style={styles.fabColumn}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            recenter();
            animateToCoords(driverCoords, 0.08);
          }}
          style={styles.fab}
        >
          <Text variant="caption" style={styles.fabIcon}>
            🎯
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. BOTTOM STATION CARDS CAROUSEL */}
      <View
        style={[
          styles.bottomCarouselContainer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        {isStationsLoading ? (
          <View style={styles.loadingWrapper}>
            <SkeletonCard style={styles.carouselSkeleton} />
          </View>
        ) : stations.length === 0 ? (
          /* Edge Case #20: Actionable Empty State */
          <View style={styles.emptyContainer}>
            <EmptyState
              title="No stations in range"
              message={
                filters.reachableOnly
                  ? 'No stations are within your vehicle range. Try widening filters or switching to a 2-wheeler profile.'
                  : 'No charging stations match your active search filters.'
              }
              actionLabel="Reset Filters"
              onAction={() => setFilters(initialFilterState)}
              style={styles.emptyCard}
            />
          </View>
        ) : (
          <FlatList
            ref={carouselRef}
            data={stations}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + spacing.sm}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselList}
            renderItem={({ item, index }) => (
              <StationCard
                station={item}
                isSelected={selectedStationId === item.id}
                onPress={() => handleSelectStation(item, index)}
                onViewDetails={() => handleViewDetails(item.id)}
                onCompareRoute={() => handleCompareRoute(item.id)}
                style={styles.stationCard}
              />
            )}
          />
        )}
      </View>

      {/* 5. FILTER BOTTOM SHEET */}
      <FilterSheet
        visible={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        onReset={() => setFilters(initialFilterState)}
      />
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
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: spacing.base,
    right: spacing.base,
    zIndex: 20,
    gap: spacing.sm,
  },
  topBadge: {
    alignSelf: 'stretch',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputContainer: {
    flex: 1,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterButton: {
    height: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.e1,
  },
  filterButtonActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  filterBtnText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  locationBanner: {
    backgroundColor: '#FDECE8',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: '#FAC4B8',
    ...shadows.e1,
  },
  locationBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerText: {
    flex: 1,
    fontFamily: 'Manrope_600SemiBold',
  },
  bannerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bannerBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  bannerBtnText: {
    fontFamily: 'Manrope_700Bold',
  },
  pickModeBanner: {
    backgroundColor: colors.grid900,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    ...shadows.e2,
  },
  pickModeText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  originMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 184, 201, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.volt,
  },
  originMarkerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.volt,
  },
  fabColumn: {
    position: 'absolute',
    right: spacing.base,
    bottom: 230,
    zIndex: 20,
    gap: spacing.sm,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.e2,
  },
  fabIcon: {
    fontSize: 18,
  },
  bottomCarouselContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  carouselList: {
    paddingHorizontal: spacing.base,
    gap: spacing.sm,
  },
  stationCard: {
    width: CARD_WIDTH,
  },
  loadingWrapper: {
    paddingHorizontal: spacing.base,
  },
  carouselSkeleton: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
  },
  emptyContainer: {
    paddingHorizontal: spacing.base,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.e1,
    paddingVertical: spacing.lg,
  },
});
