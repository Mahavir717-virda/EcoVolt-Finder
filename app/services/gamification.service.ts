/**
 * Gamification Service
 * Fetches real-time driver leaderboard, green score, streaks, badges, and shares impact.
 */

import { apiRequest } from './api';
import { GamificationProfile, LeaderboardResponse } from '@contracts/types';
import { Share, Platform } from 'react-native';

/**
 * GET /impact/leaderboard
 * Fetch live competitive leaderboard rankings
 */
export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const data = await apiRequest<LeaderboardResponse>('/impact/leaderboard', {
    method: 'GET',
  });
  return data;
}

/**
 * GET /impact/gamification/me
 * Fetch authenticated driver's gamification profile, score, streak & badge progress
 */
export async function getGamificationProfile(): Promise<GamificationProfile> {
  const data = await apiRequest<GamificationProfile>('/impact/gamification/me', {
    method: 'GET',
  });
  return data;
}

/**
 * Share user's green score and carbon impact card via native share sheet
 */
export async function shareGreenImpact(profile: GamificationProfile): Promise<void> {
  try {
    const message = `⚡ My EcoVolt Green Impact:\n\n` +
      `🏆 Green Score: ${profile.greenScore.toLocaleString()} pts (${profile.tier})\n` +
      `🌍 Rank #${profile.rank} of ${profile.totalUsers} Eco-Drivers\n` +
      `🌱 Lifetime CO₂ Avoided: ${profile.co2AvoidedKg} kg (${profile.treesEquivalent} trees equivalent 🌲)\n` +
      `⚡ Clean Energy Charged: ${profile.cleanKwh} kWh (${profile.cleanKmDriven.toLocaleString()} km zero-emission driving 🚗)\n` +
      `🔥 Active Green Streak: ${profile.currentStreak} consecutive green charges in a row!\n\n` +
      `Smart green EV charging with #EcoVolt #CleanMobility #NetZero`;

    await Share.share({
      title: 'My EcoVolt Green Impact Score',
      message: message,
    });
  } catch (error) {
    console.error('Error sharing green impact:', error);
  }
}
