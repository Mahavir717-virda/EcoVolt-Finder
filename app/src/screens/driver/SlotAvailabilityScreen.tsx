import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { Text, Button, Chip } from '../../components';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { formatConnectorName } from '../../features/stations/utils';
import { ConnectorType } from '@contracts/enums';

type SlotAvailabilityRouteProp = RouteProp<DriverStackParamList, 'SlotAvailability'>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortDetail {
  portNumber: number;
  status: 'available' | 'booked' | 'maintenance' | 'offline';
  bookingId?: string;
  windowStart?: string;
  windowEnd?: string;
  isMine?: boolean;
}

interface ConnectorSlot {
  connectorId: string;
  type: string;
  powerKw: number;
  status: 'available' | 'occupied' | 'maintenance' | 'offline';
  totalCount: number;
  availableCount: number;
  bookedCount: number;
  ports?: PortDetail[];
}

interface SlotMatrix {
  stationId: string;
  windowStart: string;
  windowEnd: string;
  connectors: ConnectorSlot[];
  totalFree: number;
  totalOccupied: number;
  totalCapacity: number;
}

// Upcoming time windows — now + 0/1/2/3/4/5 hours
function buildTimeWindows() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const start = new Date(now.getTime() + i * 3600 * 1000);
    const end = new Date(start.getTime() + 3600 * 1000);
    return { start: start.toISOString(), end: end.toISOString(), label: formatHour(start) };
  });
}

