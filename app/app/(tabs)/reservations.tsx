/**
 * Reservations Screen
 * Shows user's active and past reservations with dynamic Theme & Language support
 */

import { EmptyState } from '@/components/common';
import { Button, BookingListSkeleton } from '@/components/ui';
import { CHARGER_TYPES } from '@/constants/chargerTypes';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useCancelReservation, useReservations } from '@/hooks/useReservations';
import { spacing } from '@/styles/spacing';
import { Reservation } from '@/types/database.types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

type TabType = 'active' | 'past';

export default function ReservationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string; refresh?: string }>();
  const { profile } = useAuth();
  const { colors: themeColors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch reservations
  const { reservations, loading, refresh } = useReservations();
  const { cancel, loading: cancelLoading } = useCancelReservation();

  // Listen to router params (e.g. redirected from completed charging session)
  useEffect(() => {
    if (params.tab === 'past') {
      setActiveTab('past');
    } else if (params.tab === 'active') {
      setActiveTab('active');
    }
  }, [params.tab, params.refresh]);

  // Refetch on tab focus to keep active/past always synchronized
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Helper to format date with i18n
  const formatReservationDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('reservations.today', 'Today');
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return t('reservations.tomorrow', 'Tomorrow');
    }
    return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }, [language, t]);

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

  // Separate active and past reservations
  const { activeReservations, pastReservations } = useMemo(() => {
    const now = new Date();
    const active: Reservation[] = [];
    const past: Reservation[] = [];
    
    reservations.forEach(r => {
      const endTime = new Date(r.end_time);
      const isFinished = r.status === 'completed' || r.status === 'cancelled' || r.status === 'expired';
      // If completed or cancelled or past expiration time by 10 mins
      const isPastTime = endTime.getTime() < (now.getTime() - 10 * 60 * 1000);

      if (!isFinished && !isPastTime && (r.status === 'active' || (r.status as any) === 'reserved' || (r.status as any) === 'scheduled' || !r.status)) {
        active.push(r);
      } else {
        past.push(r);
      }
    });
    
    // Sort active by start time (soonest first), past by end time (most recent first)
    active.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    past.sort((a, b) => new Date(b.end_time || b.start_time).getTime() - new Date(a.end_time || a.start_time).getTime());
    
    return { activeReservations: active, pastReservations: past };
  }, [reservations]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleCancel = useCallback(async (reservation: Reservation) => {
    Alert.alert(
      t('reservations.cancel_booking', 'Cancel Reservation'),
      t('reservations.cancel_confirm', 'Are you sure you want to cancel this reservation?'),
      [
        { text: t('support.cancel', 'No'), style: 'cancel' },
        {
          text: t('account.delete', 'Yes, Cancel'),
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
  }, [cancel, refresh, t]);

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
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>{t('reservations.title', 'My Bookings & History')}</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: themeColors.surface }]}>
        <TouchableOpacity
          style={[
            styles.tab, 
            { backgroundColor: activeTab === 'active' ? themeColors.primary : (isDark ? '#1F2937' : colors.neutral[100]) }
          ]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'active' ? colors.white : themeColors.textSecondary }
          ]}>
            {t('reservations.active_tab', 'Active & Scheduled')} {loading && !refreshing && activeReservations.length === 0 ? '' : `(${activeReservations.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab, 
            { backgroundColor: activeTab === 'past' ? themeColors.primary : (isDark ? '#1F2937' : colors.neutral[100]) }
          ]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'past' ? colors.white : themeColors.textSecondary }
          ]}>
            {t('reservations.past_tab', 'Past Receipts')} {loading && !refreshing && pastReservations.length === 0 ? '' : `(${pastReservations.length})`}
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
            tintColor={themeColors.primary}
          />
        }
      >
        {loading && !refreshing && (activeTab === 'active' ? activeReservations.length === 0 : pastReservations.length === 0) ? (
          <BookingListSkeleton count={3} />
        ) : (
          <>
            {activeTab === 'active' && activeReservations.length === 0 && (
              <EmptyState
                icon="calendar-outline"
                title={t('reservations.no_active', 'No Active Reservations')}
                description={t('reservations.no_active_desc', 'Book a charging slot at your preferred station to guarantee availability.')}
                actionLabel={t('reservations.find_stations', 'Find Charging Stations')}
                onAction={() => router.push('/(tabs)')}
              />
            )}

            {activeTab === 'past' && pastReservations.length === 0 && (
              <EmptyState
                icon="time-outline"
                title={t('reservations.no_past', 'No Past Charging Sessions')}
                description={t('reservations.no_past_desc', 'Your completed charging sessions and receipts will appear here.')}
              />
            )}

            {(activeTab === 'active' ? activeReservations : pastReservations).map((reservation) => {
              const charger = (reservation as any).charger;
              const station = charger?.station;
              const chargerTypeKey = charger?.charger_type as keyof typeof CHARGER_TYPES | undefined;
              const chargerType = chargerTypeKey ? CHARGER_TYPES[chargerTypeKey] : null;
              const isActive = activeTab === 'active';
              
              const statusLabel = isActive 
                ? (reservation.status === 'active' ? t('reservations.status_active', 'Charging Active') : t('reservations.status_reserved', 'Upcoming'))
                : (reservation.status === 'cancelled' ? t('reservations.status_cancelled', 'Cancelled') : t('reservations.status_completed', 'Completed'));

              return (
                <TouchableOpacity 
                  key={reservation.id} 
                  style={[styles.reservationCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border, borderWidth: isDark ? 1 : 0 }]}
                  onPress={() => router.push({
                    pathname: '/reservation/[reservationId]',
                    params: { reservationId: reservation.id }
                  })}
                  activeOpacity={0.7}
                >
                  {/* Tap to view details hint */}
                  <View style={styles.tapHint}>
                    <Text style={[styles.tapHintText, { color: themeColors.textSecondary }]}>Tap for details</Text>
                    <Ionicons name="chevron-forward" size={14} color={themeColors.textSecondary} />
                  </View>
                  
                  <View style={styles.reservationHeader}>
                    <View style={[styles.stationIconContainer, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.primary[50] }]}>
                      <Ionicons name="flash" size={24} color={themeColors.primary} />
                    </View>
                    <View style={styles.reservationInfo}>
                      <Text style={[styles.stationName, { color: themeColors.textPrimary }]}>
                        {station?.name || 'Unknown Station'}
                      </Text>
                      <Text style={[styles.chargerType, { color: themeColors.textSecondary }]}>
                        {chargerType?.name || 'Charger'} • {charger?.power_kw || 0} kW
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: isDark ? '#374151' : colors.neutral[200] },
                      isActive && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : colors.primary[100] },
                      reservation.status === 'cancelled' && { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : colors.status.error + '20' },
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: themeColors.textSecondary },
                        isActive && { color: themeColors.primary },
                        reservation.status === 'cancelled' && { color: colors.status.error },
                      ]}>
                        {statusLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                  <View style={styles.reservationDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={18} color={themeColors.textSecondary} />
                      <Text style={[styles.detailText, { color: themeColors.textPrimary }]}>
                        {formatReservationDate(reservation.start_time)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time-outline" size={18} color={themeColors.textSecondary} />
                      <Text style={[styles.detailText, { color: themeColors.textPrimary }]}>
                        {formatReservationTime(reservation.start_time, reservation.end_time)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="location-outline" size={18} color={themeColors.textSecondary} />
                      <Text style={[styles.detailText, { color: themeColors.textSecondary }]} numberOfLines={1}>
                        {station?.address || 'Address unavailable'}, {station?.city || ''}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="pricetag-outline" size={18} color={themeColors.textSecondary} />
                      <Text style={[styles.detailText, { color: themeColors.primary, fontWeight: '600' }]}>
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
                        leftIcon={<Ionicons name="navigate" size={16} color={themeColors.primary} />}
                        style={styles.actionButton}
                        onPress={() => handleNavigate(reservation)}
                      />
                      <Button
                        title={cancelLoading ? 'Cancelling...' : t('support.cancel', 'Cancel')}
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
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[600],
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
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[600],
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
