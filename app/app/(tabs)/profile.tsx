/**
 * Profile Screen
 * User profile and settings
 */

import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useLiveGrid } from '@/hooks/useLiveGrid';
import { getLiveGridSnapshot, greennessColor, greennessBandLabel } from '@/lib/gridData';
import { spacing } from '@/styles/spacing';
import { getGamificationProfile } from '@/services/gamification.service';
import { GamificationProfile } from '@contracts/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';

import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  showChevron?: boolean;
  danger?: boolean;
}

function MenuItem({ icon, label, value, onPress, showChevron = true, danger = false }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconContainer, danger && styles.menuIconDanger]}>
        <Ionicons 
          name={icon} 
          size={20} 
          color={danger ? colors.error : colors.primary[500]} 
        />
      </View>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {showChevron && (
        <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
      )}
    </TouchableOpacity>
  );
}


export default function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [gamification, setGamification] = React.useState<GamificationProfile | null>(null);

  React.useEffect(() => {
    getGamificationProfile()
      .then((data) => setGamification(data))
      .catch(() => {});
  }, []);

  // Live grid snapshot for the Green Impact card
  const { liveGrid } = useLiveGrid('IN-WE');
  const gridColor = greennessColor(liveGrid.renewablePct);
  const gridBandLabel = greennessBandLabel(liveGrid.band);
  const bkdTotal = Object.values(liveGrid.breakdown).reduce((a, b) => a + b, 0);
  const bkd = liveGrid.breakdown;
  const solarPct  = bkdTotal > 0 ? Math.round((bkd.solar  / bkdTotal) * 100) : 0;
  const windPct   = bkdTotal > 0 ? Math.round((bkd.wind   / bkdTotal) * 100) : 0;
  const hydroPct  = bkdTotal > 0 ? Math.round((bkd.hydro  / bkdTotal) * 100) : 0;
  const coalGasPct= bkdTotal > 0 ? Math.round(((bkd.coal + bkd.gas) / bkdTotal) * 100) : 0;
  const otherPct  = 100 - solarPct - windPct - hydroPct - coalGasPct;


  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.userEmail}>{profile?.email}</Text>
        </View>

        {/* Dynamic Green Stats */}
        <TouchableOpacity
          style={styles.statsContainer}
          onPress={() => router.push('/leaderboard')}
          activeOpacity={0.8}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {gamification ? gamification.greenScore.toLocaleString() : '1,646'}
            </Text>
            <Text style={styles.statLabel}>Green Pts (Rank #{gamification?.rank || 2})</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {gamification ? `${gamification.cleanKwh} kWh` : '131 kWh'}
            </Text>
            <Text style={styles.statLabel}>Clean Power</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {gamification ? `${gamification.co2AvoidedKg} kg` : '110.8 kg'}
            </Text>
            <Text style={styles.statLabel}>CO₂ Saved</Text>
          </View>
        </TouchableOpacity>

        {/* Gamification & Green Impact Hub */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Eco Impact & Standing</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="trophy-outline"
              label="Leaderboard & Green Score"
              value={gamification ? `Rank #${gamification.rank} • 🔥 ${gamification.currentStreak} Streak` : 'View Rankings'}
              onPress={() => router.push('/leaderboard')}
            />
            <MenuItem
              icon="ribbon-outline"
              label="Badges & Achievements"
              value={gamification ? `${gamification.badges.filter(b => b.unlocked).length} Unlocked` : '5 Badges'}
              onPress={() => router.push('/leaderboard')}
            />
          </View>
        </View>

        {/* ── Green Impact Card ── */}
        <View style={styles.greenImpactCard}>
          {/* Header */}
          <View style={styles.greenImpactHeader}>
            <View style={styles.greenImpactLeft}>
              <View style={styles.liveIndicator} />
              <Text style={styles.greenImpactZone}>West India · IN-WE Grid</Text>
            </View>
            <View style={[styles.greenBandBadge, { backgroundColor: gridColor + '25' }]}>
              <Text style={[styles.greenBandBadgeText, { color: gridColor }]}>{gridBandLabel}</Text>
            </View>
          </View>

          {/* Big number */}
          <View style={styles.greenImpactBody}>
            <View>
              <Text style={[styles.greenBigPct, { color: gridColor }]}>{liveGrid.renewablePct.toFixed(0)}%</Text>
              <Text style={styles.greenBigLabel}>Renewable now</Text>
            </View>
            <View style={styles.greenImpactRight}>
              <Text style={styles.greenImpactStat}>
                <Text style={styles.greenImpactStatVal}>{liveGrid.carbonIntensity} </Text>
                <Text style={styles.greenImpactStatUnit}>gCO₂/kWh</Text>
              </Text>
              <Text style={styles.greenImpactStat}>
                <Text style={styles.greenImpactStatVal}>{liveGrid.carbonFreePct.toFixed(0)}% </Text>
                <Text style={styles.greenImpactStatUnit}>carbon-free</Text>
              </Text>
            </View>
          </View>

          {/* Grid mix bar */}
          <View style={styles.greenMixBar}>
            {solarPct > 0  && <View style={[styles.greenMixSeg, { flex: solarPct,   backgroundColor: '#F59E0B' }]} />}
            {windPct > 0   && <View style={[styles.greenMixSeg, { flex: windPct,    backgroundColor: '#0FB8C9' }]} />}
            {hydroPct > 0  && <View style={[styles.greenMixSeg, { flex: hydroPct,   backgroundColor: '#3B82F6' }]} />}
            {coalGasPct > 0 && <View style={[styles.greenMixSeg, { flex: coalGasPct, backgroundColor: '#6B7280' }]} />}
            {otherPct > 0  && <View style={[styles.greenMixSeg, { flex: otherPct,   backgroundColor: '#374151' }]} />}
          </View>
          <View style={styles.greenMixLegend}>
            <Text style={styles.greenMixLabel}>☀ Solar {solarPct}%</Text>
            <Text style={styles.greenMixLabel}>💨 Wind {windPct}%</Text>
            <Text style={styles.greenMixLabel}>💧 Hydro {hydroPct}%</Text>
            <Text style={styles.greenMixLabel}>🏭 Coal+Gas {coalGasPct}%</Text>
          </View>

          {/* Lifetime impact */}
          <View style={styles.greenLifetimeDivider} />
          <Text style={styles.greenLifetimeTitle}>Your Lifetime Green Impact</Text>
          <View style={styles.greenLifetimeRow}>
            <View style={styles.greenLifetimeStat}>
              <Text style={styles.greenLifetimeVal}>48.5 kg</Text>
              <Text style={styles.greenLifetimeKey}>CO₂ avoided</Text>
            </View>
            <View style={styles.greenLifetimeStat}>
              <Text style={styles.greenLifetimeVal}>218 kWh</Text>
              <Text style={styles.greenLifetimeKey}>from renewables</Text>
            </View>
            <View style={styles.greenLifetimeStat}>
              <Text style={[styles.greenLifetimeVal, { color: '#0E8E4F' }]}>₹312</Text>
              <Text style={styles.greenLifetimeKey}>saved (green windows)</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Workspace Portals</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="business-outline"
              label="Station Manager Hub"
              value="Occupancy & Pricing"
              onPress={() => {
                Alert.alert(
                  'Station Manager Hub',
                  'Accessing Station Manager telemetry: 4 Chargers active, ₹6.20/kWh base rate, 94% renewable grid source.',
                  [{ text: 'OK' }]
                );
              }}
            />
            <MenuItem
              icon="shield-checkmark-outline"
              label="Network Admin Console"
              value="Network Health"
              onPress={() => {
                Alert.alert(
                  'Network Admin Console',
                  'Network Health: 99.8% uptime across 18 stations in Gujarat grid zone. All smart contracts synced.',
                  [{ text: 'OK' }]
                );
              }}
            />
          </View>
        </View>

        {/* Menu Sections */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="person-outline"
              label="Edit Profile"
              onPress={() => {}}
            />
            <MenuItem
              icon="car-outline"
              label="My Vehicles"
              value="Tata Nexon EV"
              onPress={() => {
                Alert.alert('My Vehicles', 'Active: Tata Nexon EV Max (72.5 kWh, CCS2)');
              }}
            />
            <MenuItem
              icon="card-outline"
              label="Payment Methods"
              value="UPI / Card"
              onPress={() => {}}
            />
            <MenuItem
              icon="receipt-outline"
              label="Charging History"
              onPress={() => {
                router.push('/(tabs)/reservations');
              }}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Preferences</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="notifications-outline"
              label="Notifications"
              onPress={() => {}}
            />
            <MenuItem
              icon="moon-outline"
              label="Appearance"
              value="System"
              onPress={() => {}}
            />
            <MenuItem
              icon="language-outline"
              label="Language"
              value="English"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Support</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="help-circle-outline"
              label="Help Center"
              onPress={() => {}}
            />
            <MenuItem
              icon="chatbubble-outline"
              label="Contact Us"
              onPress={() => {}}
            />
            <MenuItem
              icon="document-text-outline"
              label="Terms & Privacy"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <View style={styles.menuCard}>
            <MenuItem
              icon="log-out-outline"
              label="Sign Out"
              onPress={handleSignOut}
              showChevron={false}
              danger
            />
          </View>
        </View>

        {/* App Version */}
        <Text style={styles.versionText}>VoltSpot v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  profileHeader: {
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.screenPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  userEmail: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },

  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.xs,
  },
  menuSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
  },
  menuSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: {
    backgroundColor: '#FFEBEE',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.neutral[900],
    marginLeft: spacing.md,
  },
  menuLabelDanger: {
    color: colors.error,
  },
  menuValue: {
    fontSize: 14,
    color: colors.neutral[500],
    marginRight: spacing.xs,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.neutral[400],
    marginVertical: spacing.xl,
  },

  // ── Green Impact Card ────────────────────────────────────────────────
  greenImpactCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: '#08150F',
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