function formatHour(d: Date) {
  const h = d.getHours();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${suffix}`;
}

function formatSlotTime(isoStr?: string) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const h = d.getHours();
  const m = d.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mStr = m > 0 ? `:${m.toString().padStart(2, '0')}` : ':00';
  return `${h12}${mStr} ${suffix}`;
}

function statusColor(status: ConnectorSlot['status']) {
  switch (status) {
    case 'available':   return colors.brand;
    case 'occupied':    return '#EF4444';
    case 'maintenance': return '#F59E0B';
    case 'offline':     return colors.ink3;
  }
}

function statusBg(status: ConnectorSlot['status']) {
  switch (status) {
    case 'available':   return '#EDF7F0';
    case 'occupied':    return '#FEF2F2';
    case 'maintenance': return '#FFFBEB';
    case 'offline':     return '#F3F4F6';
  }
}

function statusLabel(slot: ConnectorSlot) {
  if (slot.status === 'maintenance') return '🔧 Maintenance';
  if (slot.status === 'offline')     return '⛔ Offline';
  if (slot.availableCount === 0)     return '🔴 Full';
  if (slot.availableCount === 1)     return '🟡 Last slot';
  return `🟢 ${slot.availableCount} free`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SlotAvailabilityScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<SlotAvailabilityRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();

  const { stationId, connectorType: filterType } = route.params;

  const [windows, setWindows] = useState(buildTimeWindows);
  const [selectedWindowIdx, setSelectedWindowIdx] = useState(0);

  const selectedWindow = windows[selectedWindowIdx] || windows[0];

  const slotQuery = useQuery<SlotMatrix>({
    queryKey: ['slots', stationId, selectedWindow.start, selectedWindow.end, filterType],
    queryFn: async () => {
      const params: Record<string, string> = {
        windowStart: selectedWindow.start,
        windowEnd: selectedWindow.end,
      };
      if (filterType) params.connectorType = filterType;
      return http.get<SlotMatrix>(`/bookings/station/${stationId}/slots`, { params });
    },
    // staleTime: 0 means any invalidation (e.g. after booking confirm) triggers immediate refetch
    staleTime: 0,
    refetchInterval: 10000,
  });

  useFocusEffect(
    useCallback(() => {
      setWindows(buildTimeWindows());
      slotQuery.refetch();
    }, [])
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setWindows(buildTimeWindows());
    await slotQuery.refetch();
    setRefreshing(false);
  }, [slotQuery]);

  const matrix = slotQuery.data;
  const isLoading = slotQuery.isLoading;

  const handleBookConnector = (slot: ConnectorSlot) => {
    navigation.navigate('BookingConfirm', {
      stationId,
      connectorType: slot.type,
      windowStart: selectedWindow.start,
      durationMinutes: 60,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text variant="sectionLabel" style={styles.headerTitle}>Live Slot Availability</Text>
          <Text variant="caption" color={colors.ink2}>Tap a window to check that hour</Text>
        </View>
      </View>

      {/* ── Time Window Selector ─────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.windowStrip}
      >
        {windows.map((w, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => setSelectedWindowIdx(idx)}
            style={[
              styles.windowChip,
              idx === selectedWindowIdx && styles.windowChipActive,
            ]}
          >
            <Text
              variant="micro"
              color={idx === selectedWindowIdx ? '#FFFFFF' : colors.ink2}
              style={styles.windowChipText}
            >
              {idx === 0 ? 'Now' : w.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* ── Summary Bar ──────────────────────────────────────────── */}
        {matrix && (
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text variant="micro" color={colors.ink3}>Free Slots</Text>
              <Text variant="cardTitle" color={matrix.totalFree > 0 ? colors.brand : '#EF4444'} style={styles.summaryVal}>
                {matrix.totalFree}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text variant="micro" color={colors.ink3}>In Use</Text>
              <Text variant="cardTitle" style={styles.summaryVal}>{matrix.totalOccupied}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text variant="micro" color={colors.ink3}>Total Plugs</Text>
              <Text variant="cardTitle" style={styles.summaryVal}>{matrix.totalCapacity}</Text>
            </View>
          </View>
        )}

        {/* ── Status ───────────────────────────────────────────────── */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.brand} />
            <Text variant="caption" color={colors.ink2} style={{ marginTop: 12 }}>
              Checking live slot status…
            </Text>
          </View>
        ) : slotQuery.isError ? (
          <View style={styles.errorBox}>
            <Text variant="body" color="#EF4444" align="center">
              Failed to load slot availability. Please pull down to retry.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Per-Connector Cards ──────────────────────────────── */}
            <Text variant="caption" color={colors.ink2} style={styles.sectionLabel}>
              CONNECTOR BREAKDOWN
            </Text>

            {matrix?.connectors.map((slot) => (
              <View
                key={slot.connectorId}
                style={[styles.connectorCard, { backgroundColor: statusBg(slot.status) }]}
              >
                {/* Top Row */}
                <View style={styles.connectorCardTop}>
                  <View style={styles.connectorInfo}>
                    <Text variant="cardTitle" style={styles.connectorName}>
                      {formatConnectorName(slot.type as ConnectorType)}
                    </Text>
                    <Text variant="micro" color={colors.ink3}>
                      {slot.powerKw} kW · {slot.type}
                    </Text>
                  </View>
                  <Chip
                    label={statusLabel(slot)}
                    variant="subtle"
                    color={statusColor(slot.status)}
                    backgroundColor={`${statusColor(slot.status)}20`}
                  />
                </View>

                {/* Capacity Bar */}
                <View style={styles.capacityBarBg}>
                  <View
                    style={[
                      styles.capacityBarFill,
                      {
                        flex: slot.totalCount > 0 ? slot.bookedCount / slot.totalCount : 0,
                        backgroundColor:
                          slot.bookedCount >= slot.totalCount ? '#EF4444' : colors.brand,
                      },
                    ]}
                  />
                </View>

                {/* Dot-based visual slots — driven by real per-port status from API */}
                <View style={styles.dotRow}>
                  {Array.from({ length: slot.totalCount }, (_, i) => {
                    const portInfo = slot.ports?.[i];
                    const dotStatus = portInfo ? portInfo.status : (i < slot.bookedCount ? 'booked' : 'available');
                    const isMine = portInfo?.isMine ?? false;
                    const dotColor =
                      dotStatus === 'maintenance' || dotStatus === 'offline'
                        ? '#D1D5DB'
                        : dotStatus === 'booked'
                        ? isMine ? '#3B82F6' : '#EF4444'
                        : colors.brand;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          { backgroundColor: dotColor },
                          isMine && styles.dotMine,
                        ]}
                      />
                    );
                  })}
                  <Text variant="micro" color={colors.ink3} style={styles.dotLabel}>
                    {slot.availableCount}/{slot.totalCount} free
                  </Text>
                </View>

                {/* Explicit Port Badges */}
                <View style={styles.portPillsRow}>
                  {slot.ports && slot.ports.length > 0 ? (
                    slot.ports.map((p) => {
                      const isAvail = p.status === 'available';
                      const isMine = p.status === 'booked' && p.isMine;
                      const bookedWindow =
                        p.status === 'booked' && p.windowStart && p.windowEnd
                          ? ` (${formatSlotTime(p.windowStart)} – ${formatSlotTime(p.windowEnd)})`
                          : '';
                      const label = isAvail
                        ? 'Free'
                        : isMine
                        ? `Your Booking${bookedWindow}`
                        : `Booked${bookedWindow}`;

                      return (
                        <View
                          key={p.portNumber}
                          style={[
                            styles.portPill,
                            isAvail
                              ? styles.portPillAvailable
                              : isMine
                              ? styles.portPillMine
                              : styles.portPillBooked,
                          ]}
                        >
                          <Text style={styles.portPillIcon}>
                            {isAvail ? '⚡' : isMine ? '👤' : '🔒'}
                          </Text>
                          <Text
                            variant="micro"
                            style={[
                              styles.portPillText,
                              isMine && { color: '#1D4ED8' },
                            ]}
                          >
                            Port {p.portNumber}: {label}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    Array.from({ length: slot.totalCount }).map((_, idx) => {
                      const isAvail = idx < slot.availableCount;
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.portPill,
                            isAvail ? styles.portPillAvailable : styles.portPillBooked,
                          ]}
                        >
                          <Text style={styles.portPillIcon}>{isAvail ? '⚡' : '🔒'}</Text>
                          <Text variant="micro" style={styles.portPillText}>
                            Port {idx + 1}: {isAvail ? 'Free' : 'Booked'}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Book CTA */}
                {slot.status === 'available' && slot.availableCount > 0 && (
                  <Button
                    label={`⚡ Book this ${formatConnectorName(slot.type as ConnectorType)} Slot`}
                    variant="primary"
                    onPress={() => handleBookConnector(slot)}
                    style={styles.bookBtn}
                  />
                )}

                {slot.status === 'occupied' && (
                  <View style={styles.fullNotice}>
                    <Text variant="micro" color="#EF4444">
                      All slots occupied for this window. Try the next hour →
                    </Text>
                  </View>
                )}

                {(slot.status === 'maintenance' || slot.status === 'offline') && (
                  <View style={styles.fullNotice}>
                    <Text variant="micro" color={colors.ink3}>
                      This connector is temporarily unavailable.
                    </Text>
                  </View>
                )}
              </View>
            ))}

            {matrix?.connectors.length === 0 && (
              <View style={styles.emptyBox}>
                <Text variant="body" color={colors.ink2} align="center">
                  No connectors found for the selected type.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSunken,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: colors.ink,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  windowStrip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  windowChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 6,
  },
  windowChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  windowChipText: {
    fontFamily: 'Manrope_600SemiBold',
  },
  scroll: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    ...shadows.e1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  summaryVal: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 22,
  },
  sectionLabel: {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  connectorCard: {
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    ...shadows.e1,
  },
  connectorCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  connectorInfo: {
    flex: 1,
    gap: 2,
  },
  connectorName: {
    fontFamily: 'Manrope_700Bold',
  },
  capacityBarBg: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  capacityBarFill: {
    borderRadius: 2,
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotMine: {
    borderWidth: 2,
    borderColor: '#1D4ED8',
  },
  dotLabel: {
    marginLeft: 4,
    fontFamily: 'Manrope_600SemiBold',
  },
  bookBtn: {
    height: 44,
    marginTop: 4,
  },
  fullNotice: {
    backgroundColor: '#FEF2F2',
    borderRadius: radii.sm,
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  errorBox: {
    padding: spacing.base,
    backgroundColor: '#FEF2F2',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: spacing.base,
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  portPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  portPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 4,
  },
  portPillAvailable: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.brand + '60',
  },
  portPillMine: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  portPillBooked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  portPillIcon: {
    fontSize: 10,
  },
  portPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink,
  },
});
