import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { colors, radii, spacing } from '../../theme/tokens';

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
        contentContainerStyle={[styles.scrollContent, { paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
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
            stations.map((item) => (
              <StationCard
                key={item.id}
                id={item.id}
                name={item.name}
                address={(item as any).address || '1693 Alice Court, Annapolis MD...'}
                rating={3.4}
                reviewCount={120}
                distance={`${(item.distanceKm ?? 1.8).toFixed(1)} km`}
                eta={`${Math.round(item.travelMinutes ?? 10)} min`}
                available={true}
                availableLabel="Available"
                chargerCount={item.connectors.length > 0 ? item.connectors.reduce((acc, c) => acc + c.total, 0) : 5}
                connectors={item.connectors.length > 0 ? item.connectors.map(c => ({ type: c.type, icon: '🔌' })) : [{ type: 'ccs2', icon: '🔌' }]}
                onPress={() => handleViewDetails(item.id)}
                onBook={() => handleBook(item.id)}
                onBookmark={() => {}}
                style={styles.stationCard}
              />
            ))
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
    marginBottom: spacing.xl,
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
