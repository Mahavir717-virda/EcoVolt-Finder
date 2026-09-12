/**
 * Explore Screen - All Stations List
 * Displays all charging stations with search and filter
 */

import { EmptyState } from '@/components/common';
import { colors } from '@/constants/colors';
import { useStations } from '@/hooks/useStations';
import { spacing } from '@/styles/spacing';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ExploreScreen() {
  const router = useRouter();
  const { stations, loading, refresh, search } = useStations({ autoFetch: true });
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Filter stations based on search query
  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    
    const query = searchQuery.toLowerCase();
    return stations.filter(station => 
      station.name.toLowerCase().includes(query) ||
      station.city.toLowerCase().includes(query) ||
      station.address.toLowerCase().includes(query)
    );
  }, [stations, searchQuery]);

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
    if (text.trim()) {
      search(text);
    } else {
      refresh();
    }
  };

  const renderStationCard = ({ item: station }: { item: typeof stations[0] }) => (
    <TouchableOpacity
      style={styles.stationCard}
      onPress={() => handleStationPress(station.id)}
      activeOpacity={0.7}
    >
      <View style={styles.stationIconContainer}>
        <Ionicons name="flash" size={28} color={colors.primary[500]} />
      </View>
      <View style={styles.stationInfo}>
        <Text style={styles.stationName} numberOfLines={1}>{station.name}</Text>
        <Text style={styles.stationAddress} numberOfLines={1}>
          {station.address}, {station.city}
        </Text>
        <View style={styles.stationMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="flash-outline" size={14} color={colors.status.success} />
            <Text style={styles.metaText}>
              {station.available_chargers}/{station.total_chargers} available
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="star" size={14} color={colors.accent[500]} />
            <Text style={styles.metaText}>{station.rating?.toFixed(1) || 'N/A'}</Text>
          </View>
        </View>
      </View>
      <View style={styles.stationArrow}>
        <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Explore Stations</Text>
        <Text style={styles.subtitle}>
          {filteredStations.length} stations found
        </Text>
      </View>

      {/* Search Bar */}
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
      </View>

      {/* Stations List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading stations...</Text>
        </View>
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
              description={searchQuery ? `No stations match "${searchQuery}"` : "No charging stations available"}
              actionLabel={searchQuery ? "Clear Search" : undefined}
              onAction={searchQuery ? () => handleSearch('') : undefined}
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchBar: {
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
    paddingBottom: spacing.xl,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  stationIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationInfo: {
    flex: 1,
    marginLeft: spacing.md,
    gap: 4,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  stationAddress: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.neutral[600],
  },
  stationArrow: {
    marginLeft: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  },
});
