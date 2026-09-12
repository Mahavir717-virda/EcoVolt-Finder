import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { Session } from '@contracts/types';
import { DataQuality, GreennessBand } from '@contracts/enums';
import {
  Text,
  Button,
  Chip,
  Card,
  LinearProgress,
  ChargingPulse,
  CircularGauge,
  BatteryPill,
  StatColumn,
  Spinner,
} from '../../components';
import { colors, radii, shadows, spacing, greennessColor, greennessBandLabel } from '../../theme/tokens';
import { formatConnectorName } from '../../features/stations/utils';
import { useVehiclesStore } from '../../features/vehicles';

export interface ActiveSessionData extends Session {
  stationName?: string;
  startChargePct?: number;
  currentChargePct?: number;
  targetChargePct?: number;
  powerKw?: number;
  lockedPrice?: number;
  connectorOffline?: boolean;
  gridGreenness?: {
    renewablePct: number;
    band: GreennessBand;
    quality: DataQuality;
    zoneId?: string;
  };
}

export const ActiveSessionScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const { getActiveVehicle } = useVehiclesStore();
  const activeVehicle = getActiveVehicle();

  // Accessibility / Reduced Motion detection
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  // UI / Demo interactive states
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [simulatedKwhOffset, setSimulatedKwhOffset] = useState(0);

  // 1. React Query: Poll active session every 3 seconds
  const sessionQuery = useQuery<ActiveSessionData | null>({
    queryKey: ['session', 'active'],
    queryFn: async () => {
      try {
        const res = await http.get<ActiveSessionData>('/sessions/active');
        return res;
      } catch {
        return null;
      }
    },
    refetchInterval: sessionCompleted ? false : 3000,
  });

  // Simulated live increment over time while session is running and online
  useEffect(() => {
    if (sessionCompleted || isSimulatedOffline) return;
    const interval = setInterval(() => {
      setSimulatedKwhOffset((prev) => prev + 0.05);
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionCompleted, isSimulatedOffline]);

  const rawSession = sessionQuery.data;
  const isConnectorOffline = isSimulatedOffline || rawSession?.connectorOffline || false;

  // Session values derived with live accumulation
  const startChargePct = rawSession?.startChargePct ?? 42;
  const targetChargePct = rawSession?.targetChargePct ?? 80;
  const lockedPrice = rawSession?.lockedPrice ?? 6.20; // Edge Case #17: Locked Price
  const baseEnergyKwh = rawSession?.energyKwh ?? 14.8;
  const currentDeliveredKwh = Number((baseEnergyKwh + simulatedKwhOffset).toFixed(2));
  
  // Progress computation
  const vehicleBatteryCapacity = activeVehicle?.batteryKwh ?? 40.5; // Nexon EV standard kWh
  const addedPct = Math.min(
    Math.round((simulatedKwhOffset / vehicleBatteryCapacity) * 100),
    targetChargePct - startChargePct
  );
  const currentChargePct = Math.min(
    (rawSession?.currentChargePct ?? 64) + addedPct,
    targetChargePct
  );
  
  // Progress fraction towards target for LinearProgress
  const totalTargetRange = Math.max(targetChargePct - startChargePct, 1);
  const currentProgressTowardsTarget = Math.min(
    Math.max((currentChargePct - startChargePct) / totalTargetRange, 0),
    1
  );

  // Financial calculation strictly based on locked rate (Edge Case #17)
  const currentCost = Number((currentDeliveredKwh * lockedPrice).toFixed(2));
  const currentCo2Avoided = Number((currentDeliveredKwh * 0.72).toFixed(1)); // ~0.72 kg CO2 avoided per clean kWh
  const avgRenewablePct = rawSession?.avgRenewablePct ?? 84;
  const gridRenewablePct = rawSession?.gridGreenness?.renewablePct ?? 85;
  const gridZone = rawSession?.gridGreenness?.zoneId ?? 'IN-WE';
  const gridQuality = rawSession?.gridGreenness?.quality ?? 'live';
  const powerKw = isConnectorOffline ? 0 : (rawSession?.powerKw ?? 52.4);

  // 2. Mutation: Stop Session
  const stopSessionMutation = useMutation({
    mutationFn: async () => {
      return await http.post(`/sessions/${rawSession?.id || 'sess_live_101'}/stop`, {});
    },
    onSuccess: () => {
      setSessionCompleted(true);
    },
    onError: () => {
      // Graceful fallback for offline demo
      setSessionCompleted(true);
    },
  });

  const handleStopSession = () => {
    stopSessionMutation.mutate();
  };

  // ─── COMPLETION SUMMARY VIEW ─────────────────────────────
  if (sessionCompleted) {
    return (
      <View style={[styles.container, styles.completionContainer]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.completionScrollContent,
            { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
          ]}
        >
          {/* Success Check Badge */}
          <View style={styles.completionHeader}>
            <View style={styles.completedBadgeCircle}>
              <Text style={styles.completedBadgeIcon}>✓</Text>
            </View>
            <Text variant="screenTitle" align="center" style={styles.completedTitle}>
              Charging Completed
            </Text>
            <Text variant="body" color={colors.ink2} align="center" style={styles.completedSubtitle}>
              Your EV is charged and ready to roll clean energy.
            </Text>
          </View>

          {/* Core Summary Card */}
          <Card elevation="e1" style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <StatColumn
                label="DELIVERED ENERGY"
                value={`${currentDeliveredKwh.toFixed(1)} kWh`}
                valueColor={colors.ink}
              />
              <View style={styles.summaryDivider} />
              <StatColumn
                label="TOTAL BILLED (LOCKED)"
                value={`₹${currentCost.toFixed(2)}`}
                valueColor={colors.brand}
              />
            </View>

            <View style={styles.horizontalRule} />

            <View style={styles.summaryRow}>
              <StatColumn
                label="AVG RENEWABLE MIX"
                value={`${avgRenewablePct}% ☀️`}
                valueColor={colors.brand}
              />
              <View style={styles.summaryDivider} />
              <StatColumn
                label="CO₂ AVOIDED"
                value={`${currentCo2Avoided} kg`}
                valueColor={colors.brand}
              />
            </View>

            {/* Edge Case #17 Guarantee Note */}
            <View style={styles.priceGuaranteeBox}>
              <Text variant="micro" color={colors.ink2}>
                🛡️ Billed at locked reservation rate of ₹{lockedPrice.toFixed(2)}/kWh
              </Text>
            </View>
          </Card>

          {/* Session Details List */}
          <Card elevation="e0" style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text variant="caption" color={colors.ink2}>
                Station
              </Text>
              <Text variant="body" color={colors.ink}>
                {rawSession?.stationName || 'Torrent Charging Hub – CG Road'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="caption" color={colors.ink2}>
                Connector
              </Text>
              <Text variant="body" color={colors.ink}>
                {formatConnectorName((rawSession?.connectorType as any) || 'ccs2')}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text variant="caption" color={colors.ink2}>
                Final Battery Level
              </Text>
              <Text variant="body" color={colors.brand}>
                {currentChargePct}% (Target reached)
              </Text>
            </View>
          </Card>

          {/* Actions */}
          <View style={styles.completionActions}>
            <Button
              label="Back to Map"
              variant="primary"
              onPress={() =>
                navigation.navigate('DriverTabs', {
                  screen: 'Explore',
                })
              }
              style={styles.doneBtn}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── ACTIVE CHARGING LIVE VIEW ───────────────────────────
  if (!rawSession && !sessionQuery.isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl, paddingTop: insets.top }]}>
        <Text variant="screenTitle" align="center" style={{ marginBottom: spacing.sm }}>
          No Active Session
        </Text>
        <Text variant="body" color={colors.ink2} align="center" style={{ marginBottom: spacing.xl }}>
          You do not have an ongoing charging session right now.
        </Text>
        <Button
          label="Explore Stations"
          variant="primary"
          onPress={() => navigation.navigate('DriverTabs', { screen: 'Explore' })}
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
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.headerTitleCol}>
            <Text variant="sectionLabel" style={styles.headerStationName}>
              {rawSession?.stationName || 'Torrent Charging Hub – CG Road'}
            </Text>
            <Text variant="caption" color={colors.ink2}>
              {formatConnectorName((rawSession?.connectorType as any) || 'ccs2')} · Fast DC
            </Text>
          </View>

          {/* Status Indicator Chip */}
          <Chip
            label={isConnectorOffline ? 'OFFLINE' : '● LIVE CHARGING'}
            variant="solid"
            color="#FFFFFF"
            backgroundColor={isConnectorOffline ? colors.danger : colors.brand}
          />
        </View>

        {/* Demo Toolbar: Toggle edge cases and reduced motion */}
        <View style={styles.demoBar}>
          <TouchableOpacity
            style={[styles.demoPill, isConnectorOffline && styles.demoPillActive]}
            onPress={() => setIsSimulatedOffline(!isConnectorOffline)}
            accessibilityRole="button"
            accessibilityLabel="Toggle connector offline state"
          >
            <Text variant="micro" color={isConnectorOffline ? colors.danger : colors.ink2}>
              {isConnectorOffline ? '🔌 Reset Connector Online' : '⚠️ Test Edge Case #18 (Offline)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.demoPill, reduceMotion && styles.demoPillActive]}
            onPress={() => setReduceMotion(!reduceMotion)}
            accessibilityRole="button"
            accessibilityLabel="Toggle reduced motion"
          >
            <Text variant="micro" color={colors.ink2}>
              {reduceMotion ? '⚡ Motion: Reduced' : '⚡ Motion: Standard'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* EDGE CASE #18: Connector Offline Alert Banner */}
        {isConnectorOffline && (
          <Card elevation="e1" style={styles.offlineBannerCard}>
            <View style={styles.offlineBannerHeader}>
              <View style={styles.offlineIconBadge}>
                <Text style={styles.offlineIconText}>⚠️</Text>
              </View>
              <View style={styles.offlineHeaderTextCol}>
                <Text variant="cardTitle" color={colors.danger}>
                  Connector Offline / Interrupted
                </Text>
                <Text variant="caption" color={colors.ink2}>
                  Grid handshake paused at connector #{rawSession?.connectorType || 'CCS2'}
                </Text>
              </View>
            </View>

            <Text variant="body" color={colors.ink} style={styles.offlineExplanation}>
              All <Text variant="body">{currentDeliveredKwh} kWh</Text> delivered up to this
              interruption has been safely recorded and billed at your locked rate (
              <Text variant="body" color={colors.brand}>
                ₹{currentCost.toFixed(2)}
              </Text>
              ).
            </Text>

            <View style={styles.offlineStepsBox}>
              <Text variant="caption" color={colors.ink2} style={styles.offlineStepText}>
                1. Safely unplug connector from your vehicle.
              </Text>
              <Text variant="caption" color={colors.ink2} style={styles.offlineStepText}>
                2. Tap below to finalize your session or find an alternative charger.
              </Text>
            </View>

            <View style={styles.offlineActionsRow}>
              <Button
                label="Finalize Session"
                variant="primary"
                onPress={handleStopSession}
                busy={stopSessionMutation.isPending}
                style={styles.offlineActionBtn}
              />
              <Button
                label="Find Nearby Charger"
                variant="secondary"
                onPress={() =>
                  navigation.navigate('DriverTabs', {
                    screen: 'Explore',
                  })
                }
                style={styles.offlineActionBtn}
              />
            </View>
          </Card>
        )}

        {/* HERO DARK PANEL: Single Animated Pulse & Living Telemetry */}
        <View style={styles.heroDarkPanel}>
          <View style={styles.heroGlowContainer}>
            <CircularGauge
              value={`${currentChargePct}`}
              unit="%"
              label={isConnectorOffline ? 'STOPPED' : 'CHARGING'}
              progress={currentChargePct / 100}
              size={180}
              ringColor={isConnectorOffline ? colors.danger : colors.brand}
              glowPulse={!isConnectorOffline}
            />
          </View>

          {/* Subtitle & Target Info */}
          <Text variant="body" color="#FFFFFF" align="center" style={styles.heroTargetSubtitle}>
            Target {targetChargePct}% · ~{Math.max(1, Math.round((targetChargePct - currentChargePct) * 0.8))} min remaining
          </Text>

          {/* Determinate Linear Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelsRow}>
              <Text variant="caption" color="#8A998F">
                Start: {startChargePct}%
              </Text>
              <Text variant="caption" color={colors.brand}>
                Now: {currentChargePct}%
              </Text>
              <Text variant="caption" color="#8A998F">
                Target: {targetChargePct}%
              </Text>
            </View>

            <LinearProgress
              progress={currentProgressTowardsTarget}
              indeterminate={false}
              color={colors.brand}
              backgroundColor="#1B3026"
              height={8}
              reduceMotion={reduceMotion}
              style={styles.linearProgressBar}
            />
          </View>
        </View>

        {/* 4-METRIC GRID: Energy, Speed, Cost, CO2 */}
        <View style={styles.metricGrid}>
          {/* Metric 1: Delivered Energy */}
          <Card elevation="e0" style={styles.metricCell}>
            <StatColumn
              label="ENERGY DELIVERED"
              value={`${currentDeliveredKwh.toFixed(1)} kWh`}
              valueColor={colors.ink}
            />
          </Card>

          {/* Metric 2: Live Power Speed */}
          <Card elevation="e0" style={styles.metricCell}>
            <StatColumn
              label="POWER SPEED"
              value={`${powerKw.toFixed(1)} kW`}
              valueColor={colors.brand}
            />
          </Card>

          {/* Metric 3: Live Accrued Cost */}
          <Card elevation="e0" style={styles.metricCell}>
            <StatColumn
              label="ACCRUED COST"
              value={`₹${currentCost.toFixed(2)}`}
              valueColor={colors.brand}
            />
          </Card>

          {/* Metric 4: CO2 Avoided */}
          <Card elevation="e0" style={styles.metricCell}>
            <StatColumn
              label="CO₂ AVOIDED"
              value={`${currentCo2Avoided} kg`}
              valueColor={colors.brand}
            />
          </Card>
        </View>

        {/* EDGE CASE #17: Explicit Price Lock Card */}
        <Card elevation="e1" style={styles.priceLockCard}>
          <View style={styles.priceLockHeader}>
            <View style={styles.priceLockTitleCol}>
              <Text variant="cardTitle" color={colors.ink}>
                Locked Rate Billing
              </Text>
              <Text variant="caption" color={colors.ink2}>
                Session bills fixed rate of ₹{lockedPrice.toFixed(2)}/kWh
              </Text>
            </View>
            <Chip
              label="PRICE LOCKED"
              variant="subtle"
              color={colors.brand}
              backgroundColor={colors.brandTint}
            />
          </View>

          <View style={styles.priceFormulaRow}>
            <Text variant="caption" color={colors.ink2}>
              Calculation:
            </Text>
            <Text variant="body" color={colors.ink} style={styles.tabularNumber}>
              {currentDeliveredKwh.toFixed(2)} kWh × ₹{lockedPrice.toFixed(2)} = ₹{currentCost.toFixed(2)}
            </Text>
          </View>
        </Card>

        {/* LIVE GREENNESS & GRID MIX CARD */}
        <Card elevation="e0" style={styles.greennessCard}>
          <View style={styles.greennessHeaderRow}>
            <View style={styles.greennessTextCol}>
              <Text variant="cardTitle" color={colors.ink}>
                Live Grid Renewable Mix
              </Text>
              <Text variant="caption" color={colors.ink2}>
                {gridZone} Grid · {greennessBandLabel(gridRenewablePct)}
              </Text>
            </View>

            <Chip
              label={`${gridRenewablePct}% Green`}
              variant="solid"
              color="#FFFFFF"
              backgroundColor={greennessColor(gridRenewablePct)}
            />
          </View>

          <View style={styles.gridQualityRow}>
            <Text variant="micro" color={colors.ink3}>
              DATA QUALITY: {gridQuality.toUpperCase()} TELEMETRY
            </Text>
            <Text variant="micro" color={colors.ink3}>
              AVG SESSION GREENNESS: {avgRenewablePct}%
            </Text>
          </View>
        </Card>

        {/* STOP CHARGING CTA */}
        <View style={styles.stopActionSection}>
          <Button
            label="Stop Charging Session"
            variant="danger"
            onPress={handleStopSession}
            busy={stopSessionMutation.isPending}
            style={styles.stopButton}
          />
          <Text variant="caption" color={colors.ink3} align="center" style={styles.safetyHint}>
            Safe stop protocol securely unlocks your connector socket upon termination.
          </Text>
        </View>
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
  tabularNumber: {
    fontVariant: ['tabular-nums'],
  },

  // Top Header Bar
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerStationName: {
    color: colors.ink,
    fontSize: 20,
  },

  // Demo Control Bar
  demoBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  demoPill: {
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoPillActive: {
    borderColor: colors.danger,
    backgroundColor: '#FDEDED',
  },

  // Edge Case #18: Offline Banner Card
  offlineBannerCard: {
    backgroundColor: '#FFF7F5',
    borderColor: colors.danger,
    borderWidth: 1,
    marginBottom: spacing.base,
    padding: spacing.base,
    borderRadius: radii.md,
  },
  offlineBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  offlineIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDE8E4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  offlineIconText: {
    fontSize: 18,
  },
  offlineHeaderTextCol: {
    flex: 1,
  },
  offlineExplanation: {
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  offlineStepsBox: {
    backgroundColor: '#FFFFFF',
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.base,
  },
  offlineStepText: {
    marginBottom: 4,
  },
  offlineActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  offlineActionBtn: {
    flex: 1,
  },

  // Hero Dark Panel (Dark Surface token: grid900)
  heroDarkPanel: {
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
    alignItems: 'center',
    marginBottom: spacing.base,
    ...shadows.e2,
  },
  heroGlowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  chargingPulseWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseInnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  batteryBigPct: {
    fontSize: 32,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  chargingStatusText: {
    marginTop: 2,
    letterSpacing: 1,
  },
  heroTargetSubtitle: {
    marginTop: spacing.md,
    marginBottom: spacing.base,
  },

  // Progress Section
  progressSection: {
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  linearProgressBar: {
    borderRadius: 4,
  },

  // 4-Metric Grid
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  metricCell: {
    flex: 1,
    minWidth: '46%',
    padding: spacing.base,
    backgroundColor: colors.surface,
  },

  // Edge Case #17: Price Lock Card
  priceLockCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    marginBottom: spacing.base,
  },
  priceLockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceLockTitleCol: {
    flex: 1,
  },
  priceFormulaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Greenness Card
  greennessCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    marginBottom: spacing.xl,
  },
  greennessHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  greennessTextCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  gridQualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Stop Action CTA
  stopActionSection: {
    marginBottom: spacing.xl,
  },
  stopButton: {
    marginBottom: spacing.sm,
  },
  safetyHint: {
    lineHeight: 18,
  },

  // Completion Summary Screen Styles
  completionContainer: {
    backgroundColor: colors.canvas,
  },
  completionScrollContent: {
    paddingHorizontal: spacing.base,
  },
  completionHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  completedBadgeCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
    ...shadows.e1,
  },
  completedBadgeIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  completedTitle: {
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  completedSubtitle: {
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.lg,
    marginBottom: spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryMetric: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  horizontalRule: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.base,
  },
  priceGuaranteeBox: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.brandTint,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  detailsCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    marginBottom: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  completionActions: {
    gap: spacing.sm,
  },
  doneBtn: {
    marginBottom: spacing.xs,
  },
});
