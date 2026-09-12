import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { PriceQuote, StationSummary } from '@contracts/types';
import { useVehiclesStore } from '../../features/vehicles';
import { formatConnectorName, formatProviderName } from '../../features/stations/utils';
import {
  Text,
  Button,
  Chip,
  TicketCard,
} from '../../components';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

type BookingConfirmRouteProp = RouteProp<DriverStackParamList, 'BookingConfirm'>;

interface PortDetail {
  portNumber: number;
  status: 'available' | 'booked' | 'maintenance' | 'offline';
  bookingId?: string;
  windowStart?: string;
  windowEnd?: string;
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

interface ConnectorSlot {
  connectorId: string;
  type: string;
  powerKw: number;
  status: string;
  totalCount: number;
  availableCount: number;
  bookedCount: number;
  ports?: PortDetail[];
}

interface SlotMatrixResponse {
  stationId: string;
  windowStart: string;
  windowEnd: string;
  connectors: ConnectorSlot[];
  totalFree: number;
  totalOccupied: number;
  totalCapacity: number;
}

const START_TIME_OPTIONS = [
  { label: 'Now (+5m)', offsetMins: 5 },
  { label: '+15 mins', offsetMins: 15 },
  { label: '+30 mins', offsetMins: 30 },
  { label: '+1 hour', offsetMins: 60 },
  { label: '+2 hours', offsetMins: 120 },
  { label: '+3 hours', offsetMins: 180 },
];

const DURATION_OPTIONS = [
  { label: '30 mins', mins: 30 },
  { label: '45 mins', mins: 45 },
  { label: '60 mins (Std)', mins: 60 },
  { label: '90 mins', mins: 90 },
  { label: '120 mins', mins: 120 },
];

export const ConfirmBookingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<BookingConfirmRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const queryClient = useQueryClient();
  const { getActiveVehicle } = useVehiclesStore();
  const activeVehicle = getActiveVehicle();

  const stationId = route.params?.stationId || 'station-001';
  const initialConnector = route.params?.connectorType || 'ccs2';

  const [selectedConnector, setSelectedConnector] = useState<string>(initialConnector);
  const [customStartOffset, setCustomStartOffset] = useState<number>(() => {
    if (route.params?.windowStart) {
      const diff = Math.max(5, Math.round((new Date(route.params.windowStart).getTime() - Date.now()) / (60 * 1000)));
      return diff;
    }
    return 5;
  });
  const [durationMins, setDurationMins] = useState<number>(route.params?.durationMinutes || 60);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // 1. Fetch Station Details
  const stationQuery = useQuery<StationSummary>({
    queryKey: ['station', stationId],
    queryFn: async () => {
      return http.get<StationSummary>(`/stations/${stationId}`);
    },
    staleTime: 5000,
  });

  const station = stationQuery.data;

  // Auto-sync selected connector if invalid
  useEffect(() => {
    if (station?.connectors && station.connectors.length > 0) {
      const exists = station.connectors.some((c) => c.type === selectedConnector);
      if (!exists) {
        setSelectedConnector(station.connectors[0].type);
      }
    }
  }, [station, selectedConnector]);

