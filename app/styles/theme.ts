/**
 * Theme configuration combining colors, spacing, and typography
 */

import { colors } from '@/constants/colors';
import { spacing } from './spacing';

export const lightTheme = {
  colors: {
    primary: colors.primary[500],
    primaryLight: colors.primary[100],
    primaryDark: colors.primary[700],

    accent: colors.accent[500],
    accentLight: colors.accent[100],

    background: colors.background.light,
    surface: colors.background.card.light,
    surfaceElevated: colors.background.elevated.light,

    text: colors.text.primary.light,
    textSecondary: colors.text.secondary.light,
    textDisabled: colors.text.disabled.light,

    border: colors.neutral[300],
    divider: colors.neutral[200],

    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,

    // Charger status
    statusAvailable: colors.status.available,
    statusInUse: colors.status.inUse,
    statusReserved: colors.status.reserved,
    statusOffline: colors.status.offline,
  },
  spacing,
  isDark: false,
};

export const darkTheme = {
  colors: {
    primary: colors.primary[400],
    primaryLight: colors.primary[900],
    primaryDark: colors.primary[200],

    accent: colors.accent[400],
    accentLight: colors.accent[900],

    background: colors.background.dark,
    surface: colors.background.card.dark,
    surfaceElevated: colors.background.elevated.dark,

    text: colors.text.primary.dark,
    textSecondary: colors.text.secondary.dark,
    textDisabled: colors.text.disabled.dark,

    border: colors.neutral[700],
    divider: colors.neutral[800],

    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,

    // Charger status
    statusAvailable: colors.status.available,
    statusInUse: colors.status.inUse,
    statusReserved: colors.status.reserved,
    statusOffline: colors.status.offline,
  },
  spacing,
  isDark: true,
};

export type Theme = typeof lightTheme;

// Typography styles
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export type Typography = typeof typography;
