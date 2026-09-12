import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { PriceQuote, StationSummary } from '@contracts/types';
import { useVehiclesStore } from '../../features/vehicles';
import { formatConnectorName, formatProviderName } from '../../features/stations/utils';
import {
  Text,
  Button,
  Chip,
  Card,
  TicketCard,
} from '../../components';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

type BookingConfirmRouteProp = RouteProp<DriverStackParamList, 'BookingConfirm'>;

export const ConfirmBookingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<BookingConfirmRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const { getActiveVehicle } = useVehiclesStore();
  const activeVehicle = getActiveVehicle();

  const stationId = route.params?.stationId || 'station-001';
  const connectorType = route.params?.connectorType || 'ccs2';

  // 1. Fetch Station
  const stationQuery = useQuery<StationSummary>({
    queryKey: ['station', stationId],
    queryFn: async () => {
      const res = await http.get<StationSummary>(`/stations/${stationId}`);
      return res;
    },
    staleTime: 30000,
  });

  // 2. Fetch Pricing Quote
  const quoteQuery = useQuery<PriceQuote>({
    queryKey: ['pricing', 'quote', stationId, connectorType],
    queryFn: async () => {
      const res = await http.get<PriceQuote>('/pricing/quote', {
        params: { stationId, connector: connectorType, kwh: 18 },
      });
      return res;
    },
    staleTime: 30000,
  });

  const station = stationQuery.data || {
    id: 'station-001',
    name: 'Torrent Charging Hub – CG Road',
    location: { lat: 23.0370, lng: 72.5622 },
    operatorName: 'Green Drive Pvt Ltd',
    provider: 'torrent_power' as const,
    connectors: [],
    greenness: { renewablePct: 85, band: 'very_high' as const, quality: 'mock' as const },
    priceFrom: 6.2,
  };

  const quote = quoteQuery.data || {
    stationId,
    connectorType: connectorType as any,
    baseTariff: 5.5,
    providerMarkup: 0.5,
    touAdjustment: 0.2,
    finalPrice: 6.2,
    isEstimate: true,
    currency: 'INR' as const,
    validUntil: new Date(Date.now() + 1800000).toISOString(),
  };

  // Price Lock Countdown Timer (Edge Case #17)
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
    setIsSubmitting(true);
    try {
      await http.post('/bookings', {
        stationId,
        connectorType,
        vehicleId: activeVehicle?.id || 'veh_nexon_1',
        windowStart: '2026-09-12T12:00:00+05:30',
        windowEnd: '2026-09-12T13:30:00+05:30',
        priceQuoteId: `quote_${Date.now()}`,
      });

      setIsSubmitting(false);
      setIsSuccess(true);
    } catch {
      setIsSubmitting(false);
      Alert.alert('Booking Error', 'Could not lock the slot. Please try again.');
    }
  };

  if (isSuccess) {
    return (
      <View style={[styles.container, styles.successContainer]}>
        <Text variant="screenTitle" align="center" style={{ marginBottom: spacing.md }}>
          Slot Booked!
        </Text>
        
        <TicketCard
          bookingId={`BK-${Date.now().toString().slice(-6)}`}
          stationName={station.name}
          dateTime="12:00 PM – 1:30 PM (Solar Peak)"
          rows={[
            { label: 'Connector', value: formatConnectorName(connectorType as any) },
            { label: 'Vehicle', value: activeVehicle?.model || 'Tata Nexon EV Max' },
            { label: 'Locked Tariff', value: `₹${quote.finalPrice.toFixed(2)}/kWh`, highlight: true },
          ]}
          style={{ marginBottom: spacing.xl }}
        />

          <Button
            label="View Active Session"
            variant="primary"
            onPress={() =>
              navigation.navigate('DriverTabs', {
                screen: 'Activity',
              })
            }
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
              Review slot parameters and lock quoted charging rate
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

            <View style={styles.connectorInfo}>
              <Text variant="micro" color={colors.ink3}>
                Connector
              </Text>
              <Text variant="body" color={colors.brand} style={styles.connType}>
                {formatConnectorName(connectorType as any)}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Scheduled Time Window Card */}
        <View style={styles.timeWindowCard}>
          <View style={styles.timeWindowHeader}>
            <Text variant="cardTitle" style={styles.timeWindowTitle}>
              Scheduled Slot Window
            </Text>
            <Chip
              label="SOLAR PEAK"
              variant="solid"
              color="#FFFFFF"
              backgroundColor={colors.brand}
            />
          </View>

          <View style={styles.timeBox}>
            <Text variant="sectionLabel" color={colors.brand} style={styles.timeBig}>
              12:00 PM – 1:30 PM
            </Text>
            <Text variant="micro" color={colors.ink2}>
              Today · 85% expected renewable generation
            </Text>
          </View>
        </View>

        {/* 3. Price-Lock Guarantee Card (Edge Case #17) */}
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
                Target kWh
              </Text>
              <Text variant="cardTitle" style={styles.priceValue}>
                18.0 kWh
              </Text>
            </View>

            <View style={styles.priceDivider} />

            <View style={styles.priceCol}>
              <Text variant="micro" color={colors.ink3}>
                Estimated Cost
              </Text>
              <Text variant="cardTitle" color={colors.ink} style={styles.priceValue}>
                ₹{(quote.finalPrice * 18).toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.priceLockFooter}>
            <Text variant="micro" color={colors.ink3}>
              🛡️ Session bills at locked ₹{quote.finalPrice.toFixed(2)}/kWh even if manager tariffs change.
            </Text>
          </View>
        </View>

        {/* 4. Cancellation Policy */}
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
          label={isSubmitting ? 'Reserving Slot…' : `Confirm & Lock Slot (₹${(quote.finalPrice * 18).toFixed(0)})`}
          variant="primary"
          busy={isSubmitting}
          onPress={handleConfirmBooking}
          style={styles.confirmBtn}
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
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    gap: 2,
  },
  vehicleModel: {
    fontFamily: 'Manrope_700Bold',
  },
  connectorInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  connType: {
    fontFamily: 'Manrope_700Bold',
  },
  timeWindowCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.e1,
  },
  timeWindowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeWindowTitle: {
    fontFamily: 'Manrope_600SemiBold',
  },
  timeBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  timeBig: {
    fontFamily: 'Manrope_700Bold',
  },
  priceLockCard: {
    backgroundColor: '#F3FAF5',
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.brand,
    gap: spacing.sm,
    ...shadows.e2,
  },
  priceLockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingHorizontal: 8,
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
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  priceCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  priceValue: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
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
    padding: spacing.md,
    borderRadius: radii.md,
  },
  boldText: {
    fontFamily: 'Manrope_700Bold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
    ...shadows.e2,
  },
  confirmBtn: {
    height: 50,
  },
  successContainer: {
    justifyContent: 'center',
    padding: spacing.base,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.e2,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  successMsg: {
    lineHeight: 22,
  },
  successDetailsBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: spacing.md,
    width: '100%',
    gap: 4,
  },
  doneBtn: {
    width: '100%',
    height: 48,
    marginTop: spacing.xs,
  },
});
