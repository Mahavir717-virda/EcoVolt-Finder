/**
 * Station Manager Hub Screen
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive Management Portal for EV Charging Station Managers & Operators.
 * Fulfills all 8 manager workflows and enforces RBAC access control.
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
  Switch,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { Button, Card } from '@/components/ui';
import {
  fetchManagerAnalytics,
  fetchManagerStations,
  createManagerStation,
  updateConnectorStatus,
  fetchManagerPricing,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  fetchManagerSessions,
  forceStopSession,
  refundSession,
  freeStuckConnector,
  fetchManagerPayout,
  updateManagerPayout,
  type ManagerAnalytics,
  type ManagerStation,
  type ManagerPricingItem,
  type ManagerSession,
} from '@/services/manager.service';

type ManagerTab = 'analytics' | 'stations' | 'pricing' | 'sessions' | 'payout';

export default function ManagerHubScreen({ initialTab = 'analytics', hideTopNav = false }: { initialTab?: ManagerTab; hideTopNav?: boolean }) {
  const insets = useSafeAreaInsets();
  const { colors: themeColors, isDark, setThemeMode } = useTheme();
  const toggleTheme = () => setThemeMode(isDark ? 'light' : 'dark');
  const { language, setLanguage, t } = useLanguage();
  const { signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<ManagerTab>(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Data states
  const [analytics, setAnalytics] = useState<ManagerAnalytics | null>(null);
  const [stations, setStations] = useState<ManagerStation[]>([]);
  const [pricingList, setPricingList] = useState<ManagerPricingItem[]>([]);
  const [sessions, setSessions] = useState<ManagerSession[]>([]);
  const [payoutData, setPayoutData] = useState<any>(null);

  // Onboard Station Modal state
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newStationName, setNewStationName] = useState('');
  const [newStationAddress, setNewStationAddress] = useState('');
  const [newStationLat, setNewStationLat] = useState('23.0441');
  const [newStationLng, setNewStationLng] = useState('72.5085');
  const [newStationProvider, setNewStationProvider] = useState('torrent_power');
  const [newStationCcs2Count, setNewStationCcs2Count] = useState('2');
  const [newStationType2Count, setNewStationType2Count] = useState('2');
  const [submittingStation, setSubmittingStation] = useState(false);

  // Refund Modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [targetRefundSessionId, setTargetRefundSessionId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Pricing Rule Modal CRUD state
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingPricingRuleId, setEditingPricingRuleId] = useState<string | null>(null);
  const [pricingTargetStationId, setPricingTargetStationId] = useState<string>('');
  const [pricingMarkup, setPricingMarkup] = useState('3.0');
  const [pricingEnableDiscount, setPricingEnableDiscount] = useState(true);
  const [pricingDiscountMax, setPricingDiscountMax] = useState('3.0');
  const [pricingLowOccDiscount, setPricingLowOccDiscount] = useState('2.0');
  const [pricingOccThreshold, setPricingOccThreshold] = useState('50');
  const [submittingPricing, setSubmittingPricing] = useState(false);

  // Payout Form state
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [outageAlerts, setOutageAlerts] = useState(true);
  const [savingPayout, setSavingPayout] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, stationData, pricingData, sessionData, profileData] = await Promise.all([
        fetchManagerAnalytics(),
        fetchManagerStations(),
        fetchManagerPricing(),
        fetchManagerSessions(),
        fetchManagerPayout(),
      ]);

      setAnalytics(analyticsData);
      setStations(stationData);
      setPricingList(pricingData);
      setSessions(sessionData);
      setPayoutData(profileData);

      if (profileData?.payoutBankDetails) {
        setBankAccountName(profileData.payoutBankDetails.accountName || '');
        setBankName(profileData.payoutBankDetails.bankName || '');
        setBankAccountNumber(profileData.payoutBankDetails.accountNumber || '');
        setBankIfsc(profileData.payoutBankDetails.ifscCode || '');
      }
      if (profileData?.notificationPrefs) {
        setEmailAlerts(profileData.notificationPrefs.emailAlerts ?? true);
        setOutageAlerts(profileData.notificationPrefs.outageAlerts ?? true);
      }
    } catch (e: any) {
      console.error('[ManagerHub] Error loading data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // ── Onboard Station Action ──────────────────────────────────────────────────
  const handleOnboardStation = async () => {
    if (!newStationName.trim() || !newStationAddress.trim()) {
      Alert.alert('Required Fields', 'Please provide station name and full address.');
      return;
    }

    setSubmittingStation(true);
    try {
      await createManagerStation({
        name: newStationName.trim(),
        address: newStationAddress.trim(),
        lat: parseFloat(newStationLat) || 23.0441,
        lng: parseFloat(newStationLng) || 72.5085,
        provider: newStationProvider,
        connectors: [
          { type: 'ccs2', powerKw: 60, totalCount: parseInt(newStationCcs2Count, 10) || 2 },
          { type: 'type2_ac', powerKw: 22, totalCount: parseInt(newStationType2Count, 10) || 2 },
        ],
      });

      Alert.alert('Success 🎉', 'New charging station onboarded and active!');
      setShowOnboardModal(false);
      setNewStationName('');
      setNewStationAddress('');
      loadAllData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to onboard station.');
    } finally {
      setSubmittingStation(false);
    }
  };

  // ── Toggle Connector Maintenance Mode ──────────────────────────────────────
  const handleToggleMaintenance = async (connectorId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'maintenance' ? 'available' : 'maintenance';
    try {
      await updateConnectorStatus(connectorId, nextStatus);
      Alert.alert('Updated', `Connector state changed to ${nextStatus.toUpperCase()}`);
      loadAllData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update connector status.');
    }
  };

  // ── Force Stop Session ─────────────────────────────────────────────────────
  const handleForceStop = (sessionId: string) => {
    Alert.alert(
      'Force Stop Session',
      'Are you sure you want to stop this active charging session? Connector will be unlocked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              await forceStopSession(sessionId);
              Alert.alert('Session Stopped', 'Session terminated and connector released.');
              loadAllData();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not stop session.');
            }
          },
        },
      ]
    );
  };

  // ── Issue Refund ───────────────────────────────────────────────────────────
  const handleIssueRefund = async () => {
    if (!targetRefundSessionId) return;
    setSubmittingRefund(true);
    try {
      await refundSession(targetRefundSessionId, refundReason || 'Manager resolution refund');
      Alert.alert('Refund Issued', 'Refund has been logged and sent for processing.');
      setShowRefundModal(false);
      setTargetRefundSessionId(null);
      setRefundReason('');
      loadAllData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to issue refund.');
    } finally {
      setSubmittingRefund(false);
    }
  };

  // ── Save Payout Bank Details ────────────────────────────────────────────────
  const handleSavePayout = async () => {
    setSavingPayout(true);
    try {
      await updateManagerPayout({
        payoutBankDetails: {
          accountName: bankAccountName,
          bankName,
          accountNumber: bankAccountNumber,
          ifscCode: bankIfsc,
        },
        notificationPrefs: {
          emailAlerts,
          outageAlerts,
        },
      });
      Alert.alert('Saved ✅', 'Payout bank details and notification preferences updated!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update payout settings.');
    } finally {
      setSavingPayout(false);
    }
  };

  // ── Pricing Engine CRUD Handlers ────────────────────────────────────────────
  const openCreatePricingModal = (stationId?: string) => {
    setEditingPricingRuleId(null);
    setPricingTargetStationId(stationId || stations[0]?.id || '');
    setPricingMarkup('3.0');
    setPricingEnableDiscount(true);
    setPricingDiscountMax('3.0');
    setPricingLowOccDiscount('2.0');
    setPricingOccThreshold('50');
    setShowPricingModal(true);
  };

  const openEditPricingModal = (item: ManagerPricingItem) => {
    setEditingPricingRuleId(item.pricingRule?.id || item.stationId);
    setPricingTargetStationId(item.stationId);
    setPricingMarkup(String(item.pricingRule?.providerMarkup ?? 3.0));
    setPricingEnableDiscount(item.pricingRule?.enableDynamicDiscount ?? true);
    setPricingDiscountMax(String(item.pricingRule?.discountMaxKwh ?? 3.0));
    setPricingLowOccDiscount(String(item.pricingRule?.lowOccupancyDiscountInr ?? 2.0));
    setPricingOccThreshold(String(item.pricingRule?.occupancyThresholdPct ?? 50));
    setShowPricingModal(true);
  };

  const handleSavePricingRule = async () => {
    if (!pricingTargetStationId) {
      Alert.alert('Required', 'Please select a station to apply this pricing rule.');
      return;
    }
    setSubmittingPricing(true);
    try {
      const payload = {
        stationId: pricingTargetStationId,
        providerMarkup: parseFloat(pricingMarkup) || 0,
        enableDynamicDiscount: pricingEnableDiscount,
        discountMaxKwh: parseFloat(pricingDiscountMax) || 0,
        lowOccupancyDiscountInr: parseFloat(pricingLowOccDiscount) || 0,
        occupancyThresholdPct: parseFloat(pricingOccThreshold) || 50,
      };

      if (editingPricingRuleId) {
        await updatePricingRule(editingPricingRuleId, payload);
        Alert.alert('Pricing Rule Updated ⚡', 'Custom tariff rules and ToU adjustments applied.');
      } else {
        await createPricingRule(payload);
        Alert.alert('Pricing Rule Created ⚡', 'New tariff rule added to database.');
      }

      setShowPricingModal(false);
      loadAllData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save pricing rule.');
    } finally {
      setSubmittingPricing(false);
    }
  };

  const handleDeletePricingRule = async (targetId: string, stationName: string) => {
    Alert.alert(
      'Reset Tariff Rule',
      `Are you sure you want to delete custom pricing for "${stationName}" and reset to default grid tariff?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset / Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePricingRule(targetId);
              Alert.alert('Rule Reset', 'Custom pricing rule deleted.');
              loadAllData();
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete pricing rule.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      {/* Executive Station Manager Top Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <View style={styles.headerLeft}>
          <View style={styles.managerIconBadge}>
            <Ionicons name="business" size={20} color="#10B981" />
          </View>
          <View style={styles.headerTitleWrap}>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('manager.title_short', 'Station Manager')}</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>{t('manager.online', 'ONLINE')}</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {analytics?.operatorName || 'Mahavir EV Charging Network'}
            </Text>
          </View>
        </View>

        {/* Action Controls: Refresh */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity onPress={onRefresh} style={[styles.headerActionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={17} color="#10B981" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Sub-Tab Navigation Bar */}
      {!hideTopNav && (
        <View style={[styles.tabBar, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
            {[
              { id: 'analytics' as const, label: t('manager.tab_analytics', 'Analytics'), icon: 'stats-chart' },
              { id: 'stations' as const, label: t('manager.tab_stations', 'Stations'), icon: 'business' },
              { id: 'pricing' as const, label: t('manager.tab_pricing', 'Tariff Rules'), icon: 'pricetag' },
              { id: 'sessions' as const, label: t('manager.tab_sessions', 'Live Sessions'), icon: 'flash' },
              { id: 'payout' as const, label: t('manager.tab_payout', 'Payout & Bank'), icon: 'wallet' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tabItem,
                    isActive && styles.tabItemActive,
                    isActive && { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.12)' },
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isActive ? (tab.icon as any) : (`${tab.icon}-outline` as any)}
                    size={16}
                    color={isActive ? '#10B981' : themeColors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isActive ? '#10B981' : themeColors.textSecondary },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}



      {/* Main Content View */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>{t('manager.telemetry_loading', 'Loading Manager Telemetry...')}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        >
          {/* TAB 1: ANALYTICS & OVERVIEW */}
          {activeTab === 'analytics' && (
            <View>
              {/* Demand Charge Penalty Risk Warning */}
              {analytics?.demandChargeRisk && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning-outline" size={24} color="#EF4444" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.warningBannerTitle}>⚠️ Demand Charge Penalty Risk</Text>
                    <Text style={styles.warningBannerDesc}>
                      Active station load is currently {analytics?.currentActiveLoadKw} kW (approaching max {analytics?.maxTransformerKw} kW limit). Consider turning on peak ToU pricing.
                    </Text>
                  </View>
                </View>
              )}

              {/* Top Stats Cards */}
              <View style={styles.statsGrid}>
                <Card style={[styles.metricCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <Text style={styles.metricEmoji}>💰</Text>
                  <Text style={[styles.metricVal, { color: themeColors.textPrimary }]}>₹{analytics?.totalRevenue?.toLocaleString('en-IN')}</Text>
                  <Text style={[styles.metricLbl, { color: themeColors.textSecondary }]}>{t('manager.total_revenue', 'Total Station Revenue')}</Text>
                </Card>

                <Card style={[styles.metricCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <Text style={styles.metricEmoji}>⚡</Text>
                  <Text style={[styles.metricVal, { color: themeColors.textPrimary }]}>{analytics?.totalEnergyKwh} kWh</Text>
                  <Text style={[styles.metricLbl, { color: themeColors.textSecondary }]}>{t('manager.clean_power_delivered', 'Clean Power Delivered')}</Text>
                </Card>

                <Card style={[styles.metricCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <Text style={styles.metricEmoji}>🌿</Text>
                  <Text style={[styles.metricVal, { color: '#10B981' }]}>{analytics?.avgRenewablePct}%</Text>
                  <Text style={[styles.metricLbl, { color: themeColors.textSecondary }]}>{t('manager.green_share', 'Green Share')} vs {analytics?.gridAverageRenewablePct}% Grid Avg</Text>
                </Card>

                <Card style={[styles.metricCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <Text style={styles.metricEmoji}>📊</Text>
                  <Text style={[styles.metricVal, { color: themeColors.textPrimary }]}>{analytics?.utilizationPct}%</Text>
                  <Text style={[styles.metricLbl, { color: themeColors.textSecondary }]}>{t('manager.utilization_rate', 'Network Utilization Rate')}</Text>
                </Card>
              </View>

              {/* Station Overview Breakdown */}
              <Card style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                <Text style={[styles.sectionCardTitle, { color: themeColors.textPrimary }]}>{t('manager.operational_status', 'Operational Status')}</Text>

                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>{t('manager.managed_stations', 'Managed Stations')}</Text>
                  <Text style={[styles.rowValue, { color: themeColors.textPrimary }]}>{analytics?.totalStations} {t('manager.hubs', 'Hubs')}</Text>
                </View>

                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>{t('manager.active_sessions', 'Active Charging Sessions')}</Text>
                  <View style={styles.badgeGreen}>
                    <Text style={styles.badgeGreenText}>⚡ {analytics?.activeSessionsCount} {t('manager.live_now', 'Live Now')}</Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                <View style={styles.rowBetween}>
                  <Text style={[styles.rowLabel, { color: themeColors.textSecondary }]}>{t('manager.co2_avoided', 'Net CO₂ Emissions Avoided')}</Text>
                  <Text style={[styles.rowValue, { color: '#10B981', fontWeight: '700' }]}>{analytics?.totalCo2AvoidedKg} kg</Text>
                </View>
              </Card>
            </View>
          )}

          {/* TAB 2: STATIONS & CONNECTORS */}
          {activeTab === 'stations' && (
            <View>
              <Button
                title="➕ Onboard New Charging Station"
                variant="primary"
                onPress={() => setShowOnboardModal(true)}
                style={{ marginBottom: 16, backgroundColor: '#059669' }}
                fullWidth
              />

              {stations.map((stn) => (
                <Card key={stn.id} style={[styles.stationCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stationCardTitle, { color: themeColors.textPrimary }]}>{stn.name}</Text>
                      <Text style={[styles.stationCardSub, { color: themeColors.textSecondary }]}>📍 {stn.address}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: stn.isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                      <Text style={[styles.statusPillText, { color: stn.isActive ? '#15803D' : '#B91C1C' }]}>
                        {stn.isActive ? 'ACTIVE' : 'OFFLINE'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.connectorSectionTitle, { color: themeColors.textSecondary }]}>Connectors & Plugs:</Text>

                  {stn.connectors.map((conn) => (
                    <View key={conn.id} style={[styles.connectorBox, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.connectorName, { color: themeColors.textPrimary }]}>
                          {conn.type.toUpperCase()} · {conn.powerKw} kW DC
                        </Text>
                        <Text style={[styles.connectorCount, { color: themeColors.textSecondary }]}>
                          Available: {conn.availableCount} / {conn.totalCount} Plugs
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          { backgroundColor: conn.status === 'maintenance' ? '#10B981' : '#EF4444' },
                        ]}
                        onPress={() => handleToggleMaintenance(conn.id, conn.status)}
                      >
                        <Text style={styles.toggleBtnText}>
                          {conn.status === 'maintenance' ? 'Set Available' : 'Maintenance'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </Card>
              ))}
            </View>
          )}

          {/* TAB 3: PRICING ENGINE */}
          {activeTab === 'pricing' && (
            <View>
              <Button
                title="➕ Configure / Add Tariff Rule"
                variant="primary"
                onPress={() => openCreatePricingModal()}
                style={{ marginBottom: 16, backgroundColor: '#059669' }}
                fullWidth
              />

              {pricingList.map((item) => (
                <Card key={item.stationId} style={[styles.pricingCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.pricingCardTitle, { color: themeColors.textPrimary, flex: 1 }]}>{item.stationName}</Text>
                    <View style={[styles.statusPill, { backgroundColor: item.pricingRule?.enableDynamicDiscount ? '#DCFCE7' : '#F3F4F6' }]}>
                      <Text style={[styles.statusPillText, { color: item.pricingRule?.enableDynamicDiscount ? '#15803D' : '#4B5563' }]}>
                        {item.pricingRule?.enableDynamicDiscount ? 'SOLAR TOU ON' : 'FIXED TARIFF'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rowBetween}>
                    <Text style={[styles.pricingLabel, { color: themeColors.textSecondary }]}>Grid Base Tariff Rate</Text>
                    <Text style={[styles.pricingVal, { color: themeColors.textPrimary }]}>₹{item.baseTariff.toFixed(2)} / kWh</Text>
                  </View>

                  <View style={styles.rowBetween}>
                    <Text style={[styles.pricingLabel, { color: themeColors.textSecondary }]}>Manager Profit Markup</Text>
                    <Text style={[styles.pricingVal, { color: '#10B981', fontWeight: '700' }]}>
                      +₹{(item.pricingRule?.providerMarkup ?? 3.0).toFixed(2)} / kWh
                    </Text>
                  </View>

                  <View style={styles.rowBetween}>
                    <Text style={[styles.pricingLabel, { color: themeColors.textSecondary }]}>Max Dynamic Solar Discount</Text>
                    <Text style={[styles.pricingVal, { color: '#059669', fontWeight: '600' }]}>
                      -₹{(item.pricingRule?.discountMaxKwh ?? 3.0).toFixed(2)} / kWh
                    </Text>
                  </View>

                  <View style={styles.rowBetween}>
                    <Text style={[styles.pricingLabel, { color: themeColors.textSecondary }]}>Low Occupancy Incentive</Text>
                    <Text style={[styles.pricingVal, { color: '#2563EB', fontWeight: '600' }]}>
                      -₹{(item.pricingRule?.lowOccupancyDiscountInr ?? 2.0).toFixed(2)} / kWh (Plugs ≥ {item.pricingRule?.occupancyThresholdPct ?? 50}%)
                    </Text>
                  </View>

                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

                  {/* 24-Hour Preview Curve */}
                  <Text style={[styles.curveTitle, { color: themeColors.textSecondary }]}>24-Hour Dynamic Rate Curve Preview:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.curveScroll}>
                    {item.hourlyPreview.map((h, i) => (
                      <View
                        key={i}
                        style={[
                          styles.curveBar,
                          {
                            backgroundColor: h.isSolarPeak
                              ? '#DCFCE7'
                              : h.isEveningPeak
                              ? '#FEE2E2'
                              : isDark
                              ? '#374151'
                              : '#F1F5F9',
                          },
                        ]}
                      >
                        <Text style={[styles.curveBarPrice, { color: h.isSolarPeak ? '#16A34A' : h.isEveningPeak ? '#DC2626' : themeColors.textPrimary }]}>
                          ₹{h.price}
                        </Text>
                        <Text style={[styles.curveBarHour, { color: themeColors.textSecondary }]}>{h.hour}</Text>
                      </View>
                    ))}
                  </ScrollView>

                  {/* Action Row for CRUD */}
                  <View style={[styles.actionRow, { marginTop: 14 }]}>
                    <Button
                      title="✏️ Edit Rule"
                      variant="outline"
                      onPress={() => openEditPricingModal(item)}
                      style={{ flex: 1, borderColor: '#10B981' }}
                    />
                    <Button
                      title="🗑️ Reset Rule"
                      variant="ghost"
                      onPress={() => handleDeletePricingRule(item.pricingRule?.id || item.stationId, item.stationName)}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* TAB 4: LIVE SESSIONS & REFUNDS */}
          {activeTab === 'sessions' && (
            <View>
              {sessions.map((sess) => (
                <Card key={sess.id} style={[styles.sessionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.sessionDriverName, { color: themeColors.textPrimary }]}>{sess.user?.name || 'EV Driver'}</Text>
                    <View style={[styles.sessionBadge, { backgroundColor: sess.status === 'active' ? '#DCFCE7' : '#F1F5F9' }]}>
                      <Text style={[styles.sessionBadgeText, { color: sess.status === 'active' ? '#15803D' : '#64748B' }]}>
                        {sess.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.sessionStationName, { color: themeColors.textSecondary }]}>
                    {sess.station?.name} · {sess.connector?.type?.toUpperCase()}
                  </Text>

                  <View style={styles.rowBetween}>
                    <Text style={[styles.sessionMetrics, { color: themeColors.textPrimary }]}>
                      {sess.energyKwh?.toFixed(2)} kWh · ₹{sess.cost?.toFixed(2)}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600' }}>🌿 {sess.avgRenewablePct}% Solar/Wind</Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    {sess.status === 'active' && (
                      <Button
                        title="⏹ Force Stop"
                        variant="outline"
                        onPress={() => handleForceStop(sess.id)}
                        style={{ flex: 1, marginRight: 8, borderColor: '#EF4444' }}
                      />
                    )}

                    {sess.refundStatus === 'refunded' ? (
                      <View style={styles.refundedTag}>
                        <Text style={styles.refundedTagText}>✓ REFUNDED</Text>
                      </View>
                    ) : (
                      <Button
                        title="💳 Issue Refund"
                        variant="secondary"
                        onPress={() => {
                          setTargetRefundSessionId(sess.id);
                          setShowRefundModal(true);
                        }}
                        style={{ flex: 1 }}
                      />
                    )}
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* TAB 5: PAYOUT & BANK SETTINGS */}
          {activeTab === 'payout' && (
            <View>
              <Card style={[styles.payoutCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <Text style={[styles.payoutTitle, { color: themeColors.textPrimary }]}>{t('manager.payout_bank_details', 'Razorpay Payout Bank Details')}</Text>
              <Text style={[styles.payoutSub, { color: themeColors.textSecondary }]}>
                {t('manager.payout_desc', 'Money collected from EV charging sessions is automatically settled to this account via Razorpay.')}
              </Text>

              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>{t('manager.account_holder_name', 'Account Holder Name')}</Text>
              <TextInput
                style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                value={bankAccountName}
                onChangeText={setBankAccountName}
                placeholder="Mahavir Virda"
                placeholderTextColor={themeColors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>{t('manager.bank_name', 'Bank Name')}</Text>
              <TextInput
                style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                value={bankName}
                onChangeText={setBankName}
                placeholder="HDFC Bank"
                placeholderTextColor={themeColors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>{t('manager.account_number', 'Account Number')}</Text>
              <TextInput
                style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
                placeholder="50100492817263"
                keyboardType="numeric"
                placeholderTextColor={themeColors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>{t('manager.ifsc_code', 'IFSC Code')}</Text>
              <TextInput
                style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                value={bankIfsc}
                onChangeText={setBankIfsc}
                placeholder="HDFC0000240"
                autoCapitalize="characters"
                placeholderTextColor={themeColors.textSecondary}
              />

              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

              <Text style={[styles.payoutTitle, { color: themeColors.textPrimary }]}>{t('manager.alert_toggles', 'Alert & Notification Toggles')}</Text>

              <View style={styles.rowBetween}>
                <Text style={[styles.rowLabel, { color: themeColors.textPrimary }]}>{t('manager.outage_alerts', 'Outage & Connector Offline Alerts')}</Text>
                <Switch value={outageAlerts} onValueChange={setOutageAlerts} trackColor={{ true: '#10B981' }} />
              </View>

              <View style={styles.rowBetween}>
                <Text style={[styles.rowLabel, { color: themeColors.textPrimary }]}>{t('manager.email_alerts', 'Email Settlement Summaries')}</Text>
                <Switch value={emailAlerts} onValueChange={setEmailAlerts} trackColor={{ true: '#10B981' }} />
              </View>

              <Button
                title={savingPayout ? 'Saving Settings...' : t('manager.save_payout_settings', '💾 Save Bank & Alert Settings')}
                variant="primary"
                loading={savingPayout}
                onPress={handleSavePayout}
                style={{ marginTop: 20, backgroundColor: '#059669' }}
                fullWidth
              />
            </Card>

            {/* App Preferences & Sign Out Card */}
            <Card style={[styles.sectionCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border, marginTop: 16 }]}>
              <Text style={[styles.sectionCardTitle, { color: themeColors.textPrimary, marginBottom: 12 }]}>{t('manager.app_preferences', '🌐 App Preferences & Governance')}</Text>

              {/* Language Switcher Row */}
              <TouchableOpacity
                style={[styles.rowBetween, { paddingVertical: 8 }]}
                onPress={() => setLanguage(language === 'hi' ? 'en' : 'hi')}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="language-outline" size={20} color={themeColors.textPrimary} />
                  <Text style={[styles.rowLabel, { color: themeColors.textPrimary }]}>{t('manager.app_language', 'App Language / भाषा')}</Text>
                </View>
                <View style={{ backgroundColor: '#10B9811A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#10B981' }}>
                    {language === 'hi' ? 'हिन्दी (Hindi)' : 'English'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

              {/* Theme Switcher Row */}
              <TouchableOpacity
                style={[styles.rowBetween, { paddingVertical: 8 }]}
                onPress={toggleTheme}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={isDark ? '#F59E0B' : '#6366F1'} />
                  <Text style={[styles.rowLabel, { color: themeColors.textPrimary }]}>{t('manager.appearance_theme', 'Appearance Theme')}</Text>
                </View>
                <View style={{ backgroundColor: isDark ? '#334155' : '#E2E8F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: themeColors.textPrimary }}>
                    {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

              {/* Sign Out Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#FEF2F2',
                  borderWidth: 1,
                  borderColor: '#FCA5A5',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 10,
                }}
                onPress={() => {
                  Alert.alert(t('manager.sign_out', 'Sign Out'), t('manager.sign_out_confirm', 'Are you sure you want to log out of Station Manager?'), [
                    { text: 'Cancel', style: 'cancel' },
                    { text: t('manager.sign_out', 'Sign Out'), style: 'destructive', onPress: () => signOut() },
                  ]);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={18} color="#DC2626" />
                <Text style={{ color: '#DC2626', fontWeight: '800', fontSize: 14 }}>Sign Out of Manager Account</Text>
              </TouchableOpacity>
            </Card>
          </View>
        )}
        </ScrollView>
      )}

      {/* Onboard Station Modal */}
      <Modal visible={showOnboardModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Onboard New Charging Station</Text>

            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="Station Name (e.g. Statiq Hub SG Highway)"
              value={newStationName}
              onChangeText={setNewStationName}
              placeholderTextColor={themeColors.textSecondary}
            />

            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="Full Address"
              value={newStationAddress}
              onChangeText={setNewStationAddress}
              placeholderTextColor={themeColors.textSecondary}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.textInput, { flex: 1, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="Latitude (23.0441)"
                value={newStationLat}
                onChangeText={setNewStationLat}
                keyboardType="numeric"
                placeholderTextColor={themeColors.textSecondary}
              />
              <TextInput
                style={[styles.textInput, { flex: 1, color: themeColors.textPrimary, borderColor: themeColors.border }]}
                placeholder="Longitude (72.5085)"
                value={newStationLng}
                onChangeText={setNewStationLng}
                keyboardType="numeric"
                placeholderTextColor={themeColors.textSecondary}
              />
            </View>

            <Button
              title={submittingStation ? 'Onboarding...' : '🚀 Complete Onboarding'}
              variant="primary"
              loading={submittingStation}
              onPress={handleOnboardStation}
              fullWidth
              style={{ marginTop: 12, backgroundColor: '#10B981' }}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowOnboardModal(false)}
              fullWidth
              style={{ marginTop: 6 }}
            />
          </View>
        </View>
      </Modal>

      {/* Refund Modal */}
      <Modal visible={showRefundModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Issue Session Refund</Text>
            <Text style={{ fontSize: 13, color: themeColors.textSecondary, marginBottom: 12 }}>
              Log dispute reason for manager audit and trigger Razorpay resolution refund.
            </Text>

            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="Reason (e.g., Power trip during session)"
              value={refundReason}
              onChangeText={setRefundReason}
              placeholderTextColor={themeColors.textSecondary}
            />

            <Button
              title={submittingRefund ? 'Processing...' : '💳 Process Refund'}
              variant="primary"
              loading={submittingRefund}
              onPress={handleIssueRefund}
              fullWidth
              style={{ marginTop: 12, backgroundColor: '#DC2626' }}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowRefundModal(false)}
              fullWidth
              style={{ marginTop: 6 }}
            />
          </View>
        </View>
      </Modal>

      {/* Pricing Rule Modal (Create & Update) */}
      <Modal visible={showPricingModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.surface }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
              {editingPricingRuleId ? '✏️ Edit Tariff Rule' : '➕ Create Dynamic Tariff Rule'}
            </Text>

            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Select Target Station</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {stations.map((stn) => (
                <TouchableOpacity
                  key={stn.id}
                  style={[
                    styles.stationPill,
                    {
                      backgroundColor: pricingTargetStationId === stn.id ? '#10B981' : isDark ? '#374151' : '#F1F5F9',
                      marginRight: 6,
                    },
                  ]}
                  onPress={() => setPricingTargetStationId(stn.id)}
                >
                  <Text style={{ color: pricingTargetStationId === stn.id ? '#FFF' : themeColors.textPrimary, fontSize: 12, fontWeight: '700' }}>
                    {stn.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Manager Profit Markup (₹/kWh)</Text>
            <TextInput
              style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
              placeholder="e.g. 3.50"
              value={pricingMarkup}
              onChangeText={setPricingMarkup}
              keyboardType="numeric"
              placeholderTextColor={themeColors.textSecondary}
            />

            <View style={styles.rowBetween}>
              <Text style={[styles.rowLabel, { color: themeColors.textPrimary }]}>Enable Solar Dynamic Green Discount</Text>
              <Switch value={pricingEnableDiscount} onValueChange={setPricingEnableDiscount} trackColor={{ true: '#10B981' }} />
            </View>

            {pricingEnableDiscount && (
              <>
                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Max Solar Discount (₹/kWh)</Text>
                <TextInput
                  style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                  placeholder="e.g. 3.00"
                  value={pricingDiscountMax}
                  onChangeText={setPricingDiscountMax}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Low Occupancy Incentive Discount (₹/kWh)</Text>
                <TextInput
                  style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                  placeholder="e.g. 2.00"
                  value={pricingLowOccDiscount}
                  onChangeText={setPricingLowOccDiscount}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textSecondary}
                />

                <Text style={[styles.inputLabel, { color: themeColors.textSecondary }]}>Occupancy Threshold Trigger (%)</Text>
                <TextInput
                  style={[styles.textInput, { color: themeColors.textPrimary, borderColor: themeColors.border }]}
                  placeholder="e.g. 50"
                  value={pricingOccThreshold}
                  onChangeText={setPricingOccThreshold}
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textSecondary}
                />
              </>
            )}

            <Button
              title={submittingPricing ? 'Saving Rule...' : editingPricingRuleId ? '💾 Save Tariff Changes' : '🚀 Apply New Tariff Rule'}
              variant="primary"
              loading={submittingPricing}
              onPress={handleSavePricingRule}
              fullWidth
              style={{ marginTop: 14, backgroundColor: '#059669' }}
            />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setShowPricingModal(false)}
              fullWidth
              style={{ marginTop: 6 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  managerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    minHeight: 34,
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabBar: { borderBottomWidth: 1 },
  tabScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 12 },
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

  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  warningBannerTitle: { fontSize: 14, fontWeight: '800', color: '#991B1B' },
  warningBannerDesc: { fontSize: 12, color: '#B91C1C', marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  metricCard: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 16, borderWidth: 1, elevation: 1 },
  metricEmoji: { fontSize: 24, marginBottom: 6 },
  metricVal: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  metricLbl: { fontSize: 11, fontWeight: '600', marginTop: 4 },

  sectionCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  sectionCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
  rowLabel: { fontSize: 13, fontWeight: '600' },
  rowValue: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1, marginVertical: 10 },
  badgeGreen: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeGreenText: { fontSize: 12, color: '#15803D', fontWeight: '700' },

  stationCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  stationCardTitle: { fontSize: 16, fontWeight: '800' },
  stationCardSub: { fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  connectorSectionTitle: { fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  connectorBox: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8 },
  connectorName: { fontSize: 14, fontWeight: '700' },
  connectorCount: { fontSize: 12, marginTop: 2 },
  toggleBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  toggleBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

  pricingCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  pricingCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  pricingLabel: { fontSize: 13 },
  pricingVal: { fontSize: 14, fontWeight: '700' },
  curveTitle: { fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  curveScroll: { flexDirection: 'row', gap: 6 },
  curveBar: { width: 52, padding: 8, borderRadius: 10, alignItems: 'center', marginRight: 6 },
  curveBarPrice: { fontSize: 11, fontWeight: '800' },
  curveBarHour: { fontSize: 9, marginTop: 4 },

  sessionCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  sessionDriverName: { fontSize: 15, fontWeight: '800' },
  sessionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  sessionBadgeText: { fontSize: 10, fontWeight: '800' },
  sessionStationName: { fontSize: 12, marginVertical: 4 },
  sessionMetrics: { fontSize: 14, fontWeight: '700' },
  actionRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  refundedTag: { backgroundColor: '#DCFCE7', padding: 8, borderRadius: 8, alignItems: 'center', flex: 1 },
  refundedTagText: { color: '#15803D', fontWeight: '800', fontSize: 12 },

  payoutCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  payoutTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  payoutSub: { fontSize: 12, marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  textInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 14, marginBottom: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { padding: 20, borderRadius: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  stationPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
});
