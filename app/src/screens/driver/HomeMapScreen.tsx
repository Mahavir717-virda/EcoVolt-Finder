import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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

  const handleViewDetails = (stationId: string) => {
    navigation.navigate('StationDetail', { stationId });
  };

  const handleBook = (stationId: string) => {
    // Navigate directly to Confirm Booking
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
        {/* Title */}
        <Text variant="screenTitle" style={styles.mainTitle}>
          Find near by you EV charger point
        </Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={filters.query}
            onChangeText={(text) => setFilters((prev) => ({ ...prev, query: text }))}
            placeholder="Search station here"
            onFilterPress={() => setIsFilterSheetOpen(true)}
            style={{ flex: 1 }}
          />
        </View>

        {/* Live Quick Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.brand + '15' }]}>
              <Ionicons name="flash" size={18} color={colors.brand} />
            </View>
            <Text style={styles.statValue}>{stats.totalStations}</Text>
            <Text style={styles.statLabel}>Near You</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.brand + '15' }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
            </View>
            <Text style={styles.statValue}>{stats.availableChargers}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.warning + '15' }]}>
              <Ionicons name="trending-down" size={18} color={colors.warning} />
            </View>
            <Text style={styles.statValue}>
              {stats.lowestPrice > 0 ? `₹${stats.lowestPrice.toFixed(1)}` : '--'}
            </Text>
            <Text style={styles.statLabel}>Lowest/kWh</Text>
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

  mainTitle: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: spacing.lg,
    color: colors.ink,
    fontFamily: 'Manrope_700Bold',
  },
  searchContainer: {
    marginBottom: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
    ...shadows.card,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    color: colors.ink,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
    color: colors.ink3,
    textAlign: 'center',
  },
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
