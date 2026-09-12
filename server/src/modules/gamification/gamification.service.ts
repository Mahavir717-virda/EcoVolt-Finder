import { prisma } from '../../db/client';
import {
  Badge,
  GamificationProfile,
  GreenTier,
  LeaderboardEntry,
  LeaderboardResponse,
} from '../../../../contracts/types';
import { NotFoundError } from '../../middleware/error-handler';

export class GamificationService {
  /**
   * Determine Tier, color, and points required for next promotion
   */
  public static calculateTier(score: number): {
    tier: GreenTier;
    tierColor: string;
    pointsToNextTier: number;
    nextTier?: GreenTier;
  } {
    if (score < 250) {
      return {
        tier: 'Eco Sprout',
        tierColor: '#10B981', // Emerald
        pointsToNextTier: Math.max(0, 250 - score),
        nextTier: 'Solar Cruiser',
      };
    } else if (score < 600) {
      return {
        tier: 'Solar Cruiser',
        tierColor: '#0EA5E9', // Sky Blue
        pointsToNextTier: Math.max(0, 600 - score),
        nextTier: 'Green Pioneer',
      };
    } else if (score < 1000) {
      return {
        tier: 'Green Pioneer',
        tierColor: '#8B5CF6', // Purple
        pointsToNextTier: Math.max(0, 1000 - score),
        nextTier: 'Net-Zero Champion',
      };
    } else {
      return {
        tier: 'Net-Zero Champion',
        tierColor: '#F59E0B', // Amber Gold
        pointsToNextTier: 0,
      };
    }
  }

