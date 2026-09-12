/**
 * Home Screen - Map View
 * Displays charging stations on a map with animations
 */

import { FadeIn, ScaleIn, SlideIn } from '@/components/animations';
import { WebViewMap } from '@/components/map';
import { StationCard } from '@/components/station';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useNearbyStations, useStations } from '@/hooks/useStations';
import { useUserLocation } from '@/hooks/useUserLocation';
import { getLiveGridSnapshot, greennessColor, greennessBandLabel } from '@/lib/gridData';
import { spacing } from '@/styles/spacing';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Reliable location hook with instant cache and fallback
  const {
    coords: userCoords,
    isLoading: loadingLocation,
    isFallback,
    refreshLocation,
  } = useUserLocation();

  // Always fetch all stations
  const { 
    stations: allStations, 
    loading: loadingAll, 
    refresh: refreshAll,
  } = useStations({ autoFetch: true });
  
  // Calculate nearby stations from coordinates
  const { 
    stations: nearbyStations, 
    loading: loadingNearby, 
    refresh: refreshNearby 
  } = useNearbyStations({
    latitude: userCoords.latitude,
    longitude: userCoords.longitude,
    radiusKm: 35,
    enabled: true,
  });

  // Use nearby stations if available, otherwise all stations
  const stations = useMemo(() => {
    if (nearbyStations && nearbyStations.length > 0) {
      return nearbyStations;
    }
    return allStations;
  }, [nearbyStations, allStations]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalStations = stations.length;
    const availableChargers = stations.reduce((acc, s) => acc + (s.available_chargers || 0), 0);
    // Default lowest price in INR for Indian EV charging
    const lowestPrice = 9; // ₹9/kWh is typical lowest price in India
    
    return { totalStations, availableChargers, lowestPrice };
  }, [stations]);

  const stationsLoading = (loadingAll || loadingNearby) && stations.length === 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshAll(), refreshNearby(), refreshLocation()]);
    setRefreshing(false);
  };

  const handleStationPress = (stationId: string) => {
    router.push(`/station/${stationId}`);
  };

  const handleFilterPress = () => {
    router.push('/modal/filters');
  };

  const handleMarkerPress = (stationId: string) => {
    router.push(`/station/${stationId}`);
  };

  const userLocation = useMemo(() => ({
    latitude: userCoords.latitude,
    longitude: userCoords.longitude,
  }), [userCoords.latitude, userCoords.longitude]);

  // Live grid snapshot (mock data, mirrors ML service)
  const liveGrid = useMemo(() => getLiveGridSnapshot('IN-WE'), []);
  const gridColor = greennessColor(liveGrid.renewablePct);
  const gridBandLabel = greennessBandLabel(liveGrid.band);

  // Breakdown pct for display
  const breakdownTotal = Object.values(liveGrid.breakdown).reduce((a, b) => a + b, 0);
  const bkd = liveGrid.breakdown;
  const solarPct = breakdownTotal > 0 ? Math.round((bkd.solar / breakdownTotal) * 100) : 0;
  const windPct = breakdownTotal > 0 ? Math.round((bkd.wind / breakdownTotal) * 100) : 0;
  const hydroPct = breakdownTotal > 0 ? Math.round((bkd.hydro / breakdownTotal) * 100) : 0;
  const coalPct = breakdownTotal > 0 ? Math.round(((bkd.coal + bkd.gas) / breakdownTotal) * 100) : 0;

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

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary[500]]} />
        }
      >
        {/* ── Live Grid Banner ── */}
        <View style={styles.gridBanner}>
          <View style={styles.gridBannerTop}>
            <View style={styles.gridBannerLeft}>
              <View style={[styles.liveIndicator, { backgroundColor: '#0FB8C9' }]} />
              <Text style={styles.gridBannerZone}>{liveGrid.zoneName}</Text>
            </View>
            <View style={[styles.gridBandBadge, { backgroundColor: gridColor + '20', borderColor: gridColor + '40' }]}>
              <Text style={[styles.gridBandText, { color: gridColor }]}>{gridBandLabel}</Text>
            </View>
          </View>

          {/* Big renewable number + bar */}
          <View style={styles.gridMainRow}>
            <View>
              <Text style={[styles.gridPct, { color: gridColor }]}>{liveGrid.renewablePct.toFixed(0)}%</Text>
              <Text style={styles.gridPctLabel}>Renewable now</Text>
            </View>
            <View style={styles.gridStats}>
              <Text style={styles.gridStatLine}>
                <Text style={styles.gridStatLabel}>Carbon  </Text>
                <Text style={styles.gridStatValue}>{liveGrid.carbonIntensity} g CO₂/kWh</Text>
              </Text>
              <Text style={styles.gridStatLine}>
                <Text style={styles.gridStatLabel}>Carbon-free  </Text>
                <Text style={styles.gridStatValue}>{liveGrid.carbonFreePct.toFixed(0)}%</Text>
              </Text>
            </View>
          </View>

          {/* Stacked bar */}
          <View style={styles.gridBar}>
            {solarPct > 0 && <View style={[styles.gridBarSegment, { flex: solarPct, backgroundColor: '#F59E0B' }]} />}
            {windPct > 0 && <View style={[styles.gridBarSegment, { flex: windPct, backgroundColor: '#0FB8C9' }]} />}
            {hydroPct > 0 && <View style={[styles.gridBarSegment, { flex: hydroPct, backgroundColor: '#3B82F6' }]} />}
            {coalPct > 0 && <View style={[styles.gridBarSegment, { flex: coalPct, backgroundColor: '#6B7280' }]} />}
            {(100 - solarPct - windPct - hydroPct - coalPct) > 0 && (
              <View style={[styles.gridBarSegment, { flex: 100 - solarPct - windPct - hydroPct - coalPct, backgroundColor: '#A3B18A' }]} />
            )}
          </View>

          {/* Legend */}
          <View style={styles.gridLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Solar {solarPct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0FB8C9' }]} />
              <Text style={styles.legendText}>Wind {windPct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Hydro {hydroPct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6B7280' }]} />
              <Text style={styles.legendText}>Coal+Gas {coalPct}%</Text>
            </View>
          </View>
        </View>

        {/* Fallback Location Notice if GPS pending or permission not given */}
        {isFallback && (
          <TouchableOpacity 
            style={styles.fallbackNotice}
            onPress={refreshLocation}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate-circle-outline" size={16} color={colors.primary[500]} />
            <Text style={styles.fallbackNoticeText}>
              Showing Ahmedabad EV Hub • Tap to locate me
            </Text>
          </TouchableOpacity>
        )}

        {/* Map View with Animations */}
        <ScaleIn delay={100} duration={400}>
          <View style={styles.mapContainer}>
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
              <StationCard
                key={station.id}
                station={station}
                distance={(station as any).distance ?? undefined}
                onPress={() => handleStationPress(station.id)}
              />
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
  fallbackNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary[50],
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.radius.full,
  },
  fallbackNoticeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.primary[700],
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

  // ── Grid Live Banner ───────────────────────────────────────────────────
  gridBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: '#08150F',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0E2018',
  },
  gridBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gridBannerZone: {
    fontSize: 12,
    color: '#8A998F',
    fontWeight: '500',
  },
  gridBandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  gridBandText: {
    fontSize: 11,
    fontWeight: '600',
  },
  gridMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  gridPct: {
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 46,
  },
  gridPctLabel: {
    fontSize: 11,
    color: '#8A998F',
    fontWeight: '500',
    marginTop: 2,
  },
  gridStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  gridStatLine: {
    flexDirection: 'row',
  },
  gridStatLabel: {
    fontSize: 12,
    color: '#4C5C54',
  },
  gridStatValue: {
    fontSize: 12,
    color: '#8A998F',
    fontWeight: '500',
  },
  gridBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#0E2018',
  },
  gridBarSegment: {
    height: '100%',
  },
  gridLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#8A998F',
    fontWeight: '500',
  },
});