  // 2. Stable Dynamic Time Window (Start Time X + Interval Y)
  const bookingWindow = useMemo(() => {
    const baseStart = new Date(Date.now() + customStartOffset * 60 * 1000);
    const end = new Date(baseStart.getTime() + durationMins * 60 * 1000);
    return {
      startIso: baseStart.toISOString(),
      endIso: end.toISOString(),
      label: `${baseStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      durationMinutes: durationMins,
    };
  }, [customStartOffset, durationMins]);

  // 3. Live Slot Matrix for the exact [X, X + Y] window
  const slotQuery = useQuery<SlotMatrixResponse>({
    queryKey: ['slots', stationId, selectedConnector, bookingWindow.startIso, bookingWindow.endIso],
    queryFn: async () => {
      return http.get<SlotMatrixResponse>(`/bookings/station/${stationId}/slots`, {
        params: {
          windowStart: bookingWindow.startIso,
          windowEnd: bookingWindow.endIso,
          connectorType: selectedConnector,
        },
      });
    },
    enabled: !!stationId && !!selectedConnector,
    staleTime: 4000,
    refetchInterval: 8000,
  });

  // Derived slot metrics for selected connector & window
  const slotMatrix = slotQuery.data;
  const currentSlot = slotMatrix?.connectors.find((c) => c.type === selectedConnector);
  const freeSlots = currentSlot ? currentSlot.availableCount : (slotMatrix?.totalFree ?? null);
  const totalSlots = currentSlot ? currentSlot.totalCount : (slotMatrix?.totalCapacity ?? null);
  const slotStatus = currentSlot?.status || 'available';
  const noSlotsLeft = freeSlots !== null && freeSlots <= 0;

  // Estimated target energy for the selected duration
  const estimatedKwh = useMemo(() => {
    const power = currentSlot?.powerKw || 50;
    const hours = durationMins / 60;
    const vehicleMax = activeVehicle?.batteryKwh || 40;
    return Number(Math.min(vehicleMax, power * hours * 0.85).toFixed(1));
  }, [currentSlot?.powerKw, durationMins, activeVehicle?.batteryKwh]);

  // 4. Fetch Pricing Quote for current connector
  const quoteQuery = useQuery<PriceQuote>({
    queryKey: ['pricing', 'quote', stationId, selectedConnector, estimatedKwh],
    queryFn: async () => {
      return http.get<PriceQuote>('/pricing/quote', {
        params: { stationId, connector: selectedConnector, kwh: estimatedKwh },
      });
    },
    staleTime: 10000,
  });

  // Price Lock Countdown Timer
  const [timeLeftSec, setTimeLeftSec] = useState(1799);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleConfirmBooking = async () => {
    if (!activeVehicle?.id) {
      Alert.alert('No Vehicle', 'Please select or add a vehicle to your garage before booking.');
      return;
    }
    if (noSlotsLeft) {
      Alert.alert(
        'No Slots Available',
        `All ${formatConnectorName(selectedConnector as any)} ports are booked for ${bookingWindow.label}. Please adjust your start time or duration.`
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const createdBooking = await http.post<any>('/bookings', {
        stationId,
        connectorType: selectedConnector,
        vehicleId: activeVehicle.id,
        windowStart: bookingWindow.startIso,
        windowEnd: bookingWindow.endIso,
        priceQuoteId: `quote_${Date.now()}`,
      });

      setConfirmedBooking(createdBooking);

      // Immediately invalidate all slot, station, and booking caches across the app
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['slots'] }),
        queryClient.invalidateQueries({ queryKey: ['station'] }),
        queryClient.invalidateQueries({ queryKey: ['stations'] }),
        queryClient.invalidateQueries({ queryKey: ['nearby'] }),
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
      ]);

      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (err: any) {
      setIsSubmitting(false);
      await queryClient.invalidateQueries({ queryKey: ['slots'] });
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.error?.message ||
        err?.message ||
        'Could not lock the slot. Availability has been refreshed. Please pick another available time.';
      Alert.alert('Reservation Notice', errorMsg);
    }
  };

  if (stationQuery.isLoading || quoteQuery.isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.brand} />
        <Text style={{ marginTop: 12, color: colors.ink2 }}>Loading booking details...</Text>
      </View>
    );
  }

  const quote = quoteQuery.data;

  if (!station || !quote) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20, paddingTop: insets.top }]}>
        <Text style={{ color: colors.danger, textAlign: 'center' }}>Station or quote details unavailable.</Text>
        <Button label="Go Back" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (isSuccess) {
    const finalTariff =
      typeof confirmedBooking?.lockedPrice === 'object' && confirmedBooking?.lockedPrice !== null
        ? confirmedBooking.lockedPrice.finalPrice ?? quote.finalPrice
        : quote.finalPrice;
    const finalBookingId = confirmedBooking?.id
      ? `BK-${confirmedBooking.id.slice(0, 8).toUpperCase()}`
      : `BK-${Date.now().toString().slice(-6)}`;

    return (
      <View style={[styles.container, styles.successContainer]}>
        <Text variant="screenTitle" align="center" style={{ marginBottom: spacing.md }}>
          Slot Confirmed & Locked!
        </Text>
        
        <TicketCard
          bookingId={finalBookingId}
          stationName={confirmedBooking?.station?.name || station.name}
          dateTime={`${bookingWindow.label} (${durationMins} mins)`}
          rows={[
            { label: 'Connector', value: formatConnectorName((confirmedBooking?.connectorType || selectedConnector) as any) },
            { label: 'Vehicle', value: confirmedBooking?.vehicle?.model || activeVehicle?.model || 'Tata Nexon EV Max' },
            { label: 'Locked Tariff', value: `₹${Number(finalTariff).toFixed(2)}/kWh`, highlight: true },
            { label: 'Estimated Total', value: `₹${(Number(finalTariff) * estimatedKwh).toFixed(2)} (${estimatedKwh} kWh)` },
          ]}
          style={{ marginBottom: spacing.xl }}
        />

        <Button
          label="View Bookings & History"
          variant="primary"
          onPress={() => navigation.navigate('Bookings')}
          style={styles.doneBtn}
        />
        <Button
          label="Back to Map"
          variant="ghost"
          onPress={() =>
            navigation.navigate('DriverTabs', {
              screen: 'Explore',
            })
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {/* Header */}
        <View style={styles.headerTitleRow}>
          <View style={styles.titleCol}>
            <Text variant="sectionLabel" style={styles.screenTitle}>
              Confirm Reservation
            </Text>
            <Text variant="caption" color={colors.ink2}>
              Choose interval & lock live port availability
            </Text>
          </View>
        </View>

        {/* 1. Station & Vehicle Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.stationRow}>
            <View style={styles.stationTitleCol}>
              <Text variant="cardTitle" style={styles.stationName}>
                {station.name}
              </Text>
              <Text variant="micro" color={colors.ink2}>
                {formatProviderName(station.provider)} · {station.operatorName}
              </Text>
            </View>
            <Chip
              label={`${station.greenness.renewablePct}% Green`}
              variant="subtle"
              color={colors.brand}
              backgroundColor={colors.brandTint}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.vehicleRow}>
            <View style={styles.vehicleInfo}>
              <Text variant="micro" color={colors.ink3}>
                Vehicle Assigned
              </Text>
              <Text variant="body" style={styles.vehicleModel}>
                {activeVehicle?.model || 'Tata Nexon EV Max'}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Start Time & Duration (X to X+Y) Selector Card */}
        <View style={styles.timeWindowCard}>
          <View style={styles.timeWindowHeader}>
            <View>
              <Text variant="cardTitle" style={styles.timeWindowTitle}>
                🕒 Time Window & Duration (X to X+Y)
              </Text>
              <Text variant="micro" color={colors.ink2}>
                Slots for the entire {durationMins}-min interval will be locked
              </Text>
            </View>
            <Chip
              label="SOLAR PEAK"
              variant="solid"
              color="#FFFFFF"
              backgroundColor={colors.brand}
            />
          </View>

          {/* Start Time (X) Picker */}
          <View style={styles.selectorGroup}>
            <Text variant="caption" style={styles.selectorLabel}>
              1. Select Start Time (X):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {START_TIME_OPTIONS.map((opt) => {
                const isSelected = customStartOffset === opt.offsetMins;
                return (
                  <TouchableOpacity
                    key={opt.offsetMins}
                    onPress={() => setCustomStartOffset(opt.offsetMins)}
                    style={[styles.timeChip, isSelected && styles.timeChipActive]}
                  >
                    <Text
                      variant="micro"
                      style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Duration (Y) Picker */}
          <View style={styles.selectorGroup}>
            <Text variant="caption" style={styles.selectorLabel}>
              2. Select Charging Interval / Duration (Y):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = durationMins === opt.mins;
                return (
                  <TouchableOpacity
                    key={opt.mins}
                    onPress={() => setDurationMins(opt.mins)}
                    style={[styles.timeChip, isSelected && styles.timeChipActive]}
                  >
                    <Text
                      variant="micro"
                      style={[styles.timeChipText, isSelected && styles.timeChipTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Formatted Interval Display */}
          <View style={styles.timeBox}>
            <Text variant="sectionLabel" color={colors.brand} style={styles.timeBig}>
              {bookingWindow.label}
            </Text>
            <Text variant="micro" color={colors.ink2}>
              Duration: {durationMins} minutes · Target: ~{estimatedKwh} kWh
            </Text>
          </View>
        </View>

        {/* 3. Live Charger Selection & Port Status Breakdown for this Interval */}
        <View style={styles.connectorSectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text variant="cardTitle" style={styles.sectionHeading}>
                Charger Ports for Selected Window
              </Text>
              <Text variant="micro" color={colors.ink2}>
                Availability during {bookingWindow.label} ({slotMatrix?.totalFree ?? 0}/{slotMatrix?.totalCapacity ?? 0} free)
              </Text>
            </View>
          </View>

          {/* Charger Type Selector Pills */}
          {station.connectors && station.connectors.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chargerPillsList}>
              {station.connectors.map((c) => {
                const cSlot = slotMatrix?.connectors.find((item) => item.type === c.type);
                const freeCount = cSlot ? cSlot.availableCount : (c.available ?? c.total ?? 1);
                const totCount = cSlot ? cSlot.totalCount : (c.total ?? 1);
                const isSelected = selectedConnector === c.type;

                return (
                  <TouchableOpacity
                    key={c.type}
                    activeOpacity={0.8}
                    onPress={() => setSelectedConnector(c.type)}
                    style={[
                      styles.chargerPill,
                      isSelected && styles.chargerPillSelected,
                    ]}
                  >
                    <View style={styles.pillTop}>
                      <Text
                        variant="bodyMedium"
                        style={[styles.pillTitle, isSelected && styles.pillTitleSelected]}
                      >
                        {formatConnectorName(c.type as any)}
                      </Text>
                      <Text variant="micro" color={isSelected ? colors.brand : colors.ink3}>
                        {c.powerKw}kW
                      </Text>
                    </View>

                    <View style={styles.pillBottom}>
                      <View
                        style={[
                          styles.statusDotSmall,
                          { backgroundColor: freeCount > 0 ? colors.brand : '#EF4444' },
                        ]}
                      />
                      <Text
                        variant="micro"
                        style={{
                          color: freeCount > 0 ? (isSelected ? colors.brand : colors.ink2) : '#EF4444',
                          fontWeight: '600',
                        }}
                      >
                        {freeCount}/{totCount} Free
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Detailed Port Status Visualizer for selected connector & window */}
          <View style={styles.portDetailBox}>
            <View style={styles.portDetailHeader}>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>
                {formatConnectorName(selectedConnector as any)} Ports ({bookingWindow.label})
              </Text>
              <Chip
                label={
                  slotStatus === 'maintenance' || slotStatus === 'offline'
                    ? `⛔ ${slotStatus}`
                    : freeSlots === 0
                    ? '🔴 0 Ports Free'
                    : freeSlots === 1
                    ? '🟡 1 Port Left'
                    : `🟢 ${freeSlots} of ${totalSlots} Ports Free`
                }
                variant="subtle"
                color={freeSlots === 0 ? '#EF4444' : freeSlots === 1 ? '#D97706' : colors.brand}
                backgroundColor={freeSlots === 0 ? '#FEF2F2' : freeSlots === 1 ? '#FFFBEB' : '#EDF7F0'}
              />
            </View>

            {/* Visual Ports Grid */}
            <View style={styles.portsGrid}>
              {currentSlot?.ports && currentSlot.ports.length > 0 ? (
                currentSlot.ports.map((port) => (
                  <View
                    key={port.portNumber}
                    style={[
                      styles.portBox,
                      port.status === 'available'
                        ? styles.portBoxAvailable
                        : styles.portBoxBooked,
                    ]}
                  >
                    <Text style={styles.portIcon}>
                      {port.status === 'available' ? '⚡' : '🔒'}
                    </Text>
                    <Text variant="micro" style={styles.portName}>
                      Port #{port.portNumber}
                    </Text>
                    <Text
                      variant="micro"
                      style={[
                        styles.portStatusText,
                        { color: port.status === 'available' ? colors.brand : '#EF4444' },
                      ]}
                    >
                      {port.status === 'available'
                        ? 'Free for Window'
                        : port.windowStart && port.windowEnd
                        ? `Booked (${formatSlotTime(port.windowStart)} – ${formatSlotTime(port.windowEnd)})`
                        : 'Booked for Window'}
                    </Text>
                  </View>
                ))
              ) : (
                Array.from({ length: totalSlots || 2 }).map((_, idx) => {
                  const isAvailable = idx < (freeSlots ?? 1);
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.portBox,
                        isAvailable ? styles.portBoxAvailable : styles.portBoxBooked,
                      ]}
                    >
                      <Text style={styles.portIcon}>{isAvailable ? '⚡' : '🔒'}</Text>
                      <Text variant="micro" style={styles.portName}>
                        Port #{idx + 1}
                      </Text>
                      <Text
                        variant="micro"
                        style={[
                          styles.portStatusText,
                          { color: isAvailable ? colors.brand : '#EF4444' },
                        ]}
                      >
                        {isAvailable ? 'Free for Window' : 'Booked for Window'}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>

        {/* 4. Price-Lock Guarantee Card */}
        <View style={styles.priceLockCard}>
          <View style={styles.priceLockHeader}>
            <View style={styles.priceLockTitleCol}>
              <Text variant="cardTitle" color={colors.brand} style={styles.priceLockTitle}>
                🔒 Guaranteed Price Lock
              </Text>
              <Text variant="micro" color={colors.ink3}>
                Quoted tariff is held until countdown expires
              </Text>
            </View>

            <View style={styles.timerBadge}>
              <Text variant="caption" color={colors.brand} style={styles.timerText}>
                ⏱ {formatCountdown(timeLeftSec)}
              </Text>
            </View>
          </View>

          <View style={styles.priceGrid}>
            <View style={styles.priceCol}>
              <Text variant="micro" color={colors.ink3}>
                Locked Tariff
              </Text>
              <Text variant="cardTitle" color={colors.brand} style={styles.priceValue}>
                ₹{quote.finalPrice.toFixed(2)}/kWh
              </Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.priceCol}>
              <Text variant="micro" color={colors.ink3}>
                Estimated kWh
              </Text>
              <Text variant="cardTitle" style={styles.priceValue}>
                {estimatedKwh} kWh
              </Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.priceCol}>
              <Text variant="micro" color={colors.ink3}>
                Estimated Cost
              </Text>
              <Text variant="cardTitle" color={colors.ink} style={styles.priceValue}>
                ₹{(quote.finalPrice * estimatedKwh).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.priceLockFooter}>
            <Text variant="micro" color={colors.ink3}>
              🛡️ Locked at ₹{quote.finalPrice.toFixed(2)}/kWh for full {durationMins}-min duration.
            </Text>
          </View>
        </View>

        {/* 5. Cancellation Policy */}
        <View style={styles.policyCard}>
          <Text variant="micro" color={colors.ink2}>
            ℹ️ <Text variant="micro" style={styles.boldText}>Free Cancellation:</Text> Cancel anytime up to 15 minutes before your slot with zero cancellation fees.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Confirm CTA */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, spacing.base) },
        ]}
      >
        <Button
          label={
            noSlotsLeft
              ? '🔴 Selected Interval Fully Booked'
              : isSubmitting
              ? 'Reserving Slot…'
              : `Confirm & Lock Slot (₹${(quote.finalPrice * estimatedKwh).toFixed(0)})`
          }
          variant="primary"
          busy={isSubmitting}
          disabled={noSlotsLeft || isSubmitting}
          onPress={handleConfirmBooking}
          style={noSlotsLeft ? { ...styles.confirmBtn, ...styles.confirmBtnDisabled } : styles.confirmBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  screenTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.e1,
  },
  stationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stationTitleCol: {
    flex: 1,
    gap: 2,
  },
  stationName: {
    fontFamily: 'Manrope_700Bold',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
    gap: 2,
  },
  vehicleModel: {
    fontFamily: 'Manrope_700Bold',
  },
  timeWindowCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.e1,
  },
  timeWindowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timeWindowTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  selectorGroup: {
    gap: 6,
  },
  selectorLabel: {
    fontFamily: 'Manrope_600SemiBold',
    color: colors.ink2,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  timeChipText: {
    color: colors.ink,
    fontWeight: '600',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },
  timeBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeBig: {
    fontFamily: 'Manrope_700Bold',
  },
  connectorSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.e1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeading: {
    fontFamily: 'Manrope_700Bold',
  },
  chargerPillsList: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  chargerPill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1.5,
    borderColor: colors.border,
    minWidth: 120,
    gap: 4,
  },
  chargerPillSelected: {
    borderColor: colors.brand,
    backgroundColor: '#EDF7F0',
  },
  pillTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  pillTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: colors.ink,
  },
  pillTitleSelected: {
    color: colors.brand,
  },
  pillBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  portDetailBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  portDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  portBox: {
    flex: 1,
    minWidth: '28%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
  },
  portBoxAvailable: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.brand,
  },
  portBoxBooked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  portIcon: {
    fontSize: 16,
  },
  portName: {
    fontWeight: '700',
    color: colors.ink,
  },
  portStatusText: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  priceLockCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.brandTint,
    gap: spacing.md,
    ...shadows.e1,
  },
  priceLockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  priceLockTitleCol: {
    flex: 1,
    gap: 2,
  },
  priceLockTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  timerBadge: {
    backgroundColor: colors.brandTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  timerText: {
    fontFamily: 'Manrope_700Bold',
  },
  priceGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  priceValue: {
    fontFamily: 'Manrope_700Bold',
  },
  priceDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  priceLockFooter: {
    paddingTop: 2,
  },
  policyCard: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boldText: {
    fontFamily: 'Manrope_700Bold',
    color: colors.ink,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.base,
    paddingHorizontal: spacing.base,
    ...shadows.e2,
  },
  confirmBtn: {
    width: '100%',
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  successContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  doneBtn: {
    width: '100%',
    marginBottom: spacing.sm,
  },
});
