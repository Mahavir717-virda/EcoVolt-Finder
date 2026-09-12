/**
 * Plan configurations for Free vs Premium access
 */

import { PlanType } from '@/types/database.types';

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string | number;
}

export interface PlanConfig {
  name: string;
  type: PlanType;
  monthlyPrice: number;
  yearlyPrice: number;
  features: PlanFeature[];
  maxActiveReservations: number;
  description: string;
}

export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    name: 'Free',
    type: 'free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxActiveReservations: 5,
    features: [
      { name: 'View charging stations', included: true },
      { name: 'Real-time availability', included: true },
      { name: 'Basic price comparison', included: true },
      { name: 'Reserve chargers', included: false },
      { name: 'Priority alerts', included: false },
      { name: 'Ad-free experience', included: false },
    ],
    description: 'Basic access to find charging stations',
  },
  premium: {
    name: 'Premium',
    type: 'premium',
    monthlyPrice: 199, // ₹199/month
    yearlyPrice: 1999, // ₹1999/year (save ₹389)
    maxActiveReservations: 5,
    features: [
      { name: 'View charging stations', included: true },
      { name: 'Real-time availability', included: true },
      { name: 'Full price comparison', included: true },
      { name: 'Reserve chargers', included: true, limit: 'unlimited' },
      { name: 'Priority alerts', included: true },
      { name: 'Ad-free experience', included: true },
    ],
    description: 'Full access with reservations and alerts',
  },
};

// Premium feature list for upgrade prompts
export const PREMIUM_FEATURES = [
  {
    icon: 'calendar-check',
    title: 'Reserve Charging Slots',
    description: 'Book up to 5 active reservations at any time',
  },
  {
    icon: 'bell',
    title: 'Smart Alerts',
    description: 'Get notified when your reserved slot is ready',
  },
  {
    icon: 'compare',
    title: 'Full Price Comparison',
    description: 'Compare all pricing options across stations',
  },
  {
    icon: 'headset',
    title: 'Priority Support',
    description: 'Get help faster with dedicated support',
  },
  {
    icon: 'ad-off',
    title: 'Ad-Free Experience',
    description: 'Enjoy the app without interruptions',
  },
];

export function canAccessReservations(isPremium: boolean): boolean {
  return true;
}

// Get max reservations for plan
export function getMaxReservations(planType: PlanType): number {
  return PLANS[planType].maxActiveReservations;
}

// Check if user has reached reservation limit
export function hasReachedReservationLimit(
  planType: PlanType,
  currentReservations: number
): boolean {
  const maxReservations = getMaxReservations(planType);
  return currentReservations >= maxReservations;
}

// Get remaining reservation slots
export function getRemainingReservationSlots(
  planType: PlanType,
  activeReservations: number
): number {
  const maxSlots = PLANS[planType].maxActiveReservations;
  return Math.max(0, maxSlots - activeReservations);
}
