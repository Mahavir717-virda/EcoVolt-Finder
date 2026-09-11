import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { useVehiclesStore } from '../../features/vehicles';
import {
  Text,
  Button,
  Chip,
  LinearProgress,
  SkeletonCard,
  SegmentedControl,
} from '../../components';
import { colors, greennessColor, radii, shadows, spacing } from '../../theme/tokens';

interface SmartChargePlanResponse {
  startLocal: string;
  endLocal: string;
  expectedRenewablePct: number;
  expectedSavings: number;
  confidence: number;
  isImmediate: boolean;
  note: string;
}

const DEADLINE_OPTIONS = [
  { label: 'By 3:00 PM', value: '15:00' },
  { label: 'By 6:00 PM', value: '18:00' },
  { label: 'By 9:00 PM', value: '21:00' },
  { label: 'Tomorrow 8 AM', value: 'tomorrow_08:00' },
];

export const SmartChargeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const { getActiveVehicle } = useVehiclesStore();
  const activeVehicle = getActiveVehicle();

  const [deadline, setDeadline] = useState('15:00');
  const [targetEnergyKwh, setTargetEnergyKwh] = useState(18);

  // Fetch Smart Charge Plan
  const planQuery = useQuery<SmartChargePlanResponse>({
    queryKey: ['smartcharge', 'plan', deadline, targetEnergyKwh],
    queryFn: async () => {
      const res = await http.post<SmartChargePlanResponse>('/smartcharge/plan', {
        vehicleId: activeVehicle?.id || 'veh_nexon_1',
        targetKwh: targetEnergyKwh,
        deadlineTime: deadline,
      });
      return res;
    },
    staleTime: 30000,
  });

  const isPlanning = planQuery.isLoading || planQuery.isFetching;
  const plan = planQuery.data || {
    startLocal: '2026-09-12T12:00:00+05:30',
    endLocal: '2026-09-12T13:30:00+05:30',
    expectedRenewablePct: 85,
    expectedSavings: 34.0,
    confidence: 0.74,
    isImmediate: false,
    note: 'Solar peak window — 85% renewable, saves ₹34 vs charging now. Charging completes 1h 30m before your 3pm deadline.',
  };

  const isHighConf = plan.confidence >= 0.6;
  const greenColor = greennessColor(plan.expectedRenewablePct);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso.slice(11, 16);
    }
  };

  const handleProceedBooking = () => {
    navigation.navigate('BookingConfirm', {
      stationId: 'station-001',
      connectorType: 'ccs2',
    });
  };

  const handleUrgentOverride = () => {
    navigation.navigate('BookingConfirm', {
      stationId: 'station-001',
      connectorType: 'ccs2',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {/* Header Title */}
        <View style={styles.headerTitleRow}>
          <View style={styles.titleCol}>
            <Text variant="h2" style={styles.screenTitle}>
              Smart-Charge Optimizer
            </Text>
            <Text variant="caption" color={colors.ink2}>
              Automated green window scheduling to maximize ₹ savings & clean energy
            </Text>
          </View>
        </View>

        {/* Departure Deadline Selector */}
        <View style={styles.configCard}>
          <Text variant="caption" color={colors.ink2} style={styles.configLabel}>
            When do you need the car ready?
          </Text>
          <SegmentedControl
            options={DEADLINE_OPTIONS}
            value={deadline}
            onChange={setDeadline}
          />
        </View>

        {/* Computation Progress Bar */}
        {isPlanning && (
          <View style={styles.progressContainer}>
            <LinearProgress style={styles.progress} />
            <Text variant="micro" color={colors.volt} align="center">
              ⚡ Finding highest renewable solar window before {deadline}…
            </Text>
          </View>
        )}

        {/* Optimal Window Payoff Card */}
        <View style={styles.payoffCard}>
          {/* Top Banner */}
          <View style={styles.payoffHeader}>
            <View style={styles.payoffTitleCol}>
              <View style={styles.windowTimeRow}>
                <Text variant="h2" style={styles.windowTime}>
                  {formatTime(plan.startLocal)} – {formatTime(plan.endLocal)}
                </Text>
                <Chip
                  label="OPTIMAL WINDOW"
                  variant="solid"
                  color="#FFFFFF"
                  backgroundColor={colors.brand}
                />
              </View>
              <Text variant="micro" color={colors.ink2}>
                Recommended charging slot at Torrent Charging Hub
              </Text>
            </View>
          </View>

          {/* Payoff Grid: Savings, Renewable Mix, Confidence */}
          <View style={styles.payoffGrid}>
            <View style={styles.payoffItem}>
              <Text variant="micro" color={colors.ink3}>
                Tariff Savings
              </Text>
              <Text variant="h1" color={colors.brand} style={styles.savingsNum}>
                ₹{plan.expectedSavings.toFixed(0)}
              </Text>
              <Text variant="micro" color={colors.brand}>
                vs charging now
              </Text>
            </View>

            <View style={styles.payoffDivider} />

            <View style={styles.payoffItem}>
              <Text variant="micro" color={colors.ink3}>
                Renewable Share
              </Text>
              <Text variant="h1" color={greenColor} style={styles.savingsNum}>
                {plan.expectedRenewablePct}%
              </Text>
              <Text variant="micro" color={colors.ink2}>
                Solar peak
              </Text>
            </View>

            <View style={styles.payoffDivider} />

            <View style={styles.payoffItem}>
              <Text variant="micro" color={colors.ink3}>
                ML Confidence
              </Text>
              <Text
                variant="h1"
                color={isHighConf ? colors.ink : colors.warning}
                style={styles.savingsNum}
              >
                {Math.round(plan.confidence * 100)}%
              </Text>
              <Text variant="micro" color={colors.ink3}>
                {isHighConf ? 'High cert' : 'Medium'}
              </Text>
            </View>
          </View>

          {/* Human Plain Language Note (Edge Case #7) */}
          <View style={styles.noteBanner}>
            <Text variant="body" color={colors.ink} style={styles.noteText}>
              💡 {plan.note}
            </Text>
          </View>

          {/* Confidence Notice (Edge Case #13) */}
          {!isHighConf && (
            <View style={styles.lowConfNotice}>
              <Text variant="micro" color={colors.warning}>
                ⚠️ Moderate confidence window · Real-time solar output may shift slightly depending on cloud cover.
              </Text>
            </View>
          )}
        </View>

        {/* Urgent Override Section (Edge Case #8) */}
        <View style={styles.urgentCard}>
          <View style={styles.urgentLeft}>
            <Text variant="bodyMedium" style={styles.urgentTitle}>
              In a hurry?
            </Text>
            <Text variant="micro" color={colors.ink3}>
              Skip delayed scheduling and charge right away at current tariff
            </Text>
          </View>

          <Button
            label="⚡ Charge Now"
            variant="secondary"
            onPress={handleUrgentOverride}
            style={styles.urgentBtn}
          />
        </View>
      </ScrollView>

      {/* Bottom Sticky CTA */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, spacing.base) },
        ]}
      >
        <Button
          label="Lock Window & Book Slot"
          variant="primary"
          onPress={handleProceedBooking}
          style={styles.bookBtn}
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
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  configCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    ...shadows.e1,
  },
  configLabel: {
    fontFamily: 'Manrope_600SemiBold',
  },
  progressContainer: {
    gap: 6,
  },
  progress: {
    borderRadius: radii.pill,
  },
  payoffCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1.5,
    borderColor: colors.brand,
    gap: spacing.md,
    ...shadows.e2,
  },
  payoffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  payoffTitleCol: {
    flex: 1,
    gap: 2,
  },
  windowTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  windowTime: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
  },
  payoffGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3FAF5',
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  payoffItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  savingsNum: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 24,
  },
  payoffDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.line,
  },
  noteBanner: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
  },
  noteText: {
    lineHeight: 20,
  },
  lowConfNotice: {
    backgroundColor: '#FEF8EB',
    padding: spacing.sm,
    borderRadius: radii.md,
  },
  urgentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.e1,
  },
  urgentLeft: {
    flex: 1,
    gap: 2,
    marginRight: spacing.sm,
  },
  urgentTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  urgentBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
    ...shadows.e2,
  },
  bookBtn: {
    height: 50,
  },
});
