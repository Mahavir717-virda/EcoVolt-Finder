/**
 * Home Screen - Map View
 * Displays charging stations on a map with animations
 */

import { FadeIn, ScaleIn, SlideIn } from '@/components/animations';
import { WebViewMap } from '@/components/map';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useNearbyStations, useStations } from '@/hooks/useStations';
import { spacing } from '@/styles/spacing';
import { formatDistance } from '@/utils/distance';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch stations - use nearby if location available, otherwise all
  const { 
    stations: allStations, 
    loading: loadingAll, 
    refresh: refreshAll,
    search 
  } = useStations({ autoFetch: !location });
  
  const { 
    stations: nearbyStations, 
    loading: loadingNearby, 
    refresh: refreshNearby 
  } = useNearbyStations({
    latitude: location?.coords.latitude || null,
    longitude: location?.coords.longitude || null,
    radiusKm: 15,
    enabled: !!location,
  });

  // Use nearby stations if available, otherwise all stations
  const stations = useMemo(() => {
    if (location && nearbyStations.length > 0) {
      return nearbyStations;
    }
    return allStations;
  }, [location, nearbyStations, allStations]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalStations = stations.length;
    const availableChargers = stations.reduce((acc, s) => acc + (s.available_chargers || 0), 0);
    // Default lowest price in INR for Indian EV charging
    const lowestPrice = 9; // ₹9/kWh is typical lowest price in India
    
    return { totalStations, availableChargers, lowestPrice };
  }, [stations]);

  const stationsLoading = loadingAll || loadingNearby;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoadingLocation(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation);
      } catch (error) {
        console.log('Location error:', error);
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const handleStationPress = (stationId: string) => {
    router.push(`/station/${stationId}`);
  };

  const handleFilterPress = () => {
    router.push('/modal/filters');
  };

  const handleMarkerPress = (stationId: string) => {
    // Navigate to station details when marker is pressed
    router.push(`/station/${stationId}`);
  };

  const userLocation = location
    ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
          </Text>
          <Text style={styles.subtitle}>Find your nearest charging station</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.neutral[700]} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar}>
        <Ionicons name="search" size={20} color={colors.neutral[400]} />
        <Text style={styles.searchPlaceholder}>Search stations, locations...</Text>
        <TouchableOpacity onPress={handleFilterPress} style={styles.filterButton}>
          <Ionicons name="options-outline" size={20} color={colors.primary[500]} />
        </TouchableOpacity>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Map View with Animations */}
        <ScaleIn delay={100} duration={400}>
          <View style={styles.mapContainer}>
            {loadingLocation ? (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
                <Text style={styles.mapLoadingText}>Getting your location...</Text>
              </View>
            ) : (
              <WebViewMap
                stations={stations.map(s => ({
                  id: s.id,
                  name: s.name,
                  latitude: s.latitude,
                  longitude: s.longitude,
                  availableChargers: s.available_chargers || 0,
                  totalChargers: s.total_chargers || 0,
                }))}
                userLocation={userLocation}
                onMarkerPress={handleMarkerPress}
              />
            )}
          </View>
        </ScaleIn>

        {/* Quick Stats with Slide Animation */}
        <SlideIn direction="bottom" delay={200} duration={400}>
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="flash" size={20} color={colors.primary[500]} />
              <Text style={styles.statValue}>{stats.totalStations}</Text>
              <Text style={styles.statLabel}>Nearby</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.statValue}>{stats.availableChargers}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trending-down" size={20} color={colors.accent[500]} />
              <Text style={styles.statValue}>₹{stats.lowestPrice.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Lowest/kWh</Text>
            </View>
            </View>
          </View>
        </SlideIn>

        {/* Nearby Stations List with Fade Animation */}
        <FadeIn delay={400} duration={500}>
          <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Nearby Stations</Text>
            <TouchableOpacity onPress={() => router.push('/explore')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {stationsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Loading stations...</Text>
            </View>
          ) : stations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="flash-off-outline" size={48} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>No stations found nearby</Text>
            </View>
          ) : (
            stations.slice(0, 5).map((station) => (
              <TouchableOpacity
                key={station.id}
                style={styles.stationCard}
                onPress={() => handleStationPress(station.id)}
                activeOpacity={0.7}
              >
                <View style={styles.stationIconContainer}>
                  <Ionicons name="flash" size={24} color={colors.primary[500]} />
                </View>
                <View style={styles.stationInfo}>
                  <Text style={styles.stationName}>{station.name}</Text>
                  <Text style={styles.stationAddress} numberOfLines={1}>
                    {station.address}
                  </Text>
                  <View style={styles.stationMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="location" size={14} color={colors.neutral[400]} />
                      <Text style={styles.metaText}>
                        {(station as any).distance ? formatDistance((station as any).distance) : station.city}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="flash" size={14} color={colors.neutral[400]} />
                      <Text style={styles.metaText}>
                        {station.available_chargers || 0} available
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.stationStatus}>
                  <Text style={[
                    styles.availabilityText,
                    (station.available_chargers || 0) > 0 ? styles.available : styles.unavailable
                  ]}>
                    {station.available_chargers || 0}/{station.total_chargers || 0}
                  </Text>
                  <Text style={styles.availabilityLabel}>Available</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
                </View>
              </TouchableOpacity>
            ))
          )}
          </View>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.screenPadding,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.inputPadding,
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    color: colors.neutral[400],
  },
  filterButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    height: 200,
    borderRadius: spacing.radius.lg,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoading: {
    height: 200,
    backgroundColor: colors.neutral[200],
    borderRadius: spacing.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  markerSelected: {
    backgroundColor: colors.accent[500],
    transform: [{ scale: 1.2 }],
  },
  statsContainer: {
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: spacing.radius.md,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  listContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '500',
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  stationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  stationAddress: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  stationMeta: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  stationStatus: {
    alignItems: 'flex-end',
  },
  availabilityText: {
    fontSize: 16,
    fontWeight: '700',
  },
  available: {
    color: colors.success,
  },
  unavailable: {
    color: colors.error,
  },
  availabilityLabel: {
    fontSize: 11,
    color: colors.neutral[400],
    marginBottom: spacing.xs,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[400],
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
