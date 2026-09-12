/**
 * Saved Screen
 * Shows user's saved/bookmarked stations
 */

import { EmptyState } from '@/components/common';
import { StationCard } from '@/components/station';
import { colors } from '@/constants/colors';
import { useFavorites } from '@/hooks/useFavorites';
import { useUserLocation } from '@/hooks/useUserLocation';
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

export default function SavedScreen() {
  const router = useRouter();
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
      'Remove Saved Station',
      `Remove "${stationName}" from your saved stations?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
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
  }, [remove]);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved</Text>
        <Text style={styles.subtitle}>
          {favorites.length} saved station{favorites.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading saved stations...</Text>
        </View>
      ) : favorites.length === 0 ? (
        <EmptyState
          icon="bookmark-outline"
          title="No Saved Stations"
          description="Bookmark your frequently used charging stations for quick access."
          actionLabel="Find Stations"
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
              tintColor={colors.primary[500]}
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
    paddingBottom: spacing.xl,
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
