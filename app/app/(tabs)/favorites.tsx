import { EmptyState } from '@/components/common';
import { StationCard } from '@/components/station';
import { StationListSkeleton } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useFavorites } from '@/hooks/useFavorites';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { spacing } from '@/styles/spacing';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import ManagerHubScreen from '../manager/index';

export default function SavedScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const { colors: themeColors, isDark } = useTheme();

  const isManager =
    (profile as any)?.role === 'manager' ||
    (user as any)?.role === 'manager' ||
    user?.email === 'mahavir@gmail.com' ||
    profile?.email === 'mahavir@gmail.com';

  if (isManager) {
    return <ManagerHubScreen initialTab="pricing" />;
  }

  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const { coords: userLocation, refreshLocation } = useUserLocation();
  
  // Fetch saved (favorites)
  const { favorites, loading, refresh, remove } = useFavorites();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refreshLocation()]);
    setRefreshing(false);
  }, [refresh, refreshLocation]);

  const handleStationPress = (stationId: string) => {
    router.push(`/station/${stationId}`);
  };

  const handleRemoveSaved = useCallback(async (stationId: string, stationName: string) => {
    Alert.alert(
      t('saved.remove_title', 'Remove Saved Station'),
      `${t('saved.remove_confirm', 'Remove this station from your saved list?')}\n\n"${stationName}"`,
      [
        { text: t('support.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('account.delete', 'Remove'),
          style: 'destructive',
          onPress: async () => {
            setRemovingId(stationId);
            try {
              await remove(stationId);
            } catch (e) {
              Alert.alert('Error', 'Failed to remove saved station. Please try again.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  }, [remove, t]);

  // Calculate distance from user in km
  const getDistanceKm = useCallback((stationLat: number, stationLng: number): number | undefined => {
    if (!userLocation) return undefined;
    
    const R = 6371; // Earth's radius in km
    const dLat = ((stationLat - userLocation.latitude) * Math.PI) / 180;
    const dLon = ((stationLng - userLocation.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.latitude * Math.PI) / 180) *
        Math.cos((stationLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, [userLocation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>{t('saved.title', 'Saved')}</Text>
        <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
          {loading && !refreshing && favorites.length === 0
            ? 'Loading saved stations...'
            : `${favorites.length} ${t('saved.subtitle', 'saved station(s)')}`}
        </Text>
      </View>

      {loading && !refreshing && favorites.length === 0 ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <StationListSkeleton count={3} />
        </ScrollView>
      ) : favorites.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title={t('saved.no_saved', 'No Saved Stations')}
          description={t('saved.no_saved_desc', 'Bookmark your frequently used charging stations for quick access.')}
          actionLabel={t('saved.find_stations', 'Find Stations')}
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={themeColors.primary}
            />
          }
        >
          {favorites.map((favorite) => {
            const station = favorite.station;
            if (!station) return null;
            
            const distanceKm = getDistanceKm(station.latitude, station.longitude);
            
            return (
              <StationCard
                key={favorite.id}
                station={station}
                distance={distanceKm}
                isSaved={true}
                onSave={() => handleRemoveSaved(station.id, station.name)}
                onPress={() => handleStationPress(station.id)}
              />
            );
          })}
        </ScrollView>
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
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  subtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 110,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.neutral[500],
  },
});
