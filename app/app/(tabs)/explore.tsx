/**
 * Explore Screen - All Stations List
 * Displays all charging stations with search and filter
 */

import { EmptyState } from '@/components/common';
import { StationCard } from '@/components/station';
import { StationListSkeleton } from '@/components/ui';
import { colors } from '@/constants/colors';
import { applyFiltersToStations, useFilters } from '@/hooks/useFilters';
import { useFavorites } from '@/hooks/useFavorites';
import { useStations } from '@/hooks/useStations';
import { useUserLocation } from '@/hooks/useUserLocation';
import { spacing } from '@/styles/spacing';
import { calculateDistance } from '@/utils/distance';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  const router = useRouter();
  const { coords: userCoords } = useUserLocation();
  const { stations, loading, refresh, search } = useStations({ autoFetch: true, userCoords });
  const { filters, activeFiltersCount, resetFilters } = useFilters();
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Compute dynamic distance, apply global filters, text search, and sort
  const filteredStations = useMemo(() => {
    // Step 1: compute dynamic GPS distance for all stations
    const withDistance = (stations || []).map((station) => {
      let distance: number | undefined = station.distance;
      if (userCoords?.latitude && userCoords?.longitude && station.latitude && station.longitude) {
        distance = calculateDistance(
          { latitude: userCoords.latitude, longitude: userCoords.longitude },
          { latitude: station.latitude, longitude: station.longitude }
        );
      }
      return {
        ...station,
        distance,
      };
    });

    // Step 2: apply global filters (distance threshold, charger types, connectors, price, amenities, available)
    const afterFilters = applyFiltersToStations(withDistance as any[], filters) as (typeof stations[0] & { distance?: number })[];

    // Step 3: apply text search on top
    let result = afterFilters;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(station =>
        station.name.toLowerCase().includes(query) ||
        station.city.toLowerCase().includes(query) ||
        station.address.toLowerCase().includes(query)
      );
    }

    // Step 4: sort nearest first
    return result.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });
  }, [stations, filters, searchQuery, userCoords]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleStationPress = (stationId: string) => {
    router.push(`/station/${stationId}`);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleFilterPress = () => {
    router.push('/modal/filters');
  };

  const renderStationCard = ({ item: station }: { item: typeof stations[0] & { distance?: number } }) => {
    return (
      <StationCard
        station={station}
        distance={station.distance}
        isSaved={isFavorited(station.id)}
        onSave={() => toggleFavorite(station.id)}
        onPress={() => handleStationPress(station.id)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Explore Stations</Text>
          <Text style={styles.subtitle}>
            {loading && !refreshing && filteredStations.length === 0
              ? 'Finding available charging stations...'
              : `${filteredStations.length} stations found`}
          </Text>
        </View>
      </View>

      {/* Search Bar + Filter Button */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stations, city..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter icon button */}
        <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
          <Ionicons
            name="options-outline"
            size={22}
            color={activeFiltersCount > 0 ? colors.primary[500] : colors.neutral[500]}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filters pill */}
      {activeFiltersCount > 0 && (
        <View style={styles.activeFilterRow}>
          <Text style={styles.activeFilterText}>
            {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
          </Text>
          <TouchableOpacity onPress={resetFilters} style={styles.clearFiltersBtn}>
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stations List */}
      {loading && !refreshing && filteredStations.length === 0 ? (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <StationListSkeleton count={4} />
        </ScrollView>
      ) : (
        <FlatList
          data={filteredStations}
          keyExtractor={(item) => item.id}
          renderItem={renderStationCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="flash-off-outline"
              title="No Stations Found"
              description={
                searchQuery
                  ? `No stations match "${searchQuery}"`
                  : activeFiltersCount > 0
                  ? 'No stations match your filters'
                  : 'No charging stations available'
              }
              actionLabel={activeFiltersCount > 0 ? 'Clear Filters' : searchQuery ? 'Clear Search' : undefined}
              onAction={
                activeFiltersCount > 0
                  ? resetFilters
                  : searchQuery
                  ? () => handleSearch('')
                  : undefined
              }
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[800],
    paddingVertical: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  activeFilterText: {
    fontSize: 13,
    color: colors.primary[700],
    fontWeight: '500',
  },
  clearFiltersBtn: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  clearFiltersText: {
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 110,
  },
  separator: {
    height: spacing.sm,
  },
});
