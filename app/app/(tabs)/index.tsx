/**
 * Home Screen - Map View
 * Displays charging stations on a map with animations
 */

import { FadeIn, ScaleIn, SlideIn } from '@/components/animations';
import { WebViewMap } from '@/components/map';
import { StationCard } from '@/components/station';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { applyFiltersToStations, useFilters } from '@/hooks/useFilters';
import { useFavorites } from '@/hooks/useFavorites';
import { useNearbyStations, useStations } from '@/hooks/useStations';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useLiveGrid } from '@/hooks/useLiveGrid';
import { getLiveGridSnapshot, greennessColor, greennessBandLabel } from '@/lib/gridData';
import { spacing } from '@/styles/spacing';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  evaluateNearbySavings,
  getNotificationHistory,
  AppNotification,
} from '@/services/notifications.service';
import { calculateDistance } from '@/utils/distance';
import { getGamificationProfile } from '@/services/gamification.service';


export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { colors: themeColors, isDark } = useTheme();
  const { t } = useLanguage();
  const { filters, activeFiltersCount } = useFilters();
  const { isFavorited, toggle: toggleFavorite } = useFavorites();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [gamification, setGamification] = useState<{
    score: number;
    rank: number;
    streak: number;
    tier: string;
  } | null>(null);
  const [activeDeal, setActiveDeal] = useState<{
    stationId: string;
    stationName: string;
    savingsInr: number;
    availableChargers: number;
    distanceKm: number;
  } | null>(null);


  // Reliable location hook with instant cache and fallback
  const {
    coords: userCoords,
    isLoading: loadingLocation,
    isFallback,
    refreshLocation,
  } = useUserLocation();

  // Always fetch all stations enriched with user location
  const { 
    stations: allStations, 
    loading: loadingAll, 
    refresh: refreshAll,
  } = useStations({ autoFetch: true, userCoords });
  
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

  // Use all stations or nearby stations, enrich with live GPS distance, then apply all filters
  const stations = useMemo(() => {
    const sourceStations = (allStations && allStations.length > 0) ? allStations : (nearbyStations || []);

    // 1. Compute dynamic Haversine distance for every station from live GPS userCoords
    const withDistance = sourceStations.map((st) => {
      let dist: number | undefined = st.distance;
      if (userCoords?.latitude && userCoords?.longitude && st.latitude && st.longitude) {
        dist = calculateDistance(
          { latitude: userCoords.latitude, longitude: userCoords.longitude },
          { latitude: st.latitude, longitude: st.longitude }
        );
      }
      return {
        ...st,
        distance: dist,
      };
    });

    // 2. Apply global filters (distance threshold, charger types, connector types, price, availability, amenities)
    const filtered = applyFiltersToStations(withDistance as any[], filters) as (typeof allStations[0] & { distance?: number })[];

    // 3. Sort nearest first
    return filtered.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });
  }, [allStations, nearbyStations, filters, userCoords]);

  // Calculate stats dynamically from live stations
  const stats = useMemo(() => {
    const totalStations = stations.length;
    const availableChargers = stations.reduce((acc, s) => {
      const connAvail = (s as any).connectors?.reduce(
        (cAcc: number, c: any) => cAcc + (c.available ?? c.availableCount ?? 0),
        0
      );
      const avail = typeof connAvail === 'number' && connAvail > 0 
        ? connAvail 
        : (s.available_chargers ?? 0);
      return acc + avail;
    }, 0);
    
    const prices = stations
      .map((s) => s.price_from ?? (s as any).priceFrom)
      .filter((p): p is number => typeof p === 'number' && p > 0);
    const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
    
    return { totalStations, availableChargers, lowestPrice };
  }, [stations]);

  const checkNotificationsAndDeals = useCallback(async () => {
    try {
      const history = await getNotificationHistory();
      const unread = history.filter((n) => !n.isRead).length;
      setUnreadCount(unread);

      const dealNotif = history.find((n) => n.type === 'smart_savings_alert' && n.data?.stationId);
      if (dealNotif && dealNotif.data && dealNotif.data.stationId) {
        const notifData = dealNotif.data;
        const targetStation = allStations.find(s => s.id === String(notifData.stationId));
        let computedDist = Number(notifData.distanceKm || 1.5);
        if (targetStation && userCoords?.latitude && userCoords?.longitude && targetStation.latitude && targetStation.longitude) {
          computedDist = calculateDistance(
            { latitude: userCoords.latitude, longitude: userCoords.longitude },
            { latitude: targetStation.latitude, longitude: targetStation.longitude }
          );
        }
        setActiveDeal({
          stationId: String(notifData.stationId),
          stationName: String(notifData.stationName || targetStation?.name || 'Nearby Charging Hub'),
          savingsInr: Number(notifData.savingsInr || 100),
          availableChargers: Number(notifData.availableChargers || targetStation?.available_chargers || 3),
          distanceKm: computedDist,
        });
      }

      const gamProfile = await getGamificationProfile();
      if (gamProfile) {
        setGamification({
          score: gamProfile.greenScore,
          rank: gamProfile.rank,
          streak: gamProfile.currentStreak,
          tier: gamProfile.tier,
        });
      }
    } catch {}
  }, [allStations, userCoords]);

  // Live grid snapshot (dynamic from ML service & backend)
  const { liveGrid, isLive, refresh: refreshLiveGrid } = useLiveGrid('IN-WE');
  const gridColor = greennessColor(liveGrid.renewablePct);
  const gridBandLabel = greennessBandLabel(liveGrid.band);

  // Dynamic live sync: on screen focus and every 10s so badge updates across all phones
  useFocusEffect(
    useCallback(() => {
      checkNotificationsAndDeals();
      refreshLiveGrid();
      const interval = setInterval(() => {
        checkNotificationsAndDeals();
        refreshLiveGrid();
      }, 10000);
      return () => clearInterval(interval);
    }, [checkNotificationsAndDeals, refreshLiveGrid])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshAll(), refreshNearby(), refreshLocation(), checkNotificationsAndDeals(), refreshLiveGrid()]);
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

  // Breakdown pct for display
  const breakdownTotal = Object.values(liveGrid.breakdown).reduce((a, b) => a + b, 0);
  const bkd = liveGrid.breakdown;
  const solarPct = breakdownTotal > 0 ? Math.round((bkd.solar / breakdownTotal) * 100) : 0;
  const windPct = breakdownTotal > 0 ? Math.round((bkd.wind / breakdownTotal) * 100) : 0;
  const hydroPct = breakdownTotal > 0 ? Math.round((bkd.hydro / breakdownTotal) * 100) : 0;
  const coalPct = breakdownTotal > 0 ? Math.round(((bkd.coal + bkd.gas) / breakdownTotal) * 100) : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: themeColors.textPrimary }]}>
            {t('home.greeting', 'Hello')}, {profile?.full_name?.split(' ')[0] || 'there'}! 👋
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>{t('home.subtitle', 'Find your nearest charging station')}</Text>
        </View>
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.trophyButton, { backgroundColor: isDark ? '#1F2937' : '#FEF3C7', borderColor: isDark ? '#374151' : '#FDE68A' }]}
            onPress={() => router.push('/leaderboard')}
            activeOpacity={0.7}
          >
            <Ionicons name="trophy" size={20} color="#F59E0B" />
            {gamification && (
              <View style={styles.trophyBadge}>
                <Text style={styles.trophyBadgeText}>#{gamification.rank}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.notificationButton, { backgroundColor: isDark ? '#1F2937' : colors.neutral[100] }]}
            onPress={() => router.push('/modal/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color={themeColors.textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <TouchableOpacity 
        style={[styles.searchBar, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]} 
        onPress={() => router.push('/explore')}
        activeOpacity={0.8}
      >
        <Ionicons name="search" size={20} color={themeColors.textSecondary} />
        <Text style={[styles.searchPlaceholder, { color: themeColors.textSecondary }]}>{t('home.search_placeholder', 'Search stations, locations...')}</Text>
        <TouchableOpacity onPress={handleFilterPress} style={[styles.filterButton, { backgroundColor: isDark ? '#1F2937' : colors.primary[50] }]}>
          <Ionicons name="options-outline" size={20} color={themeColors.primary} />
          {activeFiltersCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: themeColors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[themeColors.primary]} tintColor={themeColors.primary} />
        }
      >
        {/* Dynamic Green Score & Leaderboard Banner */}
        {gamification && (
          <TouchableOpacity
            style={[styles.gamificationBanner, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0' }]}
            onPress={() => router.push('/leaderboard')}
            activeOpacity={0.85}
          >
            <View style={[styles.gamificationIconWrap, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#D1FAE5' }]}>
              <Ionicons name="leaf" size={20} color={themeColors.primary} />
            </View>
            <View style={styles.gamificationInfo}>
              <View style={styles.gamificationTopRow}>
                <Text style={[styles.gamificationScoreText, { color: themeColors.textPrimary }]}>
                  🏆 {gamification.score.toLocaleString()} pts • Rank #{gamification.rank}
                </Text>
                {gamification.streak > 0 && (
                  <View style={styles.gamificationStreakTag}>
                    <Text style={styles.gamificationStreakText}>🔥 {gamification.streak} Streak</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.gamificationSubText, { color: themeColors.textSecondary }]}>
                {gamification.tier} • Tap to view Leaderboard & Badges
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.primary} />
          </TouchableOpacity>
        )}

        {/* Proactive Smart Savings Deal Banner */}
        {activeDeal && (
          <TouchableOpacity
            style={[styles.dealBanner, { backgroundColor: isDark ? 'rgba(21, 128, 61, 0.15)' : '#F0FDF4', borderColor: isDark ? 'rgba(21, 128, 61, 0.3)' : '#BBF7D0' }]}
            onPress={() => router.push(`/station/${activeDeal.stationId}`)}
            activeOpacity={0.85}
          >
            <View style={styles.dealIcon}>
              <Ionicons name="flash" size={20} color={themeColors.primary} />
            </View>
            <View style={styles.dealInfo}>
              <View style={styles.dealBadgeRow}>
                <View style={[styles.dealPill, { backgroundColor: themeColors.primary }]}>
                  <Text style={styles.dealPillText}>⚡ SAVE ₹{activeDeal.savingsInr}</Text>
                </View>
                <Text style={[styles.dealSubtext, { color: themeColors.textSecondary }]}>• {activeDeal.availableChargers} Open Plugs</Text>
              </View>
              <Text style={[styles.dealTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
                {activeDeal.stationName}
              </Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={24} color={themeColors.primary} />
          </TouchableOpacity>
        )}
        {/* ── Live Grid Banner ── */}
        <View style={[styles.gridBanner, { backgroundColor: themeColors.surface, borderColor: themeColors.border, borderWidth: isDark ? 1 : 0 }]}>
          <View style={styles.gridBannerTop}>
            <View style={styles.gridBannerLeft}>
              <View style={[styles.liveIndicator, { backgroundColor: '#0FB8C9' }]} />
              <Text style={[styles.gridBannerZone, { color: themeColors.textPrimary }]}>{liveGrid.zoneName}</Text>
            </View>
            <View style={[styles.gridBandBadge, { backgroundColor: gridColor + '20', borderColor: gridColor + '40' }]}>
              <Text style={[styles.gridBandText, { color: gridColor }]}>{gridBandLabel}</Text>
            </View>
          </View>

          {/* Big renewable number + bar */}
          <View style={styles.gridMainRow}>
            <View>
              <Text style={[styles.gridPct, { color: gridColor }]}>{liveGrid.renewablePct.toFixed(0)}%</Text>
              <Text style={[styles.gridPctLabel, { color: themeColors.textSecondary }]}>{t('profile.renewable_now', 'Renewable now')}</Text>
            </View>
            <View style={styles.gridStats}>
              <Text style={styles.gridStatLine}>
                <Text style={[styles.gridStatLabel, { color: themeColors.textSecondary }]}>Carbon  </Text>
                <Text style={[styles.gridStatValue, { color: themeColors.textPrimary }]}>{liveGrid.carbonIntensity} g CO₂/kWh</Text>
              </Text>
              <Text style={styles.gridStatLine}>
                <Text style={[styles.gridStatLabel, { color: themeColors.textSecondary }]}>{t('profile.carbon_free', 'carbon-free')}  </Text>
                <Text style={[styles.gridStatValue, { color: themeColors.textPrimary }]}>{liveGrid.carbonFreePct.toFixed(0)}%</Text>
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
              <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>{t('profile.solar', 'Solar')} {solarPct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#0FB8C9' }]} />
              <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>{t('profile.wind', 'Wind')} {windPct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>{t('profile.hydro', 'Hydro')} {hydroPct}%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#6B7280' }]} />
              <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>{t('profile.coal_gas', 'Coal+Gas')} {coalPct}%</Text>
            </View>
          </View>
        </View>

        {/* Fallback Location Notice if GPS pending or permission not given */}
        {isFallback && (
          <TouchableOpacity 
            style={[styles.fallbackNotice, { backgroundColor: isDark ? '#1F2937' : '#EFF6FF', borderColor: isDark ? '#374151' : '#DBEAFE' }]}
            onPress={refreshLocation}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate-circle-outline" size={16} color={themeColors.primary} />
            <Text style={[styles.fallbackNoticeText, { color: themeColors.textPrimary }]}>
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
            <View style={[styles.statCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border, borderWidth: isDark ? 1 : 0 }]}>
              <Ionicons name="flash" size={20} color={themeColors.primary} />
              <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{stats.totalStations}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('home.chargers_near_you', 'Nearby')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border, borderWidth: isDark ? 1 : 0 }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{stats.availableChargers}</Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('home.available_now', 'Available')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border, borderWidth: isDark ? 1 : 0 }]}>
              <Ionicons name="trending-down" size={20} color="#F59E0B" />
              <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>
                {stats.lowestPrice > 0 ? `₹${stats.lowestPrice.toFixed(1)}` : '--'}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Lowest/kWh</Text>
            </View>
            </View>
          </View>
        </SlideIn>

        {/* Nearby Stations List with Fade Animation */}
        <FadeIn delay={400} duration={500}>
          <View style={styles.listContainer}>
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: themeColors.textPrimary }]}>{t('home.chargers_near_you', 'Nearby Stations')}</Text>
            <TouchableOpacity onPress={() => router.push('/explore')}>
              <Text style={[styles.viewAllText, { color: themeColors.primary }]}>{t('home.view_all', 'View All')}</Text>
            </TouchableOpacity>
          </View>

          {(loadingNearby || loadingAll) ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Loading stations...</Text>
            </View>
          ) : stations.length === 0 ? (

            <View style={styles.emptyContainer}>
              <Ionicons name="flash-off-outline" size={48} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>No stations found nearby</Text>
            </View>
          ) : (
            stations.slice(0, 5).map((station) => (
              <StationCard
                key={station.id}
                station={station}
                distance={(station as any).distance ?? undefined}
                isSaved={isFavorited(station.id)}
                onSave={() => toggleFavorite(station.id)}
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
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary[500],
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  dealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: spacing.radius.lg,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    padding: spacing.md,
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dealIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  dealInfo: {
    flex: 1,
  },
  dealBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  dealPill: {
    backgroundColor: '#15803D',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealPillText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dealSubtext: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '600',
  },
  dealTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14532D',
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
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trophyButton: {
    width: 44,
    height: 44,
    borderRadius: spacing.radius.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trophyBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  gamificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  gamificationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  gamificationInfo: {
    flex: 1,
  },
  gamificationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gamificationScoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },
  gamificationStreakTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  gamificationStreakText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  gamificationSubText: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    fontWeight: '500',
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


