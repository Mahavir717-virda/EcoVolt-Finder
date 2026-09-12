import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { SessionStatus, ConnectorType } from '@contracts/enums';
import {
  Text,
  Button,
  Chip,
  Card,
  EmptyState,
  SegmentedControl,
  SkeletonRow,
  StatColumn,
} from '../../components';
import { colors, radii, shadows, spacing, greennessColor } from '../../theme/tokens';
import { formatConnectorName } from '../../features/stations/utils';

export interface BookingItem {
  id: string;
  userId: string;
  stationId: string;
  stationName: string;
  connectorType: ConnectorType;
  vehicleId: string;
  vehicleModel?: string;
  status: SessionStatus;
  windowStart: string;
  windowEnd: string;
  lockedPrice: number;
  createdAt: string;
  canCancelFree?: boolean;
  greennessPct?: number;
  energyKwh?: number;
  cost?: number;
  avgRenewablePct?: number;
  co2AvoidedKg?: number;
}

export const BookingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'history'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // 1. Fetch Bookings via React Query
  const bookingsQuery = useQuery<BookingItem[]>({
    queryKey: ['bookings', 'list'],
    queryFn: async () => {
      try {
        const res = await http.get<BookingItem[]>('/bookings');
        return res;
      } catch {
        return [];
      }
    },
    staleTime: 15000,
  });

  // 2. Mutation: Cancel Booking within Grace Window (Edge Case #23)
  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await http.patch(`/bookings/${bookingId}/cancel`, {});
    },
    onMutate: (bookingId) => {
      setCancellingId(bookingId);
    },
    onSettled: () => {
      setCancellingId(null);
      queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] });
    },
    onSuccess: () => {
      Alert.alert(
        'Reservation Cancelled',
        'Your slot has been released and any pre-authorization refunded in full.'
      );
    },
    onError: () => {
      Alert.alert(
        'Cancellation Error',
        'Could not release reservation at this time. Please try again.'
      );
    },
  });

  const handleCancel = (booking: BookingItem) => {
    Alert.alert(
      'Cancel Reservation?',
      `Are you sure you want to cancel your slot at ${booking.stationName}? Within the grace window, your cancellation is 100% free with no penalties.`,
      [
        { text: 'Keep Slot', style: 'cancel' },
        {
          text: 'Cancel Reservation',
          style: 'destructive',
          onPress: () => cancelBookingMutation.mutate(booking.id),
        },
      ]
    );
  };

  const allBookings = bookingsQuery.data || [];

  // Filter bookings by tab
  const upcomingBookings = allBookings.filter(
    (b) => b.status === SessionStatus.RESERVED || b.status === SessionStatus.SCHEDULED
  );
  const activeBookings = allBookings.filter((b) => b.status === SessionStatus.ACTIVE);
  const historyBookings = allBookings.filter(
    (b) =>
      b.status === SessionStatus.COMPLETED ||
      b.status === SessionStatus.CANCELLED ||
      b.status === SessionStatus.EXPIRED ||
      b.status === SessionStatus.FAILED
  );

  const currentList =
    activeTab === 'upcoming'
      ? upcomingBookings
      : activeTab === 'active'
      ? activeBookings
      : historyBookings;

  const formatTimeRange = (startIso: string, endIso: string) => {
    try {
      const start = new Date(startIso);
      const end = new Date(endIso);
      const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = start.toLocaleDateString([], { month: 'short', day: 'numeric' });
      return `${dateStr} · ${startStr} – ${endStr}`;
    } catch {
      return 'Today · 12:00 PM – 1:30 PM';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <Text variant="screenTitle" style={styles.screenTitle}>
            My Bookings & History
          </Text>
          <Text variant="caption" color={colors.ink2}>
            Track scheduled slots, live charging sessions & past receipts
          </Text>
        </View>

        {/* Tab Filter Control */}
        <View style={styles.segmentedContainer}>
          <SegmentedControl
            options={[
              { value: 'upcoming', label: `Upcoming (${upcomingBookings.length})` },
              { value: 'active', label: `Active (${activeBookings.length})` },
              { value: 'history', label: `History (${historyBookings.length})` },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as any)}
          />
        </View>

        {/* Loading State: Skeleton Rows */}
        {bookingsQuery.isLoading && (
          <View style={styles.skeletonContainer}>
            <SkeletonRow style={styles.skeletonItem} />
            <SkeletonRow style={styles.skeletonItem} />
            <SkeletonRow style={styles.skeletonItem} />
          </View>
        )}

        {/* Loaded Content */}
        {!bookingsQuery.isLoading && (
          <>
            {/* Empty State (Edge Case #20: Inviting, No Dead Ends) */}
            {currentList.length === 0 ? (
              <View style={styles.emptyWrap}>
                {activeTab === 'upcoming' && (
                  <EmptyState
                    title="No Upcoming Bookings"
                    message="Plan your next recharge during peak solar hours and lock in green discounts."
                    actionLabel="Explore Stations on Map"
                    onAction={() =>
                      navigation.navigate('DriverTabs', {
                        screen: 'Explore',
                      })
                    }
                  />
                )}

                {activeTab === 'active' && (
                  <EmptyState
                    title="No Active Session"
                    message="Plug in at your reserved connector to initiate live charging telemetry."
                    actionLabel="View Scheduled Slots"
                    onAction={() => setActiveTab('upcoming')}
                  />
                )}

                {activeTab === 'history' && (
                  <EmptyState
                    title="No Past Charging History"
                    message="Your completed clean energy charging receipts and saved ₹ will appear here."
                    actionLabel="Book Your First Charge"
                    onAction={() =>
                      navigation.navigate('DriverTabs', {
                        screen: 'Explore',
                      })
                    }
                  />
                )}
              </View>
            ) : (
              <View style={styles.listContainer}>
                {currentList.map((booking) => {
                  const isUpcoming =
                    booking.status === SessionStatus.RESERVED ||
                    booking.status === SessionStatus.SCHEDULED;
                  const isActive = booking.status === SessionStatus.ACTIVE;
                  const isCompleted = booking.status === SessionStatus.COMPLETED;
                  const isCancelled = booking.status === SessionStatus.CANCELLED;

                  return (
                    <Card key={booking.id} elevation="e1" style={styles.bookingCard}>
                      {/* Top Card Row */}
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.stationTitleCol}>
                          <Text variant="cardTitle" style={styles.stationName}>
                            {booking.stationName}
                          </Text>
                          <Text variant="caption" color={colors.ink2}>
                            {formatConnectorName(booking.connectorType)} · {booking.vehicleModel || 'Tata Nexon EV'}
                          </Text>
                        </View>

                        {/* Status Chip */}
                        {isActive && (
                          <Chip
                            label="LIVE NOW"
                            variant="solid"
                            color="#FFFFFF"
                            backgroundColor={colors.brand}
                          />
                        )}
                        {isUpcoming && (
                          <Chip
                            label="CONFIRMED"
                            variant="subtle"
                            color={colors.brand}
                            backgroundColor={colors.brandTint}
                          />
                        )}
                        {isCompleted && (
                          <Chip
                            label="COMPLETED"
                            variant="subtle"
                            color={colors.brand}
                            backgroundColor={colors.brandTint}
                          />
                        )}
                        {isCancelled && (
                          <Chip
                            label="CANCELLED"
                            variant="subtle"
                            color={colors.ink3}
                            backgroundColor={colors.surfaceSunken}
                          />
                        )}
                      </View>

                      {/* Time Window Row */}
                      <View style={styles.timeWindowBox}>
                        <Text variant="caption" color={colors.ink}>
                          📅 {formatTimeRange(booking.windowStart, booking.windowEnd)}
                        </Text>
                        {booking.greennessPct && (
                          <Chip
                            label={`${booking.greennessPct}% Clean`}
                            variant="subtle"
                            color={greennessColor(booking.greennessPct)}
                            backgroundColor={colors.brandTint}
                          />
                        )}
                      </View>

                      {/* Metrics & Locked Price Breakdown */}
                      <View style={styles.metricsRow}>
                        <StatColumn
                          label="LOCKED TARIFF"
                          value={`₹${(booking.lockedPrice ?? 6.2).toFixed(2)}/kWh`}
                          valueColor={colors.brand}
                        />

                        {isCompleted && (
                          <>
                            <View style={styles.metricDivider} />
                            <StatColumn
                              label="DELIVERED"
                              value={`${(booking.energyKwh ?? 18.0).toFixed(1)} kWh`}
                              valueColor={colors.ink}
                            />

                            <View style={styles.metricDivider} />
                            <StatColumn
                              label="TOTAL BILLED"
                              value={`₹${(booking.cost ?? ((booking.energyKwh ?? 18.0) * (booking.lockedPrice ?? 6.2))).toFixed(2)}`}
                              valueColor={colors.brand}
                            />
                          </>
                        )}
                      </View>

                      {/* Edge Case #23: Grace Window Cancellation Notice & Action */}
                      {isUpcoming && (
                        <View style={styles.graceSection}>
                          <View style={styles.graceNoticeRow}>
                            <Text variant="micro" color={colors.ink2}>
                              🛡️ Free cancellation active within grace window
                            </Text>
                          </View>

                          <View style={styles.upcomingActionsRow}>
                            <Button
                              label="Cancel Slot"
                              variant="ghost"
                              onPress={() => handleCancel(booking)}
                              busy={cancellingId === booking.id}
                              style={styles.cancelBtn}
                            />
                            <Button
                              label="Directions"
                              variant="secondary"
                              onPress={() =>
                                navigation.navigate('StationDetail', {
                                  stationId: booking.stationId,
                                })
                              }
                              style={styles.actionBtn}
                            />
                          </View>
                        </View>
                      )}

                      {/* Active Session Shortcut */}
                      {isActive && (
                        <View style={styles.activeSessionAction}>
                          <Button
                            label="Open Live Telemetry Session →"
                            variant="primary"
                            onPress={() =>
                              navigation.navigate('DriverTabs', {
                                screen: 'Activity',
                              })
                            }
                          />
                        </View>
                      )}
                    </Card>
                  );
                })}
              </View>
            )}
          </>
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
    paddingHorizontal: spacing.base,
  },
  tabularNum: {
    fontVariant: ['tabular-nums'],
  },
  header: {
    marginBottom: spacing.base,
  },
  screenTitle: {
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  segmentedContainer: {
    marginBottom: spacing.base,
  },
  skeletonContainer: {
    gap: spacing.sm,
  },
  skeletonItem: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
  },
  emptyWrap: {
    marginTop: spacing.lg,
  },
  listContainer: {
    gap: spacing.base,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  stationTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  stationName: {
    color: colors.ink,
    marginBottom: 2,
  },
  timeWindowBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metricItem: {
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  graceSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  graceNoticeRow: {
    marginBottom: spacing.xs,
  },
  upcomingActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
  },
  actionBtn: {
    flex: 1,
  },
  activeSessionAction: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
});
