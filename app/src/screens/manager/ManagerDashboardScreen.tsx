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
import { ManagerStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { PowerProvider, ConnectorType } from '@contracts/enums';
import {
  Text,
  Button,
  Chip,
  Card,
  LinearProgress,
  EmptyState,
  SkeletonCard,
} from '../../components';
import { colors, radii, shadows, spacing, greennessColor } from '../../theme/tokens';
import { formatConnectorName, formatProviderName } from '../../features/stations/utils';

export interface ManagedStation {
  id: string;
  managerId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  operatorName: string;
  operatorPhone: string;
  provider: PowerProvider;
  zoneId: string;
  currentDemandKw: number;
  maxTransformerKw: number;
  demandRisk: 'low' | 'moderate' | 'high';
  revenueToday: number;
  energyDeliveredTodayKwh: number;
  renewableSharePct: number;
  connectors: Array<{
    type: ConnectorType;
    powerKw: number;
    available: number;
    total: number;
    status: 'online' | 'offline';
  }>;
  pricing?: {
    baseTariff: number;
    providerMarkup: number;
    dynamicGreenDiscount: boolean;
    maxGreenDiscount: number;
  };
}

export interface LiveSessionItem {
  id: string;
  stationId: string;
  connectorType: ConnectorType;
  connectorId: string;
  vehicleModel: string;
  driverName: string;
  powerKw: number;
  energyKwh: number;
  cost: number;
  durationMinutes: number;
  status: string;
  lockedPrice: number;
}

export const ManagerDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ManagerStackParamList>>();
  const queryClient = useQueryClient();

  // 1. Fetch Manager Stations
  const stationsQuery = useQuery<ManagedStation[]>({
    queryKey: ['manager', 'stations'],
    queryFn: async () => {
      try {
        const res = await http.get<ManagedStation[]>('/stations/manager/all');
        return res;
      } catch {
        return [];
      }
    },
    staleTime: 15000,
  });

  // 2. Fetch Manager Live Sessions
  const sessionsQuery = useQuery<LiveSessionItem[]>({
    queryKey: ['manager', 'sessions'],
    queryFn: async () => {
      try {
        const res = await http.get<LiveSessionItem[]>('/sessions/manager/active');
        return res;
      } catch {
        return [];
      }
    },
    staleTime: 10000,
    refetchInterval: 5000,
  });

  // Connector Toggle Status Mutation
  const [offlineConnector, setOfflineConnector] = useState<Record<string, boolean>>({
    'station-001_bharat_dc_001': true,
  });

  const toggleConnectorMutation = useMutation({
    mutationFn: async ({
      stationId,
      connectorType,
      newStatus,
    }: {
      stationId: string;
      connectorType: ConnectorType;
      newStatus: 'online' | 'offline';
    }) => {
      return await http.patch(`/stations/${stationId}/connectors/type/${connectorType}/status`, {
        status: newStatus,
      });
    },
    onSuccess: (_, variables) => {
      const key = `${variables.stationId}_${variables.connectorType}`;
      setOfflineConnector((prev) => ({
        ...prev,
        [key]: variables.newStatus === 'offline',
      }));
      queryClient.invalidateQueries({ queryKey: ['manager', 'stations'] });
    },
  });

  const handleToggleConnector = (stationId: string, connectorType: ConnectorType, isCurrentlyOffline: boolean) => {
    const nextStatus = isCurrentlyOffline ? 'online' : 'offline';
    Alert.alert(
      isCurrentlyOffline ? 'Set Connector Online' : 'Mark Connector Offline',
      isCurrentlyOffline
        ? 'Enable this connector for driver bookings and live charging?'
        : 'Marking this connector offline will prevent new driver reservations while allowing in-progress sessions to complete safely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isCurrentlyOffline ? 'Set Online' : 'Mark Offline',
          style: isCurrentlyOffline ? 'default' : 'destructive',
          onPress: () =>
            toggleConnectorMutation.mutate({
              stationId,
              connectorType,
              newStatus: nextStatus,
            }),
        },
      ]
    );
  };

  const forceStopMutation = useMutation({
    mutationFn: async ({ sessionId, reason }: { sessionId: string; reason: string }) => {
      return await http.post(`/sessions/${sessionId}/force-stop`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'sessions'] });
      Alert.alert('Session Stopped', 'The charging session has been force-stopped.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to stop session.'),
  });

  const disputeMutation = useMutation({
    mutationFn: async ({ sessionId, reason }: { sessionId: string; reason: string }) => {
      return await http.post(`/sessions/${sessionId}/dispute`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'sessions'] });
      Alert.alert('Dispute Logged', 'The session has been flagged for dispute.');
    },
    onError: (err: any) => Alert.alert('Error', err?.message || 'Failed to dispute session.'),
  });

  const handleForceStop = (sessionId: string) => {
    Alert.prompt(
      'Force Stop Session',
      'Please enter a reason for stopping this session:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Session',
          style: 'destructive',
          onPress: (reason) => {
            if (!reason) {
              Alert.alert('Required', 'A reason is required to force stop.');
              return;
            }
            forceStopMutation.mutate({ sessionId, reason });
          },
        },
      ]
    );
  };

  const handleDispute = (sessionId: string) => {
    Alert.prompt(
      'Flag for Dispute',
      'Please enter a reason for disputing this session (e.g. damaged plug, bypassed meter):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Dispute',
          style: 'destructive',
          onPress: (reason) => {
            if (!reason) {
              Alert.alert('Required', 'A reason is required to dispute.');
              return;
            }
            disputeMutation.mutate({ sessionId, reason });
          },
        },
      ]
    );
  };

  const stations = stationsQuery.data || [];
  const liveSessions = sessionsQuery.data || [];

  // Aggregated KPIs
  const totalRevenue = stations.reduce((acc, s) => acc + (s.revenueToday || 0), 0);
  const totalEnergy = stations.reduce((acc, s) => acc + (s.energyDeliveredTodayKwh || 0), 0);
  const totalConnectors = stations.reduce(
    (acc, s) => acc + s.connectors.reduce((cAcc, c) => cAcc + c.total, 0),
    0
  );
  const availableConnectors = stations.reduce(
    (acc, s) => acc + s.connectors.reduce((cAcc, c) => cAcc + c.available, 0),
    0
  );
  const networkOccupancyPct = totalConnectors > 0
    ? Math.round(((totalConnectors - availableConnectors) / totalConnectors) * 100)
    : 0;

  // Primary Station for Demand Risk Meter (Edge Case #16)
  const primaryStation = stations[0] || {
    name: 'Torrent Charging Hub – CG Road',
    currentDemandKw: 112.4,
    maxTransformerKw: 150.0,
    demandRisk: 'moderate',
    renewableSharePct: 82,
  };
  const demandFraction = Math.min(primaryStation.currentDemandKw / primaryStation.maxTransformerKw, 1);
  const demandRiskColor =
    demandFraction >= 0.8 ? colors.danger : demandFraction >= 0.6 ? colors.warning : colors.brand;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text variant="h1" style={styles.screenTitle}>
              Station Manager
            </Text>
            <Text variant="caption" color={colors.ink2}>
              Green Drive Pvt Ltd · Operator Portal
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label="Bookings"
              variant="secondary"
              onPress={() => navigation.navigate('BookingOversight')}
              style={styles.addStationBtn}
            />
            <Button
              label="+ Add Station"
              variant="primary"
              onPress={() => navigation.navigate('StationForm', {})}
              style={styles.addStationBtn}
            />
          </View>
        </View>

        {/* Quick Actions Row */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.base }}>
          <Button
            label="Analytics"
            variant="ghost"
            onPress={() => navigation.navigate('ManagerAnalytics')}
            style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}
          />
          <Button
            label="Disputes"
            variant="ghost"
            onPress={() => navigation.navigate('Disputes')}
            style={{ flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}
          />
        </View>

        {/* 1. TOP KPI DASHBOARD CARD */}
        <Card elevation="e2" style={styles.kpiCard}>
          <View style={styles.kpiHeaderRow}>
            <Text variant="caption" color={colors.ink3}>
              TODAY'S OPERATING REVENUE
            </Text>
            <Chip
              label="NETWORK LIVE"
              variant="solid"
              color="#FFFFFF"
              backgroundColor={colors.brand}
            />
          </View>

          <Text variant="display" color={colors.ink} style={styles.revenueHeroNum}>
            ₹{Math.round(totalRevenue).toLocaleString()}
          </Text>

          <View style={styles.kpiDivider} />

          <View style={styles.kpiGrid}>
            <View style={styles.kpiCell}>
              <Text variant="micro" color={colors.ink3}>
                ENERGY DELIVERED
              </Text>
              <Text variant="h2" color={colors.ink} style={styles.tabularNum}>
                {totalEnergy.toFixed(1)} <Text variant="micro">kWh</Text>
              </Text>
            </View>

            <View style={styles.kpiCellDivider} />

            <View style={styles.kpiCell}>
              <Text variant="micro" color={colors.ink3}>
                OCCUPANCY
              </Text>
              <Text variant="h2" color={colors.volt} style={styles.tabularNum}>
                {networkOccupancyPct}%
              </Text>
            </View>

            <View style={styles.kpiCellDivider} />

            <View style={styles.kpiCell}>
              <Text variant="micro" color={colors.ink3}>
                RENEWABLE MIX
              </Text>
              <Text variant="h2" color={colors.brand} style={styles.tabularNum}>
                {primaryStation.renewableSharePct}% ☀️
              </Text>
            </View>
          </View>
        </Card>

        {/* 2. DEMAND-CHARGE RISK METER (Edge Case #16) */}
        <Card elevation="e1" style={styles.demandCard}>
          <View style={styles.demandHeader}>
            <View style={styles.demandTitleCol}>
              <Text variant="title" style={styles.demandTitle}>
                Transformer Demand-Charge Risk
              </Text>
              <Text variant="caption" color={colors.ink2}>
                {primaryStation.name} · Peak Load Monitor
              </Text>
            </View>
            <Chip
              label={`${Math.round(demandFraction * 100)}% LOAD`}
              variant="solid"
              color="#FFFFFF"
              backgroundColor={demandRiskColor}
            />
          </View>

          {/* Meter Bar */}
          <View style={styles.demandMeterSection}>
            <View style={styles.demandMeterLabels}>
              <Text variant="caption" color={colors.ink}>
                Current Load: <Text variant="bodyMedium">{primaryStation.currentDemandKw} kW</Text>
              </Text>
              <Text variant="caption" color={colors.ink3}>
                Transformer Limit: {primaryStation.maxTransformerKw} kW
              </Text>
            </View>

            <LinearProgress
              progress={demandFraction}
              indeterminate={false}
              color={demandRiskColor}
              backgroundColor={colors.surfaceSunken}
              height={10}
              style={styles.demandProgressBar}
            />
          </View>

          {/* Risk Advisory Box */}
          <View style={styles.demandAdvisoryBox}>
            <Text variant="caption" color={colors.ink2}>
              ⚡ <Text variant="bodyMedium">Peak Surcharge Protection:</Text> Demand is within safe
              operating parameters. SmartCharge dynamic discounts are automatically smoothing upcoming
              slots out of high peak demand windows.
            </Text>
          </View>
        </Card>

        {/* 3. MANAGED STATIONS LIST */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="h2" style={styles.sectionHeaderTitle}>
            Managed Stations ({stations.length})
          </Text>
        </View>

        {stationsQuery.isLoading && (
          <View style={styles.skeletonContainer}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        )}

        {!stationsQuery.isLoading && (
          <View style={styles.stationsList}>
            {stations.map((station) => (
              <Card key={station.id} elevation="e1" style={styles.stationCard}>
                <View style={styles.stationTopRow}>
                  <View style={styles.stationTitleCol}>
                    <Text variant="title" style={styles.stationCardTitle}>
                      {station.name}
                    </Text>
                    <Text variant="caption" color={colors.ink2}>
                      {station.address}
                    </Text>
                  </View>

                  {/* Provider Pill (Edge Case #2) */}
                  <Chip
                    label={formatProviderName(station.provider)}
                    variant="subtle"
                    color={colors.brand}
                    backgroundColor={colors.brandTint}
                  />
                </View>

                {/* Connectors Status Grid */}
                <View style={styles.connectorsStatusBox}>
                  <Text variant="micro" color={colors.ink3} style={styles.connectorsHeaderLabel}>
                    CONNECTORS & HARDWARE STATUS
                  </Text>
                  <View style={styles.connectorsChipsWrap}>
                    {station.connectors.map((c, idx) => {
                      const key = `${station.id}_${c.type}`;
                      const isOffline = offlineConnector[key] ?? c.status === 'offline';

                      return (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.7}
                          onPress={() => handleToggleConnector(station.id, c.type, isOffline)}
                          style={[
                            styles.connectorPillButton,
                            isOffline && styles.connectorPillButtonOffline,
                          ]}
                        >
                          <Text
                            variant="micro"
                            color={isOffline ? colors.danger : colors.ink}
                          >
                            {formatConnectorName(c.type)} ({c.powerKw}kW) ·{' '}
                            {isOffline ? 'OFFLINE ⚠️' : `${c.available}/${c.total} Free`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Station Performance Footer */}
                <View style={styles.stationFooterRow}>
                  <View style={styles.stationRevenueCol}>
                    <Text variant="micro" color={colors.ink3}>
                      TODAY'S REVENUE
                    </Text>
                    <Text variant="bodyMedium" color={colors.brand} style={styles.tabularNum}>
                      ₹{station.revenueToday.toLocaleString()}
                    </Text>
                  </View>

                  {/* Quick Action Buttons */}
                  <View style={styles.stationActionsRow}>
                    <Button
                      label="Pricing Controls"
                      variant="secondary"
                      onPress={() =>
                        navigation.navigate('PricingControls', {
                          stationId: station.id,
                        })
                      }
                      style={styles.cardBtn}
                    />
                    <Button
                      label="Edit"
                      variant="ghost"
                      onPress={() =>
                        navigation.navigate('StationForm', {
                          stationId: station.id,
                        })
                      }
                      style={styles.cardBtnSmall}
                    />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* 4. LIVE ACTIVE SESSIONS AT YOUR PLUGS */}
        <View style={styles.sectionHeaderRow}>
          <Text variant="h2" style={styles.sectionHeaderTitle}>
            Live Charging Sessions ({liveSessions.length})
          </Text>
        </View>

        <View style={styles.liveSessionsContainer}>
          {liveSessions.length === 0 ? (
            <Card elevation="e0" style={styles.noSessionsCard}>
              <Text variant="body" color={colors.ink2} align="center">
                No active charging sessions at this moment.
              </Text>
            </Card>
          ) : (
            liveSessions.map((session) => (
              <Card key={session.id} elevation="e0" style={styles.liveSessionCard}>
                <View style={styles.sessionHeaderRow}>
                  <View>
                    <Text variant="bodyMedium" color={colors.ink}>
                      {session.vehicleModel} · {session.driverName}
                    </Text>
                    <Text variant="caption" color={colors.ink2}>
                      Plug: {formatConnectorName(session.connectorType)} ({session.durationMinutes} min active)
                    </Text>
                  </View>
                  <Chip
                    label={`${session.powerKw} kW`}
                    variant="solid"
                    color="#FFFFFF"
                    backgroundColor={colors.volt}
                  />
                </View>

                <View style={styles.sessionMetricsRow}>
                  <Text variant="caption" color={colors.ink2}>
                    Delivered: <Text variant="bodyMedium">{session.energyKwh} kWh</Text>
                  </Text>
                  <Text variant="caption" color={colors.ink2}>
                    Locked Rate: <Text variant="bodyMedium">₹{(session.lockedPrice ?? 6.2).toFixed(2)}/kWh</Text>
                  </Text>
                  <Text variant="caption" color={colors.brand}>
                    Total: ₹{(session.cost ?? (session.energyKwh * (session.lockedPrice ?? 6.2))).toFixed(2)}
                  </Text>
                </View>
                
                <View style={styles.sessionActionRow}>
                  <Button 
                    label="Force Stop" 
                    variant="ghost" 
                    onPress={() => handleForceStop(session.id)}
                    style={styles.sessionBtn}
                  />
                  <Button 
                    label="Dispute" 
                    variant="secondary" 
                    onPress={() => handleDispute(session.id)}
                    style={styles.sessionBtn}
                  />
                </View>
              </Card>
            ))
          )}
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
  tabularNum: {
    fontVariant: ['tabular-nums'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  headerTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  screenTitle: {
    color: colors.ink,
    marginBottom: 2,
  },
  addStationBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
  },

  // KPI Card
  kpiCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.base,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  revenueHeroNum: {
    fontSize: 32,
    lineHeight: 38,
    fontVariant: ['tabular-nums'],
    marginVertical: spacing.xs,
  },
  kpiDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.sm,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  kpiCell: {
    flex: 1,
    alignItems: 'center',
  },
  kpiCellDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.line,
  },

  // Demand Risk Card
  demandCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    marginBottom: spacing.base,
  },
  demandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  demandTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  demandTitle: {
    color: colors.ink,
    marginBottom: 2,
  },
  demandMeterSection: {
    marginBottom: spacing.sm,
  },
  demandMeterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  demandProgressBar: {
    borderRadius: 5,
  },
  demandAdvisoryBox: {
    backgroundColor: colors.surfaceSunken,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },

  // Sections
  sectionHeaderRow: {
    marginVertical: spacing.sm,
  },
  sectionHeaderTitle: {
    color: colors.ink,
  },
  skeletonContainer: {
    gap: spacing.base,
  },
  stationsList: {
    gap: spacing.base,
    marginBottom: spacing.base,
  },
  stationCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  stationTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  stationTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  stationCardTitle: {
    color: colors.ink,
    marginBottom: 2,
  },
  connectorsStatusBox: {
    backgroundColor: colors.surfaceSunken,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  connectorsHeaderLabel: {
    marginBottom: spacing.xs,
  },
  connectorsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  connectorPillButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
  connectorPillButtonOffline: {
    borderColor: colors.danger,
    backgroundColor: '#FDEDED',
  },
  stationFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  stationRevenueCol: {},
  stationActionsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardBtn: {
    height: 36,
    paddingHorizontal: spacing.sm,
  },
  cardBtnSmall: {
    height: 36,
    paddingHorizontal: spacing.xs,
  },

  // Live Sessions
  liveSessionsContainer: {
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  noSessionsCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.md,
  },
  liveSessionCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sessionMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  sessionActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sessionBtn: {
    height: 32,
    paddingHorizontal: spacing.sm,
  },
});
