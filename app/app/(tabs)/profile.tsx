/**
 * Profile Screen
 * User profile and settings with dynamic Theme and Hindi/English translation
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useLiveGrid } from '@/hooks/useLiveGrid';
import { getLiveGridSnapshot, greennessColor, greennessBandLabel } from '@/lib/gridData';
import { spacing } from '@/styles/spacing';
import { getGamificationProfile } from '@/services/gamification.service';
import { GamificationProfile } from '@contracts/types';
import { useVehiclesStore } from '@/src/features/vehicles/vehiclesStore';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
  colors: any;
}

function MenuItem({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  danger = false,
  colors,
}: MenuItemProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.borderLight }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuIconContainer,
          { backgroundColor: danger ? '#FEE2E2' : colors.primaryLight },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.error : colors.primary}
        />
      </View>
      <Text
        style={[
          styles.menuLabel,
          { color: danger ? colors.error : colors.textPrimary },
        ]}
      >
        {label}
      </Text>
      {value && (
        <Text style={[styles.menuValue, { color: colors.textSecondary }]}>
          {value}
        </Text>
      )}
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const [gamification, setGamification] = React.useState<GamificationProfile | null>(null);

  const vehicles = useVehiclesStore((state) => state.vehicles);
  const activeVehicleId = useVehiclesStore((state) => state.activeVehicleId);
  const hydrateVehicles = useVehiclesStore((state) => state.hydrate);
  const activeVehicle = vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];

  const refreshGamification = useCallback(() => {
    hydrateVehicles();
    getGamificationProfile()
      .then((data) => setGamification(data))
      .catch(() => {});
  }, [hydrateVehicles]);

  // Live grid snapshot for the Green Impact card
  const { liveGrid, refresh: refreshLiveGrid } = useLiveGrid('IN-WE');

  // Live refresh on focus whenever user visits profile
  useFocusEffect(
    useCallback(() => {
      refreshGamification();
      refreshLiveGrid();
    }, [refreshGamification, refreshLiveGrid])
  );
  const gridColor = greennessColor(liveGrid.renewablePct);
  const gridBandLabel = greennessBandLabel(liveGrid.band);
  const bkdTotal = Object.values(liveGrid.breakdown).reduce((a, b) => a + b, 0);
  const bkd = liveGrid.breakdown;
  const solarPct = bkdTotal > 0 ? Math.round((bkd.solar / bkdTotal) * 100) : 0;
  const windPct = bkdTotal > 0 ? Math.round((bkd.wind / bkdTotal) * 100) : 0;
  const hydroPct = bkdTotal > 0 ? Math.round((bkd.hydro / bkdTotal) * 100) : 0;
  const coalGasPct = bkdTotal > 0 ? Math.round(((bkd.coal + bkd.gas) / bkdTotal) * 100) : 0;
  const otherPct = 100 - solarPct - windPct - hydroPct - coalGasPct;

  const handleSignOut = () => {
    Alert.alert(
      t('support.sign_out', 'Sign Out'),
      t('support.sign_out_confirm', 'Are you sure you want to sign out?'),
      [
        { text: t('support.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('support.sign_out', 'Sign Out'),
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={() => router.push('/modal/edit-profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={[styles.editBadge, { backgroundColor: colors.primaryDark }]}>
              <Ionicons name="pencil" size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.userNameRow}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {profile?.full_name || t('profile.title', 'User')}
            </Text>
            <TouchableOpacity
              style={[styles.editProfileChip, { backgroundColor: colors.primaryLight }]}
              onPress={() => router.push('/modal/edit-profile')}
              activeOpacity={0.7}
            >
              <Text style={[styles.editProfileChipText, { color: colors.primary }]}>
                {t('profile.edit', 'Edit')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {profile?.email || 'driver@ecovolt.in'}
          </Text>
          {profile?.phone ? (
            <Text style={[styles.userPhone, { color: colors.textMuted }]}>{profile.phone}</Text>
          ) : null}
        </View>

        {/* Dynamic Green Stats */}
        <TouchableOpacity
          style={[styles.statsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/leaderboard')}
          activeOpacity={0.8}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {gamification ? gamification.greenScore.toLocaleString() : '0'}
            </Text>
            <Text style={styles.statLabel}>Green Pts (Rank #{gamification?.rank || 1})</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {gamification ? `${gamification.cleanKwh} kWh` : '0 kWh'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('profile.clean_power', 'Clean Power')}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {gamification ? `${gamification.co2AvoidedKg} kg` : '0.0 kg'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('profile.co2_saved', 'CO₂ Saved')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Gamification & Green Impact Hub */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>
            {t('profile.eco_impact_standing', 'Eco Impact & Standing')}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MenuItem
              colors={colors}
              icon="trophy-outline"
              label={t('profile.leaderboard_green_score', 'Leaderboard & Green Score')}
              value={gamification ? `Rank #${gamification.rank} • 🔥 ${gamification.currentStreak} Streak` : t('profile.view_rankings', 'View Rankings')}
              onPress={() => router.push('/leaderboard')}
            />
            <MenuItem
              colors={colors}
              icon="ribbon-outline"
              label={t('profile.badges_achievements', 'Badges & Achievements')}
              value={gamification ? `${gamification.badges.filter(b => b.unlocked).length} ${t('profile.unlocked', 'Unlocked')}` : `5 ${t('profile.badges', 'Badges')}`}
              onPress={() => router.push('/leaderboard')}
            />
          </View>
        </View>

        {/* ── Green Impact Card ── */}
        <View style={[styles.greenImpactCard, { backgroundColor: isDark ? '#08150F' : '#0B1F16' }]}>
          {/* Header */}
          <View style={styles.greenImpactHeader}>
            <View style={styles.greenImpactLeft}>
              <View style={styles.liveIndicator} />
              <Text style={styles.greenImpactZone}>{t('profile.live_grid', 'West India · IN-WE Grid')}</Text>
            </View>
            <View style={[styles.greenBandBadge, { backgroundColor: gridColor + '25' }]}>
              <Text style={[styles.greenBandBadgeText, { color: gridColor }]}>{gridBandLabel}</Text>
            </View>
          </View>

          {/* Big number */}
          <View style={styles.greenImpactBody}>
            <View>
              <Text style={[styles.greenBigPct, { color: gridColor }]}>{liveGrid.renewablePct.toFixed(0)}%</Text>
              <Text style={styles.greenBigLabel}>{t('profile.renewable_now', 'Renewable now')}</Text>
            </View>
            <View style={styles.greenImpactRight}>
              <Text style={styles.greenImpactStat}>
                <Text style={styles.greenImpactStatVal}>{liveGrid.carbonIntensity} </Text>
                <Text style={styles.greenImpactStatUnit}>gCO₂/kWh</Text>
              </Text>
              <Text style={styles.greenImpactStat}>
                <Text style={styles.greenImpactStatVal}>{liveGrid.carbonFreePct.toFixed(0)}% </Text>
                <Text style={styles.greenImpactStatUnit}>{t('profile.carbon_free', 'carbon-free')}</Text>
              </Text>
            </View>
          </View>

          {/* Grid mix bar */}
          <View style={styles.greenMixBar}>
            {solarPct > 0 && <View style={[styles.greenMixSeg, { flex: solarPct, backgroundColor: '#F59E0B' }]} />}
            {windPct > 0 && <View style={[styles.greenMixSeg, { flex: windPct, backgroundColor: '#0FB8C9' }]} />}
            {hydroPct > 0 && <View style={[styles.greenMixSeg, { flex: hydroPct, backgroundColor: '#3B82F6' }]} />}
            {coalGasPct > 0 && <View style={[styles.greenMixSeg, { flex: coalGasPct, backgroundColor: '#6B7280' }]} />}
            {otherPct > 0 && <View style={[styles.greenMixSeg, { flex: otherPct, backgroundColor: '#374151' }]} />}
          </View>
          <View style={styles.greenMixLegend}>
            <Text style={styles.greenMixLabel}>☀ {t('profile.solar', 'Solar')} {solarPct}%</Text>
            <Text style={styles.greenMixLabel}>💨 {t('profile.wind', 'Wind')} {windPct}%</Text>
            <Text style={styles.greenMixLabel}>💧 {t('profile.hydro', 'Hydro')} {hydroPct}%</Text>
            <Text style={styles.greenMixLabel}>🏭 {t('profile.coal_gas', 'Coal+Gas')} {coalGasPct}%</Text>
          </View>

          {/* Lifetime impact */}
          <View style={styles.greenLifetimeDivider} />
          <Text style={styles.greenLifetimeTitle}>{t('profile.lifetime_impact', 'Your Lifetime Green Impact')}</Text>
          <View style={styles.greenLifetimeRow}>
            <View style={styles.greenLifetimeStat}>
              <Text style={styles.greenLifetimeVal}>
                {gamification ? `${gamification.co2AvoidedKg} kg` : '0.0 kg'}
              </Text>
              <Text style={styles.greenLifetimeKey}>{t('profile.co2_avoided', 'CO₂ avoided')}</Text>
            </View>
            <View style={styles.greenLifetimeStat}>
              <Text style={styles.greenLifetimeVal}>
                {gamification ? `${gamification.cleanKwh} kWh` : '0 kWh'}
              </Text>
              <Text style={styles.greenLifetimeKey}>{t('profile.from_renewables', 'from renewables')}</Text>
            </View>
            <View style={styles.greenLifetimeStat}>
              <Text style={[styles.greenLifetimeVal, { color: '#10B981' }]}>
                {gamification ? `₹${gamification.totalSavingsInr || 0}` : '₹0'}
              </Text>
              <Text style={styles.greenLifetimeKey}>{t('profile.saved_green_windows', 'saved (green windows)')}</Text>
            </View>
          </View>
        </View>

        {/* Workspace Portals */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>
            {t('portal.title', 'Workspace Portals')}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MenuItem
              colors={colors}
              icon="business-outline"
              label={t('portal.station_manager', 'Station Manager Hub')}
              value={t('portal.station_manager_desc', 'Occupancy & Pricing')}
              onPress={() => {
                Alert.alert(
                  t('portal.station_manager', 'Station Manager Hub'),
                  'Accessing Station Manager telemetry: 4 Chargers active, ₹6.20/kWh base rate, 94% renewable grid source.',
                  [{ text: t('common.ok', 'OK') }]
                );
              }}
            />
            <MenuItem
              colors={colors}
              icon="shield-checkmark-outline"
              label={t('portal.admin_console', 'Network Admin Console')}
              value={t('portal.admin_console_desc', 'Network Health')}
              onPress={() => {
                Alert.alert(
                  t('portal.admin_console', 'Network Admin Console'),
                  'Network Health: 99.8% uptime across 18 stations in Gujarat grid zone. All smart contracts synced.',
                  [{ text: t('common.ok', 'OK') }]
                );
              }}
            />
          </View>
        </View>

        {/* Account Menu */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>
            {t('account.title', 'Account')}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MenuItem
              colors={colors}
              icon="person-outline"
              label={t('account.edit_profile', 'Edit Profile')}
              value={t('account.personal_info', 'Personal Info')}
              onPress={() => {
                router.push('/modal/edit-profile');
              }}
            />
            <MenuItem
              colors={colors}
              icon="car-outline"
              label={t('account.my_vehicles', 'My Vehicles')}
              value={activeVehicle ? (activeVehicle.model || 'Active EV') : t('account.no_vehicles', 'No Vehicles')}
              onPress={() => {
                router.push('/vehicles');
              }}
            />
            <MenuItem
              colors={colors}
              icon="card-outline"
              label={t('account.payment_methods', 'Payment Methods')}
              value={t('account.upi_wallet', 'UPI / Wallet')}
              onPress={() => {
                router.push('/modal/payment-methods');
              }}
            />
            <MenuItem
              colors={colors}
              icon="receipt-outline"
              label={t('account.charging_history', 'Charging History')}
              onPress={() => {
                router.push('/(tabs)/reservations');
              }}
            />
          </View>
        </View>

        {/* Preferences Menu */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>
            {t('pref.title', 'Preferences')}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MenuItem
              colors={colors}
              icon="notifications-outline"
              label={t('pref.notifications', 'Notifications & Alerts')}
              value={t('pref.enabled', 'Enabled')}
              onPress={() => {
                router.push('/modal/notifications-settings');
              }}
            />
            <MenuItem
              colors={colors}
              icon="moon-outline"
              label={t('pref.appearance', 'Appearance & Theme')}
              value={t('pref.theme_sub', 'Dark / Light')}
              onPress={() => {
                router.push('/modal/appearance');
              }}
            />
            <MenuItem
              colors={colors}
              icon="language-outline"
              label={t('pref.language', 'Language')}
              value={language === 'hi' ? 'हिन्दी' : 'English'}
              onPress={() => {
                router.push('/modal/language');
              }}
            />
          </View>
        </View>

        {/* Support & Legal Menu */}
        <View style={styles.menuSection}>
          <Text style={[styles.menuSectionTitle, { color: colors.textSecondary }]}>
            {t('support.title', 'Support & Legal')}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MenuItem
              colors={colors}
              icon="help-circle-outline"
              label={t('support.help_center', 'Help Center & FAQ')}
              value={t('support.help_center_sub', 'Guides & Tips')}
              onPress={() => {
                router.push('/modal/help-center');
              }}
            />
            <MenuItem
              colors={colors}
              icon="chatbubble-outline"
              label={t('support.contact_us', 'Contact Us & 24/7 Hotline')}
              value={t('support.contact_sub', 'Support')}
              onPress={() => {
                router.push('/modal/contact-us');
              }}
            />
            <MenuItem
              colors={colors}
              icon="document-text-outline"
              label={t('support.terms_privacy', 'Terms & Privacy Policy')}
              value={t('support.terms_sub', 'Legal')}
              onPress={() => {
                router.push('/modal/terms-privacy');
              }}
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.menuSection}>
          <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MenuItem
              colors={colors}
              icon="log-out-outline"
              label={t('support.sign_out', 'Sign Out')}
              onPress={handleSignOut}
              showChevron={false}
              danger
            />
          </View>
        </View>

        {/* App Version */}
        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          {t('support.app_version', 'VoltSpot v1.0.0')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.screenPadding,
    borderBottomWidth: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
  },
  editProfileChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  editProfileChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  userPhone: {
    fontSize: 13,
    marginTop: 2,
  },

  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    marginVertical: spacing.xs,
  },
  menuSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    borderRadius: spacing.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    marginLeft: spacing.md,
    fontWeight: '500',
  },
  menuValue: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginVertical: spacing.xl,
  },

  // ── Green Impact Card ────────────────────────────────────────────────
  greenImpactCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0E2018',
  },
  greenImpactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  greenImpactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0FB8C9',
  },
  greenImpactZone: {
    fontSize: 12,
    color: '#8A998F',
    fontWeight: '500',
  },
  greenBandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  greenBandBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  greenImpactBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  greenBigPct: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 52,
  },
  greenBigLabel: {
    fontSize: 11,
    color: '#8A998F',
    fontWeight: '500',
    marginTop: 2,
  },
  greenImpactRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  greenImpactStat: {
    textAlign: 'right',
  },
  greenImpactStatVal: {
    fontSize: 14,
    color: '#8A998F',
    fontWeight: '600',
  },
  greenImpactStatUnit: {
    fontSize: 12,
    color: '#4C5C54',
  },
  greenMixBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#0E2018',
  },
  greenMixSeg: {
    height: '100%',
  },
  greenMixLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  greenMixLabel: {
    fontSize: 11,
    color: '#4C5C54',
    fontWeight: '500',
  },
  greenLifetimeDivider: {
    height: 1,
    backgroundColor: '#0E2018',
    marginBottom: 12,
  },
  greenLifetimeTitle: {
    fontSize: 12,
    color: '#4C5C54',
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greenLifetimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  greenLifetimeStat: {
    alignItems: 'center',
    flex: 1,
  },
  greenLifetimeVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8A998F',
  },
  greenLifetimeKey: {
    fontSize: 10,
    color: '#4C5C54',
    textAlign: 'center',
    marginTop: 2,
  },
});
