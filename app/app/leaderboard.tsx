/**
 * EcoVolt Green Score & Live Leaderboard Screen
 * Full dynamic gamification suite: dynamic Green Scores, consecutive green streaks,
 * achievement badges with progress, live driver rankings, and 1-tap shareable cards.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { spacing } from '@/styles/spacing';
import {
  getLeaderboard,
  getGamificationProfile,
  shareGreenImpact,
} from '@/services/gamification.service';
import {
  Badge,
  GamificationProfile,
  LeaderboardEntry,
  LeaderboardResponse,
} from '@contracts/types';

const { width } = Dimensions.get('window');

export default function LeaderboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'badges'>('leaderboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardResponse | null>(null);
  const [profileData, setProfileData] = useState<GamificationProfile | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [lb, prof] = await Promise.all([
        getLeaderboard().catch(() => null),
        getGamificationProfile().catch(() => null),
      ]);
      if (lb) setLeaderboardData(lb);
      if (prof) setProfileData(prof);
    } catch (err) {
      console.error('Error fetching gamification data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Live refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleShare = () => {
    if (profileData) {
      shareGreenImpact(profileData);
    }
  };

  const topThree = useMemo(() => {
    if (!leaderboardData?.leaderboard) return [];
    return leaderboardData.leaderboard.slice(0, 3);
  }, [leaderboardData]);

  const restList = useMemo(() => {
    if (!leaderboardData?.leaderboard) return [];
    return leaderboardData.leaderboard.slice(3);
  }, [leaderboardData]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.loadingText}>Loading Green Leaderboard...</Text>
      </SafeAreaView>
    );
  }

  const userRank = profileData?.rank || leaderboardData?.currentUserRank?.rank || 1;
  const totalUsers = profileData?.totalUsers || leaderboardData?.currentUserRank?.totalUsers || (leaderboardData?.leaderboard?.length || 1);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Green Impact & Rank</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />
        }
      >
        {/* Hero User Standing Card */}
        {profileData && (
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={[styles.tierPill, { backgroundColor: profileData.tierColor + '20' }]}>
                <Ionicons name="shield-checkmark" size={14} color={profileData.tierColor} />
                <Text style={[styles.tierPillText, { color: profileData.tierColor }]}>
                  {profileData.tier}
                </Text>
              </View>
              <View style={styles.rankBadgeContainer}>
                <Text style={styles.rankBadgeLabel}>RANK</Text>
                <Text style={styles.rankBadgeValue}>#{userRank}</Text>
                <Text style={styles.rankBadgeTotal}>of {totalUsers}</Text>
              </View>
            </View>

            <View style={styles.scoreRow}>
              <View>
                <Text style={styles.scoreNumeral}>{profileData.greenScore.toLocaleString()}</Text>
                <Text style={styles.scoreUnit}>GREEN POINTS</Text>
              </View>
              <View style={styles.streakBubble}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <View>
                  <Text style={styles.streakCount}>{profileData.currentStreak} Streak</Text>
                  <Text style={styles.streakBonus}>+{profileData.streakBonusPct}% Bonus</Text>
                </View>
              </View>
            </View>

            {/* Next Tier or Next Rank Gap Info */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {leaderboardData?.currentUserRank?.pointsToNextRank
                    ? `Gap to #${userRank - 1} (${leaderboardData.currentUserRank.nextRankUser}): ${leaderboardData.currentUserRank.pointsToNextRank} pts`
                    : '🥇 You are leading the Green Board!'}
                </Text>
                <Text style={styles.progressPct}>
                  {profileData.pointsToNextTier === 0 ? 'MAX TIER' : `${profileData.pointsToNextTier} pts to next tier`}
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: profileData.pointsToNextTier === 0
                        ? '100%'
                        : `${Math.min(100, Math.round((profileData.greenScore / (profileData.greenScore + profileData.pointsToNextTier)) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Tab Switcher */}
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'leaderboard' && styles.tabButtonActive]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <Ionicons
              name="trophy"
              size={16}
              color={activeTab === 'leaderboard' ? colors.white : colors.neutral[600]}
            />
            <Text
              style={[styles.tabButtonText, activeTab === 'leaderboard' && styles.tabButtonTextActive]}
            >
              Leaderboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'badges' && styles.tabButtonActive]}
            onPress={() => setActiveTab('badges')}
          >
            <Ionicons
              name="ribbon"
              size={16}
              color={activeTab === 'badges' ? colors.white : colors.neutral[600]}
            />
            <Text
              style={[styles.tabButtonText, activeTab === 'badges' && styles.tabButtonTextActive]}
            >
              Badges & Impact ({profileData?.badges.filter((b) => b.unlocked).length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'leaderboard' ? (
          <>
            {/* Top Podium */}
            {topThree.length > 0 && (
              <View style={styles.podiumContainer}>
                {/* 2nd Place (Silver) */}
                {topThree.length >= 2 ? (
                  <View style={[styles.podiumCol, styles.podiumColSilver]}>
                    <View style={styles.podiumAvatarWrap}>
                      <View style={[styles.podiumAvatar, styles.avatarSilver]}>
                        <Text style={styles.podiumAvatarText}>{topThree[1].avatarInitial}</Text>
                      </View>
                      <View style={[styles.podiumBadge, { backgroundColor: '#94A3B8' }]}>
                        <Text style={styles.podiumBadgeText}>2</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {topThree[1].isCurrentUser ? 'You' : topThree[1].name.split(' ')[0]}
                    </Text>
                    <Text style={styles.podiumScore}>{topThree[1].greenScore} pts</Text>
                    <View style={[styles.podiumPedestal, styles.pedestalSilver]}>
                      <Text style={styles.podiumPedestalText}>🥈 2nd</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.podiumCol, { opacity: 0 }]} />
                )}

                {/* 1st Place (Gold) */}
                {topThree.length >= 1 && (
                  <View style={[styles.podiumCol, styles.podiumColGold]}>
                    <Text style={styles.crownEmoji}>👑</Text>
                    <View style={styles.podiumAvatarWrap}>
                      <View style={[styles.podiumAvatar, styles.avatarGold]}>
                        <Text style={styles.podiumAvatarText}>{topThree[0].avatarInitial}</Text>
                      </View>
                      <View style={[styles.podiumBadge, { backgroundColor: '#F59E0B' }]}>
                        <Text style={styles.podiumBadgeText}>1</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {topThree[0].isCurrentUser ? 'You' : topThree[0].name.split(' ')[0]}
                    </Text>
                    <Text style={[styles.podiumScore, { color: '#F59E0B', fontWeight: '800' }]}>
                      {topThree[0].greenScore} pts
                    </Text>
                    <View style={[styles.podiumPedestal, styles.pedestalGold]}>
                      <Text style={styles.podiumPedestalText}>🥇 1st</Text>
                    </View>
                  </View>
                )}

                {/* 3rd Place (Bronze) */}
                {topThree.length >= 3 ? (
                  <View style={[styles.podiumCol, styles.podiumColBronze]}>
                    <View style={styles.podiumAvatarWrap}>
                      <View style={[styles.podiumAvatar, styles.avatarBronze]}>
                        <Text style={styles.podiumAvatarText}>{topThree[2].avatarInitial}</Text>
                      </View>
                      <View style={[styles.podiumBadge, { backgroundColor: '#D97706' }]}>
                        <Text style={styles.podiumBadgeText}>3</Text>
                      </View>
                    </View>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {topThree[2].isCurrentUser ? 'You' : topThree[2].name.split(' ')[0]}
                    </Text>
                    <Text style={styles.podiumScore}>{topThree[2].greenScore} pts</Text>
                    <View style={[styles.podiumPedestal, styles.pedestalBronze]}>
                      <Text style={styles.podiumPedestalText}>🥉 3rd</Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.podiumCol, { opacity: 0 }]} />
                )}
              </View>
            )}

            {/* Remaining Ranks List */}
            <View style={styles.rankingsListCard}>
              <Text style={styles.sectionHeaderTitle}>All Eco-Drivers</Text>
              {leaderboardData?.leaderboard.map((entry) => {
                const isYou = entry.isCurrentUser;
                return (
                  <View
                    key={entry.userId}
                    style={[styles.rankingRow, isYou && styles.rankingRowActive]}
                  >
                    <View style={styles.rankNumberCol}>
                      <Text style={[styles.rankNumberText, isYou && styles.rankNumberTextActive]}>
                        #{entry.rank}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.driverAvatarSmall,
                        { backgroundColor: isYou ? colors.primary[500] : colors.neutral[300] },
                      ]}
                    >
                      <Text style={styles.driverAvatarSmallText}>{entry.avatarInitial}</Text>
                    </View>

                    <View style={styles.driverInfoCol}>
                      <View style={styles.driverNameRow}>
                        <Text style={[styles.driverNameText, isYou && styles.driverNameTextActive]}>
                          {entry.name} {isYou ? '(You)' : ''}
                        </Text>
                        {entry.greenStreak > 0 && (
                          <View style={styles.rowStreakTag}>
                            <Text style={styles.rowStreakText}>🔥 {entry.greenStreak}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.driverSubText}>
                        {entry.co2AvoidedKg} kg CO₂ saved • {entry.cleanKwh} clean kWh
                      </Text>
                    </View>

                    <View style={styles.driverScoreCol}>
                      <Text style={[styles.driverScoreText, isYou && styles.driverScoreTextActive]}>
                        {entry.greenScore.toLocaleString()}
                      </Text>
                      <Text style={styles.driverScoreLabel}>pts</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* Environmental Impact Equivalencies */}
            {profileData && (
              <View style={styles.equivalentsCard}>
                <Text style={styles.sectionHeaderTitle}>Real-World Impact</Text>
                <Text style={styles.sectionSubTitle}>
                  Your smart charging converted to physical environmental gains
                </Text>

                <View style={styles.equivRow}>
                  <View style={styles.equivIconBox}>
                    <Text style={styles.equivEmoji}>🌲</Text>
                  </View>
                  <View style={styles.equivTextBox}>
                    <Text style={styles.equivValue}>
                      {profileData.treesEquivalent} Mature Trees
                    </Text>
                    <Text style={styles.equivDesc}>
                      Annual CO₂ absorption equivalent avoided from fossil power grids
                    </Text>
                  </View>
                </View>

                <View style={styles.equivDivider} />

                <View style={styles.equivRow}>
                  <View style={styles.equivIconBox}>
                    <Text style={styles.equivEmoji}>⚡</Text>
                  </View>
                  <View style={styles.equivTextBox}>
                    <Text style={styles.equivValue}>
                      {profileData.cleanKmDriven.toLocaleString()} km Clean Driving
                    </Text>
                    <Text style={styles.equivDesc}>
                      Driven completely powered by zero-emission renewable electricity
                    </Text>
                  </View>
                </View>

                <View style={styles.equivDivider} />

                <View style={styles.equivRow}>
                  <View style={styles.equivIconBox}>
                    <Text style={styles.equivEmoji}>💡</Text>
                  </View>
                  <View style={styles.equivTextBox}>
                    <Text style={styles.equivValue}>
                      {profileData.ledHoursPowered.toLocaleString()} Hours
                    </Text>
                    <Text style={styles.equivDesc}>
                      Of clean energy powered LED residential lighting
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Achievement Badges Grid */}
            <View style={styles.badgesSection}>
              <Text style={styles.sectionHeaderTitle}>Achievement Badges</Text>
              <Text style={styles.sectionSubTitle}>
                Earn badges by charging during solar hours, keeping streaks, and saving carbon
              </Text>

              <View style={styles.badgesGrid}>
                {profileData?.badges.map((badge: Badge) => (
                  <View
                    key={badge.id}
                    style={[styles.badgeCard, badge.unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked]}
                  >
                    <View style={styles.badgeTopRow}>
                      <View
                        style={[
                          styles.badgeIconCircle,
                          badge.unlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked,
                        ]}
                      >
                        <Ionicons
                          name={badge.icon as any}
                          size={22}
                          color={badge.unlocked ? '#059669' : colors.neutral[400]}
                        />
                      </View>
                      {badge.unlocked ? (
                        <View style={styles.unlockedTag}>
                          <Text style={styles.unlockedTagText}>UNLOCKED</Text>
                        </View>
                      ) : (
                        <View style={styles.lockedTag}>
                          <Text style={styles.lockedTagText}>{badge.progress}%</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.badgeTitle}>{badge.title}</Text>
                    <Text style={styles.badgeDescription}>{badge.description}</Text>

                    {!badge.unlocked && (
                      <View style={styles.badgeProgressTrack}>
                        <View
                          style={[styles.badgeProgressFill, { width: `${badge.progress}%` }]}
                        />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Share CTA Button */}
        <TouchableOpacity style={styles.shareCtaButton} onPress={handleShare}>
          <Ionicons name="sparkles" size={18} color={colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.shareCtaButtonText}>Share My Green Impact Card</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[600],
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  shareButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tierPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  rankBadgeLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '600',
  },
  rankBadgeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary[600],
  },
  rankBadgeTotal: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreNumeral: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.neutral[900],
    letterSpacing: -1,
  },
  scoreUnit: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral[500],
    letterSpacing: 0.8,
  },
  streakBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  streakEmoji: {
    fontSize: 22,
  },
  streakCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  streakBonus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary[600],
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 4,
  },

  // Tab Switcher
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    padding: 4,
    borderRadius: 12,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.neutral[900],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  tabButtonTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  // Podium
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 20,
    paddingTop: 16,
  },
  podiumCol: {
    alignItems: 'center',
    width: (width - 48) / 3,
  },
  podiumColGold: {
    zIndex: 2,
  },
  podiumColSilver: {
    zIndex: 1,
  },
  podiumColBronze: {
    zIndex: 1,
  },
  crownEmoji: {
    fontSize: 20,
    marginBottom: -4,
  },
  podiumAvatarWrap: {
    position: 'relative',
    marginBottom: 6,
  },
  podiumAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  avatarGold: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  avatarSilver: {
    backgroundColor: '#F1F5F9',
    borderColor: '#94A3B8',
  },
  avatarBronze: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
  },
  podiumAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.neutral[800],
  },
  podiumBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[600],
    marginBottom: 6,
  },
  podiumPedestal: {
    width: '92%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  pedestalGold: {
    height: 68,
    backgroundColor: '#FDE68A',
  },
  pedestalSilver: {
    height: 52,
    backgroundColor: '#E2E8F0',
  },
  pedestalBronze: {
    height: 40,
    backgroundColor: '#FED7AA',
  },
  podiumPedestalText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[800],
  },

  // Rankings List Card
  rankingsListCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  sectionSubTitle: {
    fontSize: 13,
    color: colors.neutral[500],
    marginTop: -8,
    marginBottom: 14,
    lineHeight: 18,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rankingRowActive: {
    backgroundColor: '#ECFDF5',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rankNumberCol: {
    width: 32,
  },
  rankNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[500],
  },
  rankNumberTextActive: {
    color: colors.primary[700],
    fontWeight: '800',
  },
  driverAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  driverAvatarSmallText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  driverInfoCol: {
    flex: 1,
  },
  driverNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  driverNameTextActive: {
    color: '#065F46',
  },
  rowStreakTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  rowStreakText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  driverSubText: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2,
  },
  driverScoreCol: {
    alignItems: 'flex-end',
  },
  driverScoreText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  driverScoreTextActive: {
    color: colors.primary[700],
  },
  driverScoreLabel: {
    fontSize: 10,
    color: colors.neutral[400],
  },

  // Environmental Equivalents
  equivalentsCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  equivRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  equivIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  equivEmoji: {
    fontSize: 22,
  },
  equivTextBox: {
    flex: 1,
  },
  equivValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  equivDesc: {
    fontSize: 12,
    color: colors.neutral[500],
    lineHeight: 16,
  },
  equivDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },

  // Badges
  badgesSection: {
    marginBottom: 20,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: (width - 44) / 2,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  badgeCardUnlocked: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FAFCFA',
  },
  badgeCardLocked: {
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  badgeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconUnlocked: {
    backgroundColor: '#D1FAE5',
  },
  badgeIconLocked: {
    backgroundColor: '#F1F5F9',
  },
  unlockedTag: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unlockedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
  },
  lockedTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral[600],
  },
  badgeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 11,
    color: colors.neutral[500],
    lineHeight: 15,
    marginBottom: 8,
  },
  badgeProgressTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: colors.primary[500],
  },

  // Share CTA
  shareCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  shareCtaButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