  /**
   * Calculate consecutive green charge streaks (sessions with avgRenewablePct >= 70%)
   */
  public static calculateStreak(sessions: Array<{ avgRenewablePct: number | null; endedAt: Date | null; createdAt: Date }>): {
    currentStreak: number;
    longestStreak: number;
    streakBonusPct: number;
  } {
    if (!sessions.length) {
      return { currentStreak: 0, longestStreak: 0, streakBonusPct: 0 };
    }

    // Sort descending by session date
    const sorted = [...sessions].sort((a, b) => {
      const dateA = a.endedAt ? new Date(a.endedAt).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.endedAt ? new Date(b.endedAt).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    let currentStreak = 0;
    let streakActive = true;
    let longestStreak = 0;
    let tempStreak = 0;

    for (const session of sorted) {
      const isGreen = (session.avgRenewablePct || 0) >= 70;
      if (isGreen) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        if (streakActive) {
          currentStreak++;
        }
      } else {
        streakActive = false;
        tempStreak = 0;
      }
    }

    const streakBonusPct = Math.min(25, currentStreak * 5); // 5% bonus per green streak up to 25%

    return { currentStreak, longestStreak, streakBonusPct };
  }

  /**
   * Calculate dynamic Green Score from session history
   */
  public static calculateGreenScore(
    co2AvoidedKg: number,
    cleanKwh: number,
    sessions: Array<{ startedAt: Date | null; avgRenewablePct: number | null }>,
    currentStreak: number
  ): number {
    // 10 pts per kg CO2 avoided
    const co2Points = Math.round(co2AvoidedKg * 10);

    // 2 pts per clean kWh delivered
    const cleanEnergyPoints = Math.round(cleanKwh * 2);

    // 25 pts bonus per charging session conducted during peak solar window (11 AM - 3 PM local time)
    let solarPeakBonus = 0;
    for (const session of sessions) {
      if (session.startedAt) {
        const hour = new Date(session.startedAt).getHours();
        if (hour >= 11 && hour <= 15 && (session.avgRenewablePct || 0) >= 70) {
          solarPeakBonus += 25;
        }
      }
    }

    // 30 pts per active streak count
    const streakBonus = currentStreak * 30;

    return Math.max(0, co2Points + cleanEnergyPoints + solarPeakBonus + streakBonus);
  }

  /**
   * Evaluate unlock states and progress for Gamification Badges
   */
  public static evaluateBadges(
    co2AvoidedKg: number,
    cleanKwh: number,
    sessions: Array<{ startedAt: Date | null; avgRenewablePct: number | null }>,
    currentStreak: number
  ): Badge[] {
    const greenSessions = sessions.filter((s) => (s.avgRenewablePct || 0) >= 70);
    const solarSessions = sessions.filter((s) => {
      if (!s.startedAt) return false;
      const hour = new Date(s.startedAt).getHours();
      return hour >= 11 && hour <= 15 && (s.avgRenewablePct || 0) >= 70;
    });

    const badges: Badge[] = [
      {
        id: 'first_green_charge',
        title: '🌱 First Green Watt',
        description: 'Complete your first charging session with 70%+ renewable energy.',
        icon: 'leaf',
        unlocked: greenSessions.length >= 1,
        progress: Math.min(100, Math.round((greenSessions.length / 1) * 100)),
      },
      {
        id: 'solar_striker',
        title: '☀️ Solar Striker',
        description: 'Charge 3 times during peak solar hours (11:00 AM – 3:00 PM).',
        icon: 'sunny',
        unlocked: solarSessions.length >= 3,
        progress: Math.min(100, Math.round((solarSessions.length / 3) * 100)),
      },
      {
        id: 'streak_master',
        title: '🔥 5-Streak Master',
        description: 'Maintain a 5-session consecutive green charging streak.',
        icon: 'flame',
        unlocked: currentStreak >= 5,
        progress: Math.min(100, Math.round((currentStreak / 5) * 100)),
      },
      {
        id: 'clean_commuter',
        title: '⚡ 500km Clean Commuter',
        description: 'Charge over 85 clean kWh to power 500+ km of zero-emission driving.',
        icon: 'speedometer',
        unlocked: cleanKwh >= 85,
        progress: Math.min(100, Math.round((cleanKwh / 85) * 100)),
      },
      {
        id: 'century_club',
        title: '🏆 Century Club',
        description: 'Avoid 100+ kg of lifetime CO₂ emissions.',
        icon: 'trophy',
        unlocked: co2AvoidedKg >= 100,
        progress: Math.min(100, Math.round((co2AvoidedKg / 100) * 100)),
      },
      {
        id: 'forest_guardian',
        title: '🌳 Forest Guardian',
        description: 'Save 210+ kg CO₂, equivalent to 10 mature trees planted for a full year.',
        icon: 'planet',
        unlocked: co2AvoidedKg >= 210,
        progress: Math.min(100, Math.round((co2AvoidedKg / 210) * 100)),
      },
    ];

    return badges;
  }

  /**
   * GET /impact/leaderboard
   * Dynamic real-time driver leaderboard sorted by greenScore
   */
  public static async getLeaderboard(currentUserId?: string): Promise<LeaderboardResponse> {
    const drivers = await prisma.user.findMany({
      include: {
        sessions: {
          where: {
            status: 'completed',
          },
        },
      },
    });

    const entries: LeaderboardEntry[] = [];

    for (const driver of drivers) {
      const sessions = driver.sessions;
      const co2AvoidedKg = Number(
        sessions.reduce((sum, s) => sum + (s.co2AvoidedKg || 0), 0).toFixed(1)
      );
      const cleanKwh = Number(
        sessions
          .reduce((sum, s) => sum + (s.energyKwh || 0) * ((s.avgRenewablePct || 0) / 100), 0)
          .toFixed(1)
      );

      const { currentStreak } = this.calculateStreak(sessions);
      const greenScore = this.calculateGreenScore(co2AvoidedKg, cleanKwh, sessions, currentStreak);
      const { tier, tierColor } = this.calculateTier(greenScore);

      const avatarInitial = driver.name ? driver.name.charAt(0).toUpperCase() : 'U';

      entries.push({
        rank: 0,
        userId: driver.id,
        name: driver.name,
        avatarInitial,
        tier,
        tierColor,
        greenScore,
        co2AvoidedKg,
        cleanKwh,
        greenStreak: currentStreak,
        isCurrentUser: driver.id === currentUserId,
      });
    }

    // Sort entries descending by greenScore (tiebreaker on co2AvoidedKg)
    entries.sort((a, b) => {
      if (b.greenScore !== a.greenScore) {
        return b.greenScore - a.greenScore;
      }
      return b.co2AvoidedKg - a.co2AvoidedKg;
    });

    // Assign rank numbers
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    // Determine current user rank info
    const currentUserIdx = entries.findIndex((e) => e.userId === currentUserId);
    const userRank = currentUserIdx >= 0 ? currentUserIdx + 1 : 1;
    const nextRankUser = currentUserIdx > 0 ? entries[currentUserIdx - 1].name : undefined;
    const pointsToNextRank =
      currentUserIdx > 0 ? entries[currentUserIdx - 1].greenScore - entries[currentUserIdx].greenScore + 1 : 0;

    return {
      leaderboard: entries,
      currentUserRank: {
        rank: userRank,
        totalUsers: entries.length,
        pointsToNextRank,
        nextRankUser,
      },
    };
  }

  /**
   * GET /impact/gamification/me
   * Comprehensive Gamification Profile for current driver
   */
  public static async getUserGamificationProfile(userId: string): Promise<GamificationProfile> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          where: {
            status: 'completed',
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const sessions = user.sessions;
    const totalSessions = sessions.length;
    const co2AvoidedKg = Number(
      sessions.reduce((sum, s) => sum + (s.co2AvoidedKg || 0), 0).toFixed(1)
    );
    const cleanKwh = Number(
      sessions
        .reduce((sum, s) => sum + (s.energyKwh || 0) * ((s.avgRenewablePct || 0) / 100), 0)
        .toFixed(1)
    );

    const { currentStreak, longestStreak, streakBonusPct } = this.calculateStreak(sessions);
    const greenScore = this.calculateGreenScore(co2AvoidedKg, cleanKwh, sessions, currentStreak);
    const { tier, tierColor, pointsToNextTier, nextTier } = this.calculateTier(greenScore);

    const badges = this.evaluateBadges(co2AvoidedKg, cleanKwh, sessions, currentStreak);

    // Leaderboard placement
    const { currentUserRank } = await this.getLeaderboard(userId);

    // Real world environmental conversions
    const treesEquivalent = co2AvoidedKg > 0 ? Math.max(1, Math.round(co2AvoidedKg / 21)) : 0; // 21 kg CO2/tree/year
    const cleanKmDriven = Math.round(cleanKwh * 5.8); // 5.8 km/kWh standard EV
    const ledHoursPowered = Math.round(cleanKwh * 100);

    // Calculate lifetime green window monetary savings vs standard non-green peak grid rate (₹18.00/kWh)
    const totalSavingsInr = Math.round(
      sessions.reduce((sum, s) => {
        const kwh = s.energyKwh || 0;
        const actualCost = s.cost || 0;
        const standardCost = kwh * 18.0;
        return sum + Math.max(0, standardCost - actualCost);
      }, 0)
    );

    const avatarInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

    const shareableSummary = `⚡ My EcoVolt Green Impact:\n🏆 Score: ${greenScore} pts (${tier})\n🌍 Rank #${currentUserRank.rank} of ${currentUserRank.totalUsers}\n🌱 CO₂ Avoided: ${co2AvoidedKg} kg (${treesEquivalent} trees equivalent)\n🔥 Green Streak: ${currentStreak} charges in a row!\n#EcoVolt #CleanMobility #NetZero`;

    return {
      userId: user.id,
      name: user.name,
      avatarInitial,
      greenScore,
      tier,
      tierColor,
      currentStreak,
      longestStreak,
      streakBonusPct,
      co2AvoidedKg,
      cleanKwh,
      totalSessions,
      treesEquivalent,
      cleanKmDriven,
      ledHoursPowered,
      totalSavingsInr,
      badges,
      rank: currentUserRank.rank,
      totalUsers: currentUserRank.totalUsers,
      pointsToNextTier,
      nextTier,
      shareableSummary,
    };
  }
}
