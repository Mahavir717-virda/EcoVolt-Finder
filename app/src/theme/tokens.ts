// ecoVolt-finder — Reference-Matched Design Tokens (M1-C2-REVISED)
// Single disciplined green + neutral system derived from real charging-app references.
// Replaces the old "Living Grid" emerald + teal palette.

// ---------------------------------------------------------------------------
// COLORS
// ---------------------------------------------------------------------------
export const colors = {
  // Canvas & Surfaces
  canvas: '#F7F8F6',         // app background — very light warm-gray
  surface: '#FFFFFF',         // cards, sheets, inputs on cards
  surfaceSunken: '#F5F6F5',   // input fields, dropdowns, wells
  border: '#ECEEEC',          // card borders, dividers, list separators

  // Ink (Text)
  ink: '#14181A',             // headings, primary values
  ink2: '#6B7280',            // secondary text, subtitles, addresses
  ink3: '#9CA3AF',            // placeholders, tertiary labels

  // Brand — Single Green
  brand: '#1C9B4A',           // primary buttons, selected radio, active tab, links
  brandPress: '#14803A',      // button pressed state, ticket header band, bold green values
  brandTint: '#E7F7EC',       // "Available" badge bg, "Add New Card" pill, selected date bg

  // Semantic
  warningAmber: '#F5A623',    // lightning-bolt icon only (charging energy accent)
  danger: '#E14B4B',          // cancel / error states

  // Greenness semantic aliases (reuse brand palette — 3-band, not 6-stop)
  greennessHigh: '#1C9B4A',   // = brand
  greennessMid: '#F5A623',    // = warningAmber
  greennessLow: '#E14B4B',    // = danger

  // ---------------------------------------------------------------------------
  // BACKWARD-COMPAT ALIASES — these keep existing screen files compiling
  // during the visual-only pass. They map old token names to the nearest
  // new equivalent so no TypeScript errors break the build.
  // ---------------------------------------------------------------------------
  line: '#ECEEEC',            // → border (was '#DCE5DD')
  warning: '#F5A623',         // → warningAmber
  success: '#1C9B4A',         // → brand
  info: '#1C9B4A',            // → brand (old volt teal not in new system)
  volt: '#1C9B4A',            // → brand (teal removed)
  voltTint: '#E7F7EC',        // → brandTint
  grid900: '#14181A',         // → ink
  grid800: '#1F2937',         // → near ink
} as const;

// ---------------------------------------------------------------------------
// GREENNESS UTILITIES (3-band, simplified from old 6-stop scale)
// ---------------------------------------------------------------------------
export type GreennessBand = 'high' | 'mid' | 'low';

/**
 * Maps renewable percentage (0..100) to the 3-band greenness hex color.
 */
export function greennessColor(pct: number): string {
  if (pct >= 60) return colors.greennessHigh;
  if (pct >= 30) return colors.greennessMid;
  return colors.greennessLow;
}

/**
 * Maps renewable percentage (0..100) to GreennessBand.
 */
export function greennessBand(pct: number): GreennessBand {
  if (pct >= 60) return 'high';
  if (pct >= 30) return 'mid';
  return 'low';
}

/**
 * Human-readable greenness label.
 */
export function greennessBandLabel(pct: number): string {
  if (pct >= 60) return 'High renewable';
  if (pct >= 30) return 'Moderate renewable';
  return 'Low renewable';
}

/**
 * BACKWARD-COMPAT: old 6-stop greennessScale object.
 * Maps to the new 3-band system so existing code still compiles.
 */
export const greennessScale = {
  veryHigh: colors.greennessHigh,
  high: colors.greennessHigh,
  medium: colors.greennessMid,
  moderate: colors.greennessMid,
  low: colors.greennessLow,
  veryLow: colors.greennessLow,
} as const;

// ---------------------------------------------------------------------------
// TYPOGRAPHY — Single family: Manrope (Inter fallback not installed)
// ---------------------------------------------------------------------------
export const typography = {
  // Screen Title — "Select Vehicle", "Payment Method"
  screenTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700' as const,
  },
  // Section Label — "Nearby You", "Select Date"
  sectionLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700' as const,
  },
  // Card Title — station name, vehicle name
  cardTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  // Body — addresses, descriptions
  body: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  // Caption / Secondary — gray subtitles, "Max.power"
  caption: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  // Micro — stat labels, "Time Left", "Range"
  micro: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
  // Big Numeral — kWh readout, hero stats (tabular-nums via Text prop)
  bigNumeral: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700' as const,
  },
  // Price — $ amounts, always brand or ink color
  price: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700' as const,
  },

  // ---------------------------------------------------------------------------
  // BACKWARD-COMPAT ALIASES — map old variant names to nearest new style
  // These keep existing screen files compiling during the visual-only pass.
  // ---------------------------------------------------------------------------
  display: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700' as const,
  },
  h1: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700' as const,
  },
  h2: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  title: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
  },
  bodyMedium: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
  },
};

// ---------------------------------------------------------------------------
// SPACING — 4-base scale
// ---------------------------------------------------------------------------
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,  // backward-compat alias
} as const;

// ---------------------------------------------------------------------------
// RADII
// ---------------------------------------------------------------------------
export const radii = {
  card: 16,         // cards, sheets
  button: 14,       // full-width buttons (rectangular-rounded, NOT pill)
  pill: 999,        // badges, chips, tab-like pills
  input: 12,        // input fields
  thumbnail: 12,    // station/vehicle images — rounded square
  iconButton: 12,   // dark square map-toggle button
  // Backward-compat aliases
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
} as const;

// ---------------------------------------------------------------------------
// SHADOWS — ONE level for cards, ONE for sheets. No shadow on buttons.
// ---------------------------------------------------------------------------
export const shadows = {
  card: {
    shadowColor: 'rgba(20,24,20,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  sheet: {
    shadowColor: 'rgba(20,24,20,1)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  // Backward-compat aliases
  e0: {
    borderWidth: 1,
    borderColor: '#ECEEEC',
  },
  e1: {
    shadowColor: 'rgba(20,24,20,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  e2: {
    shadowColor: 'rgba(20,24,20,1)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;
