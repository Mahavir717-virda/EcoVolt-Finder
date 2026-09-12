import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { StationSummary } from '@contracts/types';
import { Text, EmptyState, SkeletonCard, Chip } from '../../components';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { StationCard } from '../../components/ui/StationCard';

export const SavedScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Fetch stations
  const stationsQuery = useQuery<StationSummary[]>({
    queryKey: ['stations'],
    queryFn: async () => {
      try {
        const res = await http.get<StationSummary[]>('/stations');
        return res;
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  const stations = stationsQuery.data || [];

  // Filter saved stations
  const savedStations = stations.filter((s) => {
    const isSaved = savedIds.includes(s.id);
    if (!isSaved) return false;
    if (!searchQuery.trim()) return true;
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.operatorName && s.operatorName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleToggleBookmark = (stationId: string) => {
    setSavedIds((prev) =>
      prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + 100, // accommodate floating capsule tab bar
          },
        ]}
      >
        {/* Header Title */}
        <View style={styles.header}>
          <View style={styles.headerTitleCol}>
            <View style={styles.badgeRow}>
              <Text variant="screenTitle" style={styles.title}>
                Saved Stations
              </Text>
              <Chip
                label={`${savedStations.length} HUBS`}
                variant="subtle"
                color={colors.brand}
                backgroundColor={colors.brandTint}
              />
            </View>
            <Text variant="caption" color={colors.ink2}>
              Quick access to your favorite clean-energy charging spots
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.ink3} />
          <TextInput
            placeholder="Search saved charging hubs..."
            placeholderTextColor={colors.ink3}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.ink3} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Highlights Pill */}
        <View style={styles.highlightBanner}>
          <View style={styles.highlightIcon}>
            <Ionicons name="leaf" size={20} color={colors.brand} />
          </View>
          <View style={styles.highlightTextCol}>
            <Text variant="cardTitle" style={styles.highlightTitle}>
              High Renewable Priority
            </Text>
            <Text variant="micro" color={colors.ink2}>
              Your saved hubs average ~78% solar & wind power mix
            </Text>
          </View>
        </View>

        {/* Stations List */}
        {stationsQuery.isLoading ? (
          <View style={styles.skeletonGroup}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : savedStations.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'No Matching Saved Stations' : 'No Saved Stations Yet'}
            message={
              searchQuery
                ? 'Try a different search term.'
                : 'Bookmark stations from the Map or Station Details to access them instantly here.'
            }
            actionLabel="Explore Map"
            onAction={() => navigation.navigate('DriverTabs', { screen: 'Home' as any })}
            style={styles.emptyBox}
          />
        ) : (
          <View style={styles.stationsList}>
            {savedStations.map((station) => {
              const totalConnectors = station.connectors?.length || 4;
              const availableCount =
                station.connectors?.filter((c) => (c as any).available !== false).length ||
                totalConnectors;

              return (
                <StationCard
                  key={station.id}
                  id={station.id}
                  name={station.name}
                  address={station.operatorName || 'EcoVolt Certified Clean Hub'}
                  rating={4.8}
                  reviewCount={36}
                  distance="1.4 km"
                  eta="5 min"
                  available={availableCount > 0}
                  availableLabel={`${availableCount}/${totalConnectors} Plugs Available`}
                  chargerCount={totalConnectors}
                  connectors={station.connectors?.map((c) => ({
                    type: c.type,
                    icon: '⚡',
                  }))}
                  onPress={() =>
                    navigation.navigate('StationDetail', { stationId: station.id })
                  }
                  onBook={() =>
                    navigation.navigate('BookingConfirm', { stationId: station.id })
                  }
                  onBookmark={() => handleToggleBookmark(station.id)}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  headerTitleCol: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'Manrope_700Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    color: colors.ink,
    padding: 0,
  },
  highlightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandTint,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand + '30',
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlightTextCol: {
    flex: 1,
    gap: 2,
  },
  highlightTitle: {
    fontFamily: 'Manrope_700Bold',
    color: colors.ink,
    fontSize: 14,
  },
  skeletonGroup: {
    gap: spacing.base,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    paddingVertical: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  stationsList: {
    gap: spacing.base,
  },
});
