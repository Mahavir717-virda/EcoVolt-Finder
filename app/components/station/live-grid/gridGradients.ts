/**
 * gridGradients.ts
 * Interpolation and theme mapping for the Live Grid Energy Hero.
 * Dynamically computes soft atmospheric colors based on real-time renewable %.
 *
 * 0–15%  → deep navy + subtle amber
 * 15–30% → navy + cyan
 * 30–50% → blue + teal
 * 50–70% → teal + green
 * 70–100% → green + emerald
 */

export interface GridThemeColors {
  gradientTop: string;
  gradientMid: string;
  gradientBottom: string;
  ambientGlow: string;
  accentColor: string;
  accentLight: string;
  borderColor: string;
  pillBg: string;
}

// Convert Hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16);
  const g = parseInt(sanitized.substring(2, 4), 16);
  const b = parseInt(sanitized.substring(4, 6), 16);
  return [r, g, b];
}

// Convert RGB to Hex
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)));
  return (
    '#' +
    clamp(r).toString(16).padStart(2, '0') +
    clamp(g).toString(16).padStart(2, '0') +
    clamp(b).toString(16).padStart(2, '0')
  );
}

// Interpolate between two colors
export function interpolateHex(color1: string, color2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);
  const clampedT = Math.max(0, Math.min(1, t));
  const r = r1 + (r2 - r1) * clampedT;
  const g = g1 + (g2 - g1) * clampedT;
  const b = b1 + (b2 - b1) * clampedT;
  return rgbToHex(r, g, b);
}

// Control Keyframes for smooth continuous gradient morphing
const TIER_STOPS: {
  pct: number;
  theme: GridThemeColors;
}[] = [
  {
    pct: 0,
    theme: {
      gradientTop: '#050D18',
      gradientMid: '#0A1726',
      gradientBottom: '#101F33',
      ambientGlow: '#D97706',
      accentColor: '#F59E0B',
      accentLight: '#FDE68A',
      borderColor: 'rgba(245, 158, 11, 0.25)',
      pillBg: 'rgba(245, 158, 11, 0.15)',
    },
  },
  {
    pct: 20,
    theme: {
      gradientTop: '#061322',
      gradientMid: '#08253A',
      gradientBottom: '#0A344A',
      ambientGlow: '#0284C7',
      accentColor: '#06B6D4',
      accentLight: '#A5F3FC',
      borderColor: 'rgba(6, 182, 212, 0.25)',
      pillBg: 'rgba(6, 182, 212, 0.15)',
    },
  },
  {
    pct: 40,
    theme: {
      gradientTop: '#051926',
      gradientMid: '#063B45',
      gradientBottom: '#0B525B',
      ambientGlow: '#0D9488',
      accentColor: '#14B8A6',
      accentLight: '#99F6E4',
      borderColor: 'rgba(20, 184, 166, 0.28)',
      pillBg: 'rgba(20, 184, 166, 0.15)',
    },
  },
  {
    pct: 60,
    theme: {
      gradientTop: '#041E20',
      gradientMid: '#06423E',
      gradientBottom: '#0B6B5A',
      ambientGlow: '#059669',
      accentColor: '#10B981',
      accentLight: '#A7F3D0',
      borderColor: 'rgba(16, 185, 129, 0.3)',
      pillBg: 'rgba(16, 185, 129, 0.16)',
    },
  },
  {
    pct: 85,
    theme: {
      gradientTop: '#031E18',
      gradientMid: '#054D3B',
      gradientBottom: '#077652',
      ambientGlow: '#047857',
      accentColor: '#10B981',
      accentLight: '#6EE7B7',
      borderColor: 'rgba(52, 211, 153, 0.35)',
      pillBg: 'rgba(16, 185, 129, 0.2)',
    },
  },
];

/**
 * Get interpolated theme colors for any renewable percentage 0-100%
 */
export function getInterpolatedGridTheme(renewablePct: number): GridThemeColors {
  const pct = Math.max(0, Math.min(100, renewablePct));

  // Find bounding stops
  let lower = TIER_STOPS[0];
  let upper = TIER_STOPS[TIER_STOPS.length - 1];

  for (let i = 0; i < TIER_STOPS.length - 1; i++) {
    if (pct >= TIER_STOPS[i].pct && pct <= TIER_STOPS[i + 1].pct) {
      lower = TIER_STOPS[i];
      upper = TIER_STOPS[i + 1];
      break;
    }
  }

  const range = upper.pct - lower.pct;
  const t = range === 0 ? 0 : (pct - lower.pct) / range;

  return {
    gradientTop: interpolateHex(lower.theme.gradientTop, upper.theme.gradientTop, t),
    gradientMid: interpolateHex(lower.theme.gradientMid, upper.theme.gradientMid, t),
    gradientBottom: interpolateHex(lower.theme.gradientBottom, upper.theme.gradientBottom, t),
    ambientGlow: interpolateHex(lower.theme.ambientGlow, upper.theme.ambientGlow, t),
    accentColor: interpolateHex(lower.theme.accentColor, upper.theme.accentColor, t),
    accentLight: interpolateHex(lower.theme.accentLight, upper.theme.accentLight, t),
    borderColor: lower.theme.borderColor,
    pillBg: lower.theme.pillBg,
  };
}
