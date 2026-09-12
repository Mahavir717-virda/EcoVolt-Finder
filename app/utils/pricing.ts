/**
 * Pricing utility functions
 */

import { ChargerType } from '@/types/database.types';

// Default currency - can be changed for different regions
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_LOCALE = 'en-IN';

/**
 * Calculate charging cost
 */
export function calculateChargingCost(
  energyKwh: number,
  pricePerKwh: number
): number {
  return pricePerKwh * energyKwh;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format currency without decimals (for INR)
 */
export function formatCurrencyShort(amount: number, currency: string = DEFAULT_CURRENCY): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format price for display (alias)
 */
export function formatPrice(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return formatCurrency(amount, currency);
}

/**
 * Format price per kWh
 */
export function formatPricePerKwh(price: number, currency: string = DEFAULT_CURRENCY): string {
  return `${formatCurrency(price, currency)}/kWh`;
}

/**
 * Estimate charging cost based on battery capacity and charge percentage
 */
export function estimateChargingCost(
  pricePerKwh: number,
  batteryCapacityKwh: number,
  currentPercent: number,
  targetPercent: number = 100
): number {
  const energyNeeded = batteryCapacityKwh * ((targetPercent - currentPercent) / 100);
  return calculateChargingCost(energyNeeded, pricePerKwh);
}

/**
 * Estimate charging time in minutes
 * Based on charger power and energy needed
 */
export function estimateChargingTime(
  chargerPowerKw: number,
  energyNeededKwh: number,
  efficiency: number = 0.9 // Account for charging efficiency
): number {
  const effectivePower = chargerPowerKw * efficiency;
  return Math.round((energyNeededKwh / effectivePower) * 60);
}

/**
 * Get power rating for charger type
 */
export function getChargerPower(chargerType: ChargerType): number {
  switch (chargerType) {
    case 'level_1':
      return 1.5; // Average Level 1 power
    case 'level_2':
      return 11; // Average Level 2 power
    case 'dc_fast':
      return 50; // Average DC Fast power
    case 'tesla_supercharger':
      return 150; // Average Supercharger power
    default:
      return 11;
  }
}

/**
 * Get price range label
 */
export function getPriceLabel(pricePerKwh: number): {
  label: string;
  color: string;
} {
  if (pricePerKwh <= 0.15) {
    return { label: 'Low', color: '#4CAF50' };
  }
  if (pricePerKwh <= 0.30) {
    return { label: 'Medium', color: '#FF9800' };
  }
  return { label: 'High', color: '#F44336' };
}

/**
 * Sort chargers by price
 */
export function sortByPrice<T extends { price_per_kwh: number }>(
  chargers: T[],
  order: 'asc' | 'desc' = 'asc'
): T[] {
  return [...chargers].sort((a, b) =>
    order === 'asc'
      ? a.price_per_kwh - b.price_per_kwh
      : b.price_per_kwh - a.price_per_kwh
  );
}

/**
 * Get cheapest charger from a list
 */
export function getCheapestCharger<T extends { price_per_kwh: number }>(
  chargers: T[]
): T | null {
  if (chargers.length === 0) return null;
  return chargers.reduce((min, charger) =>
    charger.price_per_kwh < min.price_per_kwh ? charger : min
  );
}

/**
 * Calculate savings compared to average price
 */
export function calculateSavings(
  actualPrice: number,
  averagePrice: number,
  energyKwh: number
): number {
  return (averagePrice - actualPrice) * energyKwh;
}
