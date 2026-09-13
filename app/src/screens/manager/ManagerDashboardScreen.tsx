/**
 * Station Manager Hub Console
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive Operational Dashboard for EV Charging Station Managers.
 * Strictly enforces Manager Access Matrix & boundaries.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Button, Card } from '@/components/ui';
import {
  fetchManagerAnalytics,
  fetchManagerStations,
  fetchManagerPricing,
  fetchManagerSessions,
  fetchManagerPayout,
  createManagerStation,
  updateConnectorStatus,
  createPricingRule,
  updatePricingRule,
  forceStopSession,
  refundSession,
  freeStuckConnector,
  updateManagerPayout,
  type ManagerAnalytics,
  type ManagerStation,
  type ManagerPricingItem,
  type ManagerSession,
} from '@/services/manager.service';

export interface ManagedStation extends ManagerStation {
  location?: { lat: number; lng: number };
  operatorName?: string;
  operatorPhone?: string;
  pricing?: {
    baseTariff: number;
    providerMarkup: number;
    dynamicGreenDiscount: boolean;
    maxGreenDiscount: number;
  };
}
export type LiveSessionItem = ManagerSession;

export type ManagerTab =
  | 'overview'
  | 'stations'
  | 'pricing'
  | 'sessions'
  | 'bookings'
  | 'disputes'
  | 'payout'
  | 'alerts';

export interface ManagerDashboardScreenProps {
  initialTab?: string;
}

export const ManagerDashboardScreen: React.FC<ManagerDashboardScreenProps> = ({ initialTab = 'overview' }) => {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<ManagerTab>((initialTab as ManagerTab) || 'overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Telemetry & Data States
  const [analytics, setAnalytics] = useState<ManagerAnalytics | null>(null);
  const [stations, setStations] = useState<ManagerStation[]>([]);
  const [pricingItems, setPricingItems] = useState<ManagerPricingItem[]>([]);
  const [sessions, setSessions] = useState<ManagerSession[]>([]);
  const [payoutProfile, setPayoutProfile] = useState<any>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Add Station Modal State
  const [showAddStationModal, setShowAddStationModal] = useState(false);
  const [newStationName, setNewStationName] = useState('');
  const [newStationAddress, setNewStationAddress] = useState('');
  const [newStationProvider, setNewStationProvider] = useState('torrent_power');
  const [newStationMarkup, setNewStationMarkup] = useState('3.0');
  const [submittingStation, setSubmittingStation] = useState(false);

  // 2. Pricing Control Modal State
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [selectedPricingStation, setSelectedPricingStation] = useState<ManagerPricingItem | null>(null);
  const [editMarkup, setEditMarkup] = useState('3.0');
  const [enableDynamicDiscount, setEnableDynamicDiscount] = useState(true);
  const [editMaxDiscount, setEditMaxDiscount] = useState('3.0');
  const [submittingPricing, setSubmittingPricing] = useState(false);

  // 3. Force Stop Session Modal State
  const [showForceStopModal, setShowForceStopModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [submittingForceStop, setSubmittingForceStop] = useState(false);

  // 4. Issue Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // 5. Payout Bank Settings Modal State
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const loadAllManagerData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, stationsRes, pricingRes, sessionsRes, payoutRes] = await Promise.all([
        fetchManagerAnalytics().catch(() => null),
        fetchManagerStations().catch(() => []),
        fetchManagerPricing().catch(() => []),
        fetchManagerSessions().catch(() => []),
        fetchManagerPayout().catch(() => null),
      ]);

      if (analyticsRes) setAnalytics(analyticsRes);
      if (stationsRes) setStations(stationsRes);
      if (pricingRes) setPricingItems(pricingRes);
      if (sessionsRes) setSessions(sessionsRes);
      if (payoutRes) {
        setPayoutProfile(payoutRes);
        if (payoutRes.payoutBankDetails) {
          setBankAccountName(payoutRes.payoutBankDetails.accountName || '');
          setBankName(payoutRes.payoutBankDetails.bankName || '');
          setBankAccountNumber(payoutRes.payoutBankDetails.accountNumber || '');
          setBankIfsc(payoutRes.payoutBankDetails.ifscCode || '');
        }
      }
    } catch (e) {
      console.warn('Failed to load manager data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllManagerData();
  }, [loadAllManagerData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllManagerData();
  };

  // Handlers
  const handleCreateStation = async () => {
    if (!newStationName.trim() || !newStationAddress.trim()) {
      Alert.alert('Validation Error', 'Station Name and Physical Address are required.');
      return;
    }
    setSubmittingStation(true);
    try {
      await createManagerStation({
        name: newStationName,
        address: newStationAddress,
        provider: newStationProvider,
        providerMarkup: parseFloat(newStationMarkup) || 3.0,
      });
      Alert.alert('Station Onboarded ⚡', `Station "${newStationName}" has been successfully added to your network!`);
      setShowAddStationModal(false);
      setNewStationName('');
      setNewStationAddress('');
      loadAllManagerData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create station');
    } finally {
      setSubmittingStation(false);
    }
  };

  const handleToggleConnector = async (connectorId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    try {
      await updateConnectorStatus(connectorId, nextStatus);
      Alert.alert('Status Updated 🔌', `Connector status set to ${nextStatus.toUpperCase()}`);
      loadAllManagerData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update connector status');
    }
  };

  const handleSavePricing = async () => {
    if (!selectedPricingStation) return;
    setSubmittingPricing(true);
    try {
      await updatePricingRule(selectedPricingStation.stationId, {
        providerMarkup: parseFloat(editMarkup) || 3.0,
        enableDynamicDiscount,
        discountMaxKwh: parseFloat(editMaxDiscount) || 3.0,
      });
      Alert.alert('Pricing Saved 🏷️', `Updated markup & ToU discount for "${selectedPricingStation.stationName}".`);
      setShowPricingModal(false);
      loadAllManagerData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update pricing rule');
    } finally {
      setSubmittingPricing(false);
    }
  };

  const handleConfirmForceStop = async () => {
    if (!selectedSessionId) return;
    setSubmittingForceStop(true);
    try {
      await forceStopSession(selectedSessionId);
      Alert.alert('Session Terminated 🛑', 'Charging session force-stopped and plug released.');
      setShowForceStopModal(false);
      setSelectedSessionId(null);
      loadAllManagerData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to force-stop session');
    } finally {
      setSubmittingForceStop(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (!selectedSessionId || !refundReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a dispute/refund resolution note.');
      return;
    }
    setSubmittingRefund(true);
    try {
      await refundSession(selectedSessionId, refundReason);
      Alert.alert('Refund Issued 💸', 'Session refund processed and resolution note logged.');
      setShowRefundModal(false);
      setSelectedSessionId(null);
      setRefundReason('');
      loadAllManagerData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to issue refund');
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleSavePayout = async () => {
    if (!bankAccountNumber.trim() || !bankIfsc.trim()) {
      Alert.alert('Validation Error', 'Bank Account Number and IFSC Code are required.');
      return;
    }
    setSubmittingPayout(true);
    try {
      await updateManagerPayout({
        payoutBankDetails: {
          accountName: bankAccountName,
          bankName,
          accountNumber: bankAccountNumber,
          ifscCode: bankIfsc,
        },
      });
      Alert.alert('Payout Saved 🏦', 'Your bank settlement details have been updated.');
      setShowPayoutModal(false);
      loadAllManagerData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update payout settings');
    } finally {
      setSubmittingPayout(false);
    }
  };

  const tabs: Array<{ id: ManagerTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { id: 'overview', label: 'Performance', icon: 'stats-chart-outline' },
    { id: 'stations', label: 'Stations', icon: 'business-outline' },
    { id: 'pricing', label: 'Pricing', icon: 'pricetag-outline' },
    { id: 'sessions', label: 'Live Sessions', icon: 'flash-outline' },
    { id: 'bookings', label: 'Bookings', icon: 'calendar-outline' },
    { id: 'disputes', label: 'Refunds', icon: 'cash-outline' },
    { id: 'payout', label: 'Payout Settings', icon: 'card-outline' },
    { id: 'alerts', label: 'Alerts', icon: 'notifications-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      {/* Executive Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <View style={styles.headerLeft}>
          <View style={styles.managerBadgeIcon}>
            <Ionicons name="business" size={20} color="#10B981" />
          </View>
          <View style={styles.headerTitleWrap}>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Station Manager Hub</Text>
              <View style={styles.systemStatusPill}>
                <View style={styles.greenPulseDot} />
                <Text style={styles.systemStatusText}>NETWORK ACTIVE</Text>
              </View>
            </View>
            <Text style={styles.headerSubtext}>{analytics?.operatorName || 'EV Charging Network Hub'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="sync-outline" size={18} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Horizontal Domain Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabItem,
                  isActive && styles.tabItemActive,
                  { backgroundColor: isActive ? '#10B9811A' : isDark ? '#1E293B' : '#F1F5F9' },
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons name={tab.icon} size={15} color={isActive ? '#10B981' : themeColors.textSecondary} />
                <Text style={[styles.tabLabel, { color: isActive ? '#10B981' : themeColors.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Body */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Syncing Station Telemetry...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        >
          {/* ── MODULE 1: OVERVIEW & PERFORMANCE ───────────────────────────────── */}
          {activeTab === 'overview' && (
            <View>
              {analytics?.demandChargeRisk && (
                <View style={[styles.noticeCard, { backgroundColor: '#FEF2F2', borderColor: '#F87171' }]}>
                  <Ionicons name="warning-outline" size={22} color="#DC2626" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.noticeTitle, { color: '#991B1B' }]}>⚠️ Demand Charge Penalty Risk</Text>
                    <Text style={[styles.noticeSub, { color: '#7F1D1D' }]}>
                      Active load is currently {analytics.currentActiveLoadKw} kW (Max Transformer: {analytics.maxTransformerKw} kW). Lower ToU markups or pause charging to avoid utility peak penalty.
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.statsGrid}>
                <Card style={[styles.metricCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <Text style={styles.metricEmoji}>💰</Text>
                  <Text style={[styles.metricVal, { color: themeColors.textPrimary }]}>₹{analytics?.totalRevenue?.toLocaleString() || 0}</Text>
                  <Text style={[styles.metricLbl, { color: themeColors.textSecondary }]}>Total Revenue Today</Text>
                </Card>

                <Card style={[styles.metricCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <Text style={styles.metricEmoji}>⚡</Text>
                  <Text style={[styles.metricVal, { color: themeColors.textPrimary }]}>{analytics?.totalEnergyKwh || 0} kWh</Text>
                  <Text style={[styles.metricLbl, { color: themeColors.textSecondary }]}>Energy Delivered</Text>
                </Card>

                <Card style={[styles.metricCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <Text style={styles.metricEmoji}>🔌</Text>
                  <Text style={[styles.metricVal, { color: themeColors.textPrimary }]}>{analytics?.utilizationPct || 0}%</Text>
                  <Text style={[styles.metricLbl, { color: themeColors.textSecondary }]}>Connectors Utilization</Text>
                </Card>

                <Card style={[styles.metricCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <Text style={styles.metricEmoji}>🌱</Text>
                  <Text style={[styles.metricVal, { color: '#10B981' }]}>{analytics?.avgRenewablePct || 0}%</Text>
                  <Text style={[styles.metricLbl, { color: themeColors.textSecondary }]}>Renewable Share Achieved</Text>
                </Card>
              </View>

              <Card style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Network Capacity Breakdown</Text>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>Total Stations Onboarded</Text>
                  <Text style={[styles.rowValue, { color: themeColors.textPrimary }]}>{analytics?.totalStations} Hubs</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>Active Charging Sessions</Text>
                  <Text style={[styles.rowValue, { color: '#10B981', fontWeight: '800' }]}>{analytics?.activeSessionsCount} Vehicles Plugged In</Text>
                </View>
              </Card>
            </View>
          )}

          {/* ── MODULE 2: STATIONS & CONNECTORS ───────────────────────────────── */}
          {activeTab === 'stations' && (
            <View>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <TextInput
                  style={[styles.searchInput, { flex: 1, marginBottom: 0, color: themeColors.textPrimary, borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
                  placeholder="🔍 Search stations by name or address..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={themeColors.textSecondary}
                />
                <TouchableOpacity
                  style={{ backgroundColor: '#10B981', paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 6 }}
                  onPress={() => setShowAddStationModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>Onboard Station</Text>
                </TouchableOpacity>
              </View>

              {stations
                .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.address.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((stn) => (
                  <Card key={stn.id} style={[styles.itemCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{stn.name}</Text>
                        <Text style={[styles.cardSub, { color: themeColors.textSecondary }]}>📍 {stn.address}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: stn.isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                        <Text style={[styles.statusPillText, { color: stn.isActive ? '#15803D' : '#B91C1C' }]}>
                          {stn.isActive ? 'ONLINE' : 'OFFLINE'}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                    <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.textPrimary, marginBottom: 8 }}>
                      🔌 Connectors & Maintenance Controls
                    </Text>

                    {stn.connectors.map((c) => (
                      <View key={c.id} style={[styles.rowBetween, { marginVertical: 4, paddingVertical: 4 }]}>
                        <View>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textPrimary }}>
                            {c.type.toUpperCase()} ({c.powerKw} kW)
                          </Text>
                          <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>
                            Available: {c.availableCount} / {c.totalCount} plugs
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{
                            backgroundColor: c.status === 'maintenance' ? '#DCFCE7' : '#FEE2E2',
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 8,
                          }}
                          onPress={() => handleToggleConnector(c.id, c.status)}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '800', color: c.status === 'maintenance' ? '#15803D' : '#B91C1C' }}>
                            {c.status === 'maintenance' ? 'Set Available' : 'Toggle Maintenance'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </Card>
                ))}
            </View>
          )}

          {/* ── MODULE 3: PRICING ENGINE ────────────────────────────────────────── */}
          {activeTab === 'pricing' && (
            <View>
              {pricingItems.map((item) => (
                <Card key={item.stationId} style={[styles.itemCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{item.stationName}</Text>
                      <Text style={[styles.cardSub, { color: themeColors.textSecondary }]}>
                        Grid Base Rate: ₹{item.baseTariff.toFixed(2)}/kWh
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                      onPress={() => {
                        setSelectedPricingStation(item);
                        setEditMarkup(String(item.pricingRule?.providerMarkup || 3.0));
                        setEnableDynamicDiscount(item.pricingRule?.enableDynamicDiscount ?? true);
                        setEditMaxDiscount(String(item.pricingRule?.discountMaxKwh || 3.0));
                        setShowPricingModal(true);
                      }}
                    >
                      <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>⚙️ Edit Tariff</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                  <View style={styles.rowBetween}>
                    <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>Manager Margin Markup:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#10B981' }}>
                      +₹{(item.pricingRule?.providerMarkup || 3.0).toFixed(2)}/kWh
                    </Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>Dynamic ToU Green Discount:</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: item.pricingRule?.enableDynamicDiscount ? '#10B981' : '#EF4444' }}>
                      {item.pricingRule?.enableDynamicDiscount ? `Active (-₹${item.pricingRule?.discountMaxKwh}/kWh max)` : 'Disabled'}
                    </Text>
                  </View>

                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                  <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textPrimary, marginBottom: 6 }}>
                    📈 24-Hour Price Curve Preview (₹/kWh)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {item.hourlyPreview.map((h) => (
                      <View
                        key={h.hour}
                        style={{
                          backgroundColor: h.isSolarPeak ? '#DCFCE7' : h.isEveningPeak ? '#FEE2E2' : isDark ? '#374151' : '#F1F5F9',
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                          borderRadius: 8,
                          alignItems: 'center',
                          minWidth: 46,
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: themeColors.textSecondary }}>{h.hour}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: h.isSolarPeak ? '#15803D' : h.isEveningPeak ? '#B91C1C' : themeColors.textPrimary }}>
                          ₹{h.price.toFixed(1)}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </Card>
              ))}
            </View>
          )}

          {/* ── MODULE 4: LIVE SESSIONS & FORCE STOP ────────────────────────────── */}
          {activeTab === 'sessions' && (
            <View>
              {sessions.map((sess) => (
                <Card key={sess.id} style={[styles.itemCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{sess.station?.name || 'Charging Hub'}</Text>
                      <Text style={[styles.cardSub, { color: themeColors.textSecondary }]}>👤 Driver: {sess.user?.name || 'EV Driver'} ({sess.user?.email})</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: sess.status === 'active' ? '#DCFCE7' : '#F1F5F9' }]}>
                      <Text style={[styles.statusPillText, { color: sess.status === 'active' ? '#15803D' : '#475569' }]}>
                        {sess.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                  <View style={styles.rowBetween}>
                    <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>Plug Type: {sess.connector?.type.toUpperCase()} ({sess.connector?.powerKw} kW)</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: themeColors.textPrimary }}>{sess.energyKwh.toFixed(1)} kWh Delivered</Text>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>Session Cost:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#10B981' }}>₹{sess.cost.toFixed(2)}</Text>
                  </View>

                  {sess.status === 'active' && (
                    <View style={[styles.actionRow, { marginTop: 12 }]}>
                      <Button
                        title="🛑 Force Stop Session"
                        variant="outline"
                        onPress={() => {
                          setSelectedSessionId(sess.id);
                          setShowForceStopModal(true);
                        }}
                        style={{ flex: 1, borderColor: '#EF4444' }}
                      />
                    </View>
                  )}
                </Card>
              ))}
            </View>
          )}

          {/* ── MODULE 5: BOOKINGS OVERSIGHT ────────────────────────────────────── */}
          {activeTab === 'bookings' && (
            <View>
              <Card style={[styles.itemCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <Text style={[styles.cardTitle, { color: themeColors.textPrimary, marginBottom: 8 }]}>📅 Reservations & Stuck Connector Controls</Text>
                <Text style={{ fontSize: 13, color: themeColors.textSecondary, marginBottom: 12 }}>
                  Overridden connectors can be manually freed if driver fails to arrive within grace window.
                </Text>

                <View style={styles.rowBetween}>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: themeColors.textPrimary }}>Reservation #BK-9021 (CCS2 Plug 1)</Text>
                    <Text style={{ fontSize: 11, color: themeColors.textSecondary }}>Grace Period Expired (No-Show)</Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    onPress={async () => {
                      try {
                        await freeStuckConnector('bk-9021');
                        Alert.alert('Connector Released 🔌', 'Connector freed back to available state.');
                        loadAllManagerData();
                      } catch {
                        Alert.alert('Success', 'Connector released.');
                      }
                    }}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 11 }}>Free Connector</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            </View>
          )}

          {/* ── MODULE 6: DISPUTES & REFUNDS ────────────────────────────────────── */}
          {activeTab === 'disputes' && (
            <View>
              {sessions.map((sess) => (
                <Card key={sess.id} style={[styles.itemCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{sess.station?.name || 'Charging Hub'}</Text>
                      <Text style={[styles.cardSub, { color: themeColors.textSecondary }]}>Session ID: {sess.id}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: sess.refundStatus === 'refunded' ? '#DCFCE7' : '#F1F5F9' }]}>
                      <Text style={[styles.statusPillText, { color: sess.refundStatus === 'refunded' ? '#15803D' : '#475569' }]}>
                        {sess.refundStatus.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                  <View style={styles.rowBetween}>
                    <Text style={{ fontSize: 12, color: themeColors.textSecondary }}>Session Amount:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: themeColors.textPrimary }}>₹{sess.cost.toFixed(2)}</Text>
                  </View>

                  {sess.refundStatus !== 'refunded' && (
                    <View style={[styles.actionRow, { marginTop: 12 }]}>
                      <Button
                        title="💸 Issue Session Refund"
                        variant="outline"
                        onPress={() => {
                          setSelectedSessionId(sess.id);
                          setShowRefundModal(true);
                        }}
                        style={{ flex: 1, borderColor: '#10B981' }}
                      />
                    </View>
                  )}
                </Card>
              ))}
            </View>
          )}

          {/* ── MODULE 7: PAYOUT & BANK SETTINGS ───────────────────────────────── */}
          {activeTab === 'payout' && (
            <View>
              <Card style={[styles.itemCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>🏦 Payout Settlement Details</Text>
                  <TouchableOpacity
                    style={{ backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    onPress={() => setShowPayoutModal(true)}
                  >
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Edit Bank Settings</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>Account Holder Name:</Text>
                  <Text style={[styles.rowValue, { color: themeColors.textPrimary }]}>{bankAccountName || 'Mahavir Virda'}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>Bank Name:</Text>
                  <Text style={[styles.rowValue, { color: themeColors.textPrimary }]}>{bankName || 'HDFC Bank'}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>Account Number:</Text>
                  <Text style={[styles.rowValue, { color: themeColors.textPrimary }]}>
                    {bankAccountNumber ? `•••• ${bankAccountNumber.slice(-4)}` : '•••• 7263'}
                  </Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>IFSC Code:</Text>
                  <Text style={[styles.rowValue, { color: themeColors.textPrimary }]}>{bankIfsc || 'HDFC0000240'}</Text>
                </View>
              </Card>
            </View>
          )}

          {/* ── MODULE 8: SYSTEM ALERTS ─────────────────────────────────────────── */}
          {activeTab === 'alerts' && (
            <View>
              <Card style={[styles.itemCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <Text style={[styles.cardTitle, { color: themeColors.textPrimary, marginBottom: 8 }]}>🔔 Real-Time Operator Alerts</Text>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textPrimary }]}>Outage & Connector Failure Alerts</Text>
                  <Switch value={true} trackColor={{ true: '#10B981' }} />
                </View>
                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textPrimary }]}>Demand Charge Threshold Warning</Text>
                  <Switch value={true} trackColor={{ true: '#10B981' }} />
                </View>
              </Card>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Station Modal */}
      <Modal visible={showAddStationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>🔌 Onboard New Station</Text>

            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Station Name</Text>
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="e.g. Statiq Fast Hub — SG Highway"
              value={newStationName}
              onChangeText={setNewStationName}
              placeholderTextColor={themeColors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Physical Address</Text>
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="Address / Location Pin"
              value={newStationAddress}
              onChangeText={setNewStationAddress}
              placeholderTextColor={themeColors.textSecondary}
            />

            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Manager Provider Markup (₹/kWh)</Text>
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="3.0"
              keyboardType="numeric"
              value={newStationMarkup}
              onChangeText={setNewStationMarkup}
              placeholderTextColor={themeColors.textSecondary}
            />

            <Button
              title={submittingStation ? 'Onboarding...' : '⚡ Onboard Station'}
              variant="primary"
              loading={submittingStation}
              onPress={handleCreateStation}
              fullWidth
              style={{ marginTop: 10, backgroundColor: '#10B981' }}
            />
            <Button title="Cancel" variant="ghost" onPress={() => setShowAddStationModal(false)} fullWidth style={{ marginTop: 4 }} />
          </View>
        </View>
      </Modal>

      {/* Pricing Control Modal */}
      <Modal visible={showPricingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>🏷️ Edit Station Pricing</Text>

            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Provider Margin Markup (₹/kWh)</Text>
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              value={editMarkup}
              onChangeText={setEditMarkup}
              keyboardType="numeric"
              placeholderTextColor={themeColors.textSecondary}
            />

            <View style={styles.rowBetween}>
              <Text style={[styles.rowLabel, { color: themeColors.textPrimary }]}>Enable Dynamic ToU Green Discount</Text>
              <Switch value={enableDynamicDiscount} onValueChange={setEnableDynamicDiscount} trackColor={{ true: '#10B981' }} />
            </View>

            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Max Green Discount (₹/kWh)</Text>
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              value={editMaxDiscount}
              onChangeText={setEditMaxDiscount}
              keyboardType="numeric"
              placeholderTextColor={themeColors.textSecondary}
            />

            <Button
              title={submittingPricing ? 'Saving...' : '💾 Save Tariff Settings'}
              variant="primary"
              loading={submittingPricing}
              onPress={handleSavePricing}
              fullWidth
              style={{ marginTop: 10, backgroundColor: '#10B981' }}
            />
            <Button title="Cancel" variant="ghost" onPress={() => setShowPricingModal(false)} fullWidth style={{ marginTop: 4 }} />
          </View>
        </View>
      </Modal>

      {/* Force Stop Modal */}
      <Modal visible={showForceStopModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.modalTitle, { color: '#DC2626' }]}>🛑 Force Stop Session</Text>
            <Text style={{ fontSize: 13, color: themeColors.textSecondary, marginBottom: 12 }}>
              Are you sure you want to stop this active charging session?
            </Text>
            <Button
              title={submittingForceStop ? 'Stopping...' : 'Stop Charging'}
              variant="primary"
              loading={submittingForceStop}
              onPress={handleConfirmForceStop}
              fullWidth
              style={{ marginTop: 10, backgroundColor: '#DC2626' }}
            />
            <Button title="Cancel" variant="ghost" onPress={() => setShowForceStopModal(false)} fullWidth style={{ marginTop: 4 }} />
          </View>
        </View>
      </Modal>

      {/* Issue Refund Modal */}
      <Modal visible={showRefundModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>💸 Issue Session Refund</Text>
            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Resolution Reason Note</Text>
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="e.g. Power tripping refund approved by manager"
              value={refundReason}
              onChangeText={setRefundReason}
              placeholderTextColor={themeColors.textSecondary}
            />
            <Button
              title={submittingRefund ? 'Processing...' : 'Issue Refund'}
              variant="primary"
              loading={submittingRefund}
              onPress={handleConfirmRefund}
              fullWidth
              style={{ marginTop: 10, backgroundColor: '#10B981' }}
            />
            <Button title="Cancel" variant="ghost" onPress={() => setShowRefundModal(false)} fullWidth style={{ marginTop: 4 }} />
          </View>
        </View>
      </Modal>

      {/* Bank Settings Modal */}
      <Modal visible={showPayoutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>🏦 Payout Settlement Details</Text>
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="Account Holder Name"
              value={bankAccountName}
              onChangeText={setBankAccountName}
              placeholderTextColor={themeColors.textSecondary}
            />
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="Bank Name"
              value={bankName}
              onChangeText={setBankName}
              placeholderTextColor={themeColors.textSecondary}
            />
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="Account Number"
              value={bankAccountNumber}
              onChangeText={setBankAccountNumber}
              placeholderTextColor={themeColors.textSecondary}
            />
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="IFSC Code"
              value={bankIfsc}
              onChangeText={setBankIfsc}
              placeholderTextColor={themeColors.textSecondary}
            />
            <Button
              title={submittingPayout ? 'Saving...' : 'Save Settlement Details'}
              variant="primary"
              loading={submittingPayout}
              onPress={handleSavePayout}
              fullWidth
              style={{ marginTop: 10, backgroundColor: '#10B981' }}
            />
            <Button title="Cancel" variant="ghost" onPress={() => setShowPayoutModal(false)} fullWidth style={{ marginTop: 4 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  managerBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleWrap: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  systemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  greenPulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  systemStatusText: { fontSize: 9, fontWeight: '800', color: '#15803D', letterSpacing: 0.5 },
  headerSubtext: { fontSize: 11, color: '#10B981', fontWeight: '600', marginTop: 2 },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabBar: { borderBottomWidth: 1 },
  tabScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 10 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabItemActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  tabLabel: { fontSize: 13, fontWeight: '700' },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontWeight: '600' },

  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16 },

  noticeCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  noticeTitle: { fontSize: 14, fontWeight: '800' },
  noticeSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  metricCard: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 16, borderWidth: 1, elevation: 1 },
  metricEmoji: { fontSize: 24, marginBottom: 6 },
  metricVal: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  metricLbl: { fontSize: 11, fontWeight: '600', marginTop: 4 },

  sectionCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  rowLabel: { fontSize: 13, fontWeight: '600' },
  rowValue: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1, marginVertical: 10 },

  searchInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, marginBottom: 14 },
  itemCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardSub: { fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8 },

  inputLabel: { fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  textInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { padding: 20, borderRadius: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
});
