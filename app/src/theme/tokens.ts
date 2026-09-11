// ecoVolt-finder — "Living Grid" Design Tokens
// Authoritative definitions for colors, typography, spacing, radii, elevations

export const colors = {
  // Canvas & Surfaces (light-first app)
  canvas: '#F3F6F2',
  surface: '#FFFFFF',
  surfaceSunken: '#EAF0EA',
  line: '#DCE5DD',

  // Ink (Text)
  ink: '#0C1A13',
  ink2: '#4C5C54',
  ink3: '#8A998F',

  // Brand — Renewable Green
  brand: '#0E8E4F',
  brandPress: '#0A6E3D',
  brandTint: '#E3F3E9',

  // Volt — Electric Teal (live / charging / secondary data-viz)
  volt: '#0FB8C9',
  voltTint: '#DFF5F7',

  // Grid-Dark (active charging screen, live hero panel)
  grid900: '#08150F',
  grid800: '#0E2018',

  // Semantic
  success: '#0E8E4F',
  info: '#0FB8C9',
  warning: '#E0A81E',
  danger: '#C8442E',
};

export const greennessScale = {
  veryHigh: '#0E8E4F', // >= 80 (deep emerald)
  high: '#3DAE5F',     // 65-79
  medium: '#8FB93B',   // 50-64 (yellow-green)
  moderate: '#E0A81E', // 35-49 (amber)
  low: '#E2732B',      // 20-34 (orange)
  veryLow: '#C8442E',  // < 20 (clay red)
};

export type GreennessBand = 'very_high' | 'high' | 'medium' | 'moderate' | 'low' | 'very_low';

export function greennessColor(pct: number): string {
  if (pct >= 80) return greennessScale.veryHigh;
  if (pct >= 65) return greennessScale.high;
  if (pct >= 50) return greennessScale.medium;
  if (pct >= 35) return greennessScale.moderate;
  if (pct >= 20) return greennessScale.low;
  return greennessScale.veryLow;
}

export function greennessBand(pct: number): GreennessBand {
  if (pct >= 80) return 'very_high';
  if (pct >= 65) return 'high';
  if (pct >= 50) return 'medium';
  if (pct >= 35) return 'moderate';
  if (pct >= 20) return 'low';
  return 'very_low';
}

export function greennessBandLabel(pct: number): string {
  if (pct >= 80) return 'Very high renewable';
  if (pct >= 65) return 'High renewable';
  if (pct >= 50) return 'Medium renewable';
  if (pct >= 35) return 'Moderate renewable';
  if (pct >= 20) return 'Low renewable';
  return 'Very low renewable';
}

export const typography = {
  display: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 34,
    lineHeight: 40,
  },
  h1: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 26,
    lineHeight: 32,
  },
  h2: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
    fontSize: 21,
    lineHeight: 28,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 17,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
  micro: {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 11,
    lineHeight: 15,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const shadows = {
  e0: {
    borderWidth: 1,
    borderColor: colors.line,
  },
  e1: {
    shadowColor: '#0C1A13',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  e2: {
    shadowColor: '#0C1A13',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
};
