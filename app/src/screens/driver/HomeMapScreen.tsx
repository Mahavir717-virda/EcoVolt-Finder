import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { DriverStackParamList } from '../../navigation/types';
import {
  useDriverLocation,
  useNearbyStations,
  initialFilterState,
  StationFilterState,
  FilterSheet,
} from '../../features/stations';
import { useAuthStore } from '../../features/auth/authStore';
import { useVehiclesStore } from '../../features/vehicles/vehiclesStore';
import {
  Text,
  SearchBar,
  SkeletonCard,
  EmptyState,
  StationCard,
} from '../../components';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

export const HomeMapScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();

  // Auth & Vehicle hooks
  const { user } = useAuthStore();
  const { vehicles, getActiveVehicle, hydrate: hydrateVehicles } = useVehiclesStore();

  useEffect(() => {
    hydrateVehicles();
  }, [hydrateVehicles]);

  const activeVehicle = getActiveVehicle() || vehicles[0] || null;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Driver';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Quick Filter State
  type QuickFilterKey = 'all' | 'fast' | 'available' | 'green' | 'cheapest';
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>('all');

  // Filters State
  const [filters, setFilters] = useState<StationFilterState>(initialFilterState);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Hooks
  const { coords: driverCoords } = useDriverLocation();
  const {
    stations,
    isLoading: isStationsLoading,
  } = useNearbyStations({
    driverCoords,
    filters,
  });

  // Dynamic live stats calculated from active nearby stations
  const stats = useMemo(() => {
    const totalStations = stations.length;
    const availableChargers = stations.reduce((acc, s) => {
      const avail = s.connectors?.reduce(
        (cAcc, c) => cAcc + (c.available ?? (c as any).availableCount ?? 0),
        0
      ) ?? 0;
      return acc + avail;
    }, 0);
    const prices = stations
      .map((s) => s.priceFrom)
      .filter((p): p is number => typeof p === 'number' && p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return { totalStations, availableChargers, lowestPrice };
  }, [stations]);

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(filters.query) ||
      filters.connectorTypes.length > 0 ||
      filters.minPowerKw !== null ||
      filters.reachableOnly ||
      filters.sortBy !== 'trueCost'
    );
  }, [filters]);

  const handleQuickFilter = (key: QuickFilterKey) => {
    if (quickFilter === key && key !== 'all') {
      setQuickFilter('all');
      setFilters(initialFilterState);
      return;
    }
    setQuickFilter(key);
    switch (key) {
      case 'fast':
        setFilters((prev) => ({ ...prev, minPowerKw: 50 }));
        break;
      case 'available':
        setFilters((prev) => ({ ...prev, reachableOnly: true }));
        break;
      case 'green':
        setFilters((prev) => ({ ...prev, sortBy: 'greenest' }));
        break;
      case 'cheapest':
        setFilters((prev) => ({ ...prev, sortBy: 'trueCost' }));
        break;
      case 'all':
      default:
        setFilters(initialFilterState);
        break;
    }
  };

  const handleViewDetails = (stationId: string) => {
    navigation.navigate('StationDetail', { stationId });
  };

  const handleBook = (stationId: string) => {
    navigation.navigate('BookingConfirm', {
      stationId,
      connectorType: 'ccs2',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingTop: insets.top + spacing.sm, 
            paddingBottom: insets.bottom + 100 
          }
        ]}
      >
        {/* 1. Top Identity & Status Bar */}
        <View style={styles.topIdentityBar}>
          <View style={styles.brandLocationBlock}>
            <View style={styles.brandRow}>
              <Image
                source={require('../../../assets/images/ecovolt-logo.png')}
                style={styles.logoMark}
                resizeMode="contain"
              />
              <View>
                <Text style={styles.greetingText}>
                  Hello, {firstName} 👋
                </Text>
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  style={styles.locationPill}
                  onPress={() => setIsFilterSheetOpen(true)}
                >
                  <Ionicons name="location-sharp" size={11} color={colors.brand} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    Ahmedabad, Gujarat
                  </Text>
                  <Ionicons name="chevron-down" size={10} color={colors.ink3} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.topActionsRow}>
            {/* Active EV Chip */}
            {activeVehicle && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Vehicles')}
                style={styles.activeVehicleChip}
              >
                <Ionicons name="car-sport" size={12} color={colors.brand} />
                <Text style={styles.vehicleChipText} numberOfLines={1}>
                  {activeVehicle.model?.split(' ')[0] || 'EV'} • {activeVehicle.currentChargePct ?? 68}%
                </Text>
              </TouchableOpacity>
            )}

            {/* Notification Alert Bell */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.iconCircleBtn}
              onPress={() => navigation.navigate('Impact')}
            >
              <Ionicons name="notifications-outline" size={18} color={colors.ink} />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={filters.query}
            onChangeText={(text) => setFilters((prev) => ({ ...prev, query: text }))}
            placeholder="Search stations, hubs, or areas…"
            onFilterPress={() => setIsFilterSheetOpen(true)}
            hasActiveFilters={hasActiveFilters}
            style={{ flex: 1 }}
          />
        </View>

        {/* 5. Quick Filter Category Pills (Horizontal Scroll) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersScroll}
          style={styles.quickFiltersContainer}
        >
          {[
            { key: 'all' as const, label: 'All', icon: 'apps-outline' as const },
            { key: 'fast' as const, label: 'Fast DC (50kW+)', icon: 'flash' as const },
            { key: 'available' as const, label: 'Available Now', icon: 'checkmark-circle' as const },
            { key: 'green' as const, label: 'Green Peak', icon: 'leaf' as const },
            { key: 'cheapest' as const, label: 'Lowest Tariff', icon: 'trending-down' as const },
          ].map((item) => {
            const isActive = quickFilter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.8}
                onPress={() => handleQuickFilter(item.key)}
                style={[
                  styles.quickFilterPill,
                  isActive && styles.quickFilterPillActive,
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={13}
                  color={isActive ? '#FFFFFF' : colors.ink2}
                />
                <Text
                  style={[
                    styles.quickFilterLabel,
                    isActive && styles.quickFilterLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 6. Live Quick Stats Strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statItem}>
            <View style={styles.statIconBadge}>
              <Ionicons name="flash" size={16} color={colors.brand} />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.totalStations}</Text>
              <Text style={styles.statLabel}>Stations Near</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBadge, { backgroundColor: '#E7F7EC' }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.availableChargers}</Text>
              <Text style={styles.statLabel}>Plugs Free</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBadge, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="trending-down" size={16} color={colors.warning} />
            </View>
            <View>
              <Text style={styles.statValue}>
                {stats.lowestPrice > 0 ? `₹${stats.lowestPrice.toFixed(1)}` : '₹12.0'}
              </Text>
              <Text style={styles.statLabel}>Best Tariff</Text>
            </View>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text variant="sectionLabel" color={colors.ink}>Nearby You</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Text variant="caption" color={colors.ink3}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* List of Stations */}
        <View style={styles.listContainer}>
          {isStationsLoading ? (
            <View style={styles.loadingWrapper}>
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : stations.length === 0 ? (
            <EmptyState
              title="No stations found"
              message="Try widening your search filters."
              actionLabel="Reset Filters"
              onAction={() => setFilters(initialFilterState)}
            />
          ) : (
            stations.map((item) => {
              const availableCount = item.connectors.reduce(
                (acc, c) => acc + (c.available ?? (c as any).availableCount ?? 0),
                0
              );
              const totalCount = item.connectors.reduce(
                (acc, c) => acc + (c.total ?? (c as any).totalCount ?? 0),
                0
              );
              const isAvailable = availableCount > 0;

              return (
                <StationCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  address={(item as any).address || `${item.operatorName || 'Green Grid'}, Ahmedabad`}
                  rating={4.8}
                  reviewCount={24}
                  distance={`${(item.distanceKm ?? 1.8).toFixed(1)} km`}
                  eta={`${Math.round(item.travelMinutes ?? 10)} min`}
                  available={isAvailable}
                  availableLabel={isAvailable ? `${availableCount} Available` : 'Full'}
                  chargerCount={totalCount > 0 ? totalCount : 4}
                  connectors={
                    item.connectors.length > 0
                      ? item.connectors.map((c) => ({
                          type: c.type.toUpperCase(),
                          icon: '🔌',
                        }))
                      : [{ type: 'CCS2', icon: '🔌' }]
                  }
                  onPress={() => handleViewDetails(item.id)}
                  onBook={() => handleBook(item.id)}
                  onBookmark={() => {}}
                  style={styles.stationCard}
                />
              );
            })
          )}
        </View>

      </ScrollView>

      {/* Filter Bottom Sheet */}
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
  scrollContent: {
    paddingHorizontal: spacing.base,
  },

  /* 1. Top Identity Bar */
  topIdentityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingTop: 2,
  },
  brandLocationBlock: {
    gap: 3,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoMark: {
    width: 32,
    height: 37,
  },
  greetingText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  locationText: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    color: colors.ink2,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeVehicleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#14181A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  vehicleChipText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 11.5,
    color: colors.ink,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#14181A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.brand,
    borderWidth: 1,
    borderColor: colors.surface,
  },

  /* 4. Search Bar */
  searchContainer: {
    marginBottom: spacing.sm,
  },

  /* 5. Quick Filter Category Pills */
  quickFiltersContainer: {
    marginBottom: spacing.md,
  },
  quickFiltersScroll: {
    gap: spacing.sm,
    paddingRight: spacing.base,
    paddingVertical: 3,
  },
  quickFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#14181A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickFilterPillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  quickFilterLabel: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11.5,
    color: colors.ink,
  },
  quickFilterLabelActive: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },

  /* 6. Live Quick Stats Strip */
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    shadowColor: '#14181A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 14.5,
    fontFamily: 'Manrope_700Bold',
    color: colors.ink,
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 10.5,
    fontFamily: 'Manrope_500Medium',
    color: colors.ink3,
    lineHeight: 13,
  },
  statDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },

  /* Section Header & List */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  listContainer: {
    gap: spacing.md,
  },
  loadingWrapper: {
    gap: spacing.md,
  },
  stationCard: {
    width: '100%',
  },
});
