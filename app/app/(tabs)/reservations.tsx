/**
 * Reservations Screen
 * Shows user's active and past reservations
 */

import { EmptyState } from '@/components/common';
import { Button } from '@/components/ui';
import { CHARGER_TYPES } from '@/constants/chargerTypes';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useCancelReservation, useReservations } from '@/hooks/useReservations';
import { spacing } from '@/styles/spacing';
import { Reservation } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabType = 'active' | 'past';

// Helper to format date
const formatReservationDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Helper to format time
const formatReservationTime = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const formatTime = (d: Date) => d.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
  return `${formatTime(start)} - ${formatTime(end)}`;
};

export default function ReservationsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch reservations
  const { reservations, loading, refresh } = useReservations();
  const { cancel, loading: cancelLoading } = useCancelReservation();

  
  // Separate active and past reservations
  const { activeReservations, pastReservations } = useMemo(() => {
    const now = new Date();
    const active: Reservation[] = [];
    const past: Reservation[] = [];
    
    reservations.forEach(r => {
      const endTime = new Date(r.end_time);
      // Active reservation: status is 'active' and hasn't ended yet
      if (r.status === 'active' && endTime > now) {
        active.push(r);
      } else {
        past.push(r);
      }
    });
    
    // Sort active by start time (soonest first), past by end time (most recent first)
    active.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    past.sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());
    
    return { activeReservations: active, pastReservations: past };
  }, [reservations]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleCancel = useCallback(async (reservation: Reservation) => {
    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this reservation?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await cancel(reservation.id);
              if (!success) {
                Alert.alert('Error', 'Failed to cancel reservation. Please try again.');
              } else {
                refresh();
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to cancel reservation. Please try again.');
            }
          },
        },
      ]
    );
  }, [cancel, refresh]);

  const handleNavigate = useCallback((reservation: Reservation) => {
    const charger = (reservation as any).charger;
    const station = charger?.station;
    if (!station?.latitude || !station?.longitude) {
      Alert.alert('Error', 'Station location not available');
      return;
    }
    
    // Navigate to in-app directions
    router.push({
      pathname: '/modal/navigation',
      params: {
        latitude: station.latitude.toString(),
        longitude: station.longitude.toString(),
        name: station.name,
        address: station.address,
      },
    });
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Reservations</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({activeReservations.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}>
            Past ({pastReservations.length})
          </Text>
        </TouchableOpacity>
      </View>

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
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Loading reservations...</Text>
          </View>
        ) : (
          <>
            {activeTab === 'active' && activeReservations.length === 0 && (
              <EmptyState
                icon="calendar-outline"
                title="No Active Reservations"
                description="You don't have any upcoming reservations. Find a station to book your charging slot."
                actionLabel="Find Stations"
                onAction={() => router.push('/(tabs)')}
              />
            )}

            {activeTab === 'past' && pastReservations.length === 0 && (
              <EmptyState
                icon="time-outline"
                title="No Past Reservations"
                description="Your completed reservations will appear here."
              />
            )}

            {(activeTab === 'active' ? activeReservations : pastReservations).map((reservation) => {
              const charger = (reservation as any).charger;
              const station = charger?.station;
              const chargerTypeKey = charger?.charger_type as keyof typeof CHARGER_TYPES | undefined;
              const chargerType = chargerTypeKey ? CHARGER_TYPES[chargerTypeKey] : null;
              const isActive = activeTab === 'active';
              
              return (
                <TouchableOpacity 
                  key={reservation.id} 
                  style={styles.reservationCard}
                  onPress={() => router.push({
                    pathname: '/reservation/[reservationId]',
                    params: { reservationId: reservation.id }
                  })}
                  activeOpacity={0.7}
                >
                  {/* Tap to view details hint */}
                  <View style={styles.tapHint}>
                    <Text style={styles.tapHintText}>Tap for details</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.neutral[400]} />
                  </View>
                  
                  <View style={styles.reservationHeader}>
                    <View style={styles.stationIconContainer}>
                      <Ionicons name="flash" size={24} color={colors.primary[500]} />
                    </View>
                    <View style={styles.reservationInfo}>
                      <Text style={styles.stationName}>
                        {station?.name || 'Unknown Station'}
                      </Text>
                      <Text style={styles.chargerType}>
                        {chargerType?.name || 'Charger'} • {charger?.power_kw || 0} kW
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      isActive && styles.statusActive,
                      reservation.status === 'cancelled' && styles.statusCancelled,
                    ]}>
                      <Text style={[
                        styles.statusText,
                        isActive && styles.statusTextActive,
                        reservation.status === 'cancelled' && styles.statusTextCancelled,
                      ]}>
                        {isActive ? 'Upcoming' : reservation.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.reservationDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={18} color={colors.neutral[500]} />
                      <Text style={styles.detailText}>
                        {formatReservationDate(reservation.start_time)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={18} color={colors.neutral[500]} />
                      <Text style={styles.detailText}>
                        {formatReservationTime(reservation.start_time, reservation.end_time)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={18} color={colors.neutral[500]} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {station?.address || 'Address unavailable'}, {station?.city || ''}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="pricetag-outline" size={18} color={colors.neutral[500]} />
                      <Text style={styles.detailText}>
                        ₹{charger?.price_per_kwh || 0}/kWh
                      </Text>
                    </View>
                  </View>

                  {isActive && (
                    <View style={styles.actionButtons}>
                      <Button
                        title="Navigate"
                        variant="outline"
                        size="sm"
                        leftIcon={<Ionicons name="navigate" size={16} color={colors.primary[500]} />}
                        style={styles.actionButton}
                        onPress={() => handleNavigate(reservation)}
                      />
                      <Button
                        title={cancelLoading ? 'Cancelling...' : 'Cancel'}
                        variant="ghost"
                        size="sm"
                        style={styles.actionButton}
                        onPress={() => handleCancel(reservation)}
                        disabled={cancelLoading}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  tabTextActive: {
    color: colors.white,
  },
  scrollView: {
    flex: 1,
    padding: spacing.screenPadding,
  },
  reservationCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  tapHintText: {
    fontSize: 11,
    color: colors.neutral[400],
    marginRight: 2,
  },
  reservationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  reservationInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  chargerType: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.neutral[200],
  },
  statusActive: {
    backgroundColor: colors.primary[100],
  },
  statusCancelled: {
    backgroundColor: colors.status.error + '20',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  statusTextActive: {
    color: colors.primary[700],
  },
  statusTextCancelled: {
    color: colors.status.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.md,
  },
  reservationDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: 14,
    color: colors.neutral[600],
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.neutral[500],
  },
});
