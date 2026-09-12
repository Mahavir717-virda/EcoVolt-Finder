/**
 * Profile Screen
 * User profile, settings, and plan management
 */

import { Button } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { spacing } from '@/styles/spacing';
import { getGamificationProfile } from '@/services/gamification.service';
import { GamificationProfile } from '@contracts/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
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

  const isPremium = profile?.plan_type === 'premium';

  const handleUpgrade = () => {
    router.push('/modal/upgrade');
  };

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
          
          {/* Plan Badge */}
          <View style={[styles.planBadge, isPremium && styles.planBadgePremium]}>
            <Ionicons 
              name={isPremium ? 'star' : 'star-outline'} 
              size={16} 
              color={isPremium ? colors.white : colors.neutral[600]} 
            />
            <Text style={[styles.planBadgeText, isPremium && styles.planBadgeTextPremium]}>
              {gamification?.tier || (isPremium ? 'Premium' : 'Free')} • Rank #{gamification?.rank || 2}
            </Text>
          </View>

          {!isPremium && (
            <Button
              title="Upgrade to Premium"
              onPress={handleUpgrade}
              variant="primary"
              size="sm"
              style={styles.upgradeButton}
            />
          )}
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


        {/* Workspace Portals (EcoVolt Multi-Role Hub) */}
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
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radius.full,
    backgroundColor: colors.neutral[200],
  },
  planBadgePremium: {
    backgroundColor: colors.primary[500],
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  planBadgeTextPremium: {
    color: colors.white,
  },
  upgradeButton: {
    marginTop: spacing.md,
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
});
