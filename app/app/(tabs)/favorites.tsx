/**
 * Favorites Screen
 * Shows user's saved/favorite stations
 */

import { EmptyState } from '@/components/common';
import { colors } from '@/constants/colors';
import { useFavorites } from '@/hooks/useFavorites';
import { useUserLocation } from '@/hooks/useUserLocation';
import { spacing } from '@/styles/spacing';
import { formatDistance } from '@/utils/distance';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { coords: userLocation, refreshLocation } = useUserLocation();
  
  // Fetch favorites
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

  const handleRemoveFavorite = useCallback(async (stationId: string, stationName: string) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${stationName}" from your favorites?`,
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
              Alert.alert('Error', 'Failed to remove favorite. Please try again.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  }, [remove]);

  // Calculate distance from user
  const getDistance = useCallback((stationLat: number, stationLng: number): string | null => {
    if (!userLocation) return null;
    
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
    const distance = R * c;
    
    return formatDistance(distance);
  }, [userLocation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Favorites</Text>
        <Text style={styles.subtitle}>
          {favorites.length} saved station{favorites.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      ) : favorites.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No Favorites Yet"
          description="Save your frequently used charging stations for quick access."
          actionLabel="Find Stations"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <ScrollView 
          style={styles.scrollView} 
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
            
            const distance = getDistance(station.latitude, station.longitude);
            
            return (
              <TouchableOpacity
                key={favorite.id}
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
                    {distance && (
                      <View style={styles.metaItem}>
                        <Ionicons name="location" size={14} color={colors.neutral[400]} />
                        <Text style={styles.metaText}>{distance}</Text>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <Ionicons name="flash" size={14} color={colors.neutral[400]} />
                      <Text style={styles.metaText}>
                        {station.available_chargers || 0}/{station.total_chargers || 0} available
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.favoriteButton}
                  onPress={() => handleRemoveFavorite(station.id, station.name)}
                  disabled={removingId === station.id}
                >
                  {removingId === station.id ? (
                    <ActivityIndicator size="small" color={colors.status.error} />
                  ) : (
                    <Ionicons name="heart" size={24} color={colors.status.error} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
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
    padding: spacing.screenPadding,
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
  favoriteButton: {
    padding: spacing.sm,
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
