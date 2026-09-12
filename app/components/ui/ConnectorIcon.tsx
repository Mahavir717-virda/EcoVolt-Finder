/**
 * ConnectorIcon — Physically accurate, standard SVG representations of EV connectors.
 *
 * Each SVG is drawn from IEC 62196 / SAE J1772 / CHAdeMO spec diagrams:
 *   J1772  (SAE J1772 / Type 1): D-shaped, 5 pins
 *   Type2  (IEC 62196-2 Mennekes): Round + flat bottom, 7 pins
 *   CCS2   (IEC 62196-3 Combo 2): Type 2 AC top + 2 DC pins below
 *   CHAdeMO: Large round, 2 big DC pins + 6 signal pins
 *   Tesla / NACS: Slim oval, 2 rectangular pins
 *
 * All icons share a consistent 32×40 viewport and visual weight so they look
 * uniform when shown side-by-side.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Path, Line, Ellipse, G } from 'react-native-svg';
import type { ChargerType, ConnectorType } from '@/types/database.types';

// ─── Colours per charging level ───────────────────────────────────────────────
export const CHARGER_COLORS: Record<ChargerType, string> = {
  level_1:            '#78909C',
  level_2:            '#22C55E',
  dc_fast:            '#F97316',
  tesla_supercharger: '#EF4444',
};

// ─── SVG Icons (all on 32 × 40 viewport) ──────────────────────────────────────

/**
 * SAE J1772 / IEC 62196-2 Type 1
 * D-shaped housing (flat top, rounded bottom).
 * Pins: 2 large AC (L1, L2) top-left / top-right
 *       1 flat earth bar (centre, below AC)
 *       2 small signal (CP, PP) bottom-left / bottom-right
 */
function J1772({ size, color }: { size: number; color: string }) {
  const s = size / 32;
  return (
    <Svg width={size} height={(size * 40) / 32} viewBox="0 0 32 40">
      {/* Housing — D-shape: flat top arc, rounded bottom */}
      <Path
        d="M6 8 Q6 2 16 2 Q26 2 26 8 L26 28 Q26 36 16 36 Q6 36 6 28 Z"
        fill={color}
        opacity="0.12"
        stroke={color}
        strokeWidth="1.8"
      />
      {/* L1 — top-left large round AC pin */}
      <Circle cx="11" cy="12" r="3.2" fill={color} />
      {/* L2 — top-right large round AC pin */}
      <Circle cx="21" cy="12" r="3.2" fill={color} />
      {/* Earth — flat rectangular bar, centre */}
      <Rect x="11" y="19" width="10" height="3" rx="1.5" fill={color} />
      {/* CP — bottom-left small signal pin */}
      <Circle cx="11" cy="28" r="1.8" fill={color} opacity="0.7" />
      {/* PP — bottom-right small signal pin */}
      <Circle cx="21" cy="28" r="1.8" fill={color} opacity="0.7" />
    </Svg>
  );
}

/**
 * IEC 62196-2 Type 2 (Mennekes)
 * Round housing with distinctive flat bottom edge.
 * Pins: L1, L2, L3 (upper arc, three-phase)
 *       N (neutral, centre-left)
 *       PE (earth, centre-right)
 *       CP, PP (lower arc, signal)
 */
function Type2({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={(size * 40) / 32} viewBox="0 0 32 40">
      {/* Round face with flat bottom chord */}
      <Path
        d="M16 3 A13 13 0 1 1 15.9 3 Z"
        fill={color}
        opacity="0.1"
      />
      <Path
        d="M4.5 19.5 A13 13 0 1 1 27.5 19.5 L4.5 19.5 Z"
        fill={color}
        opacity="0.12"
        stroke={color}
        strokeWidth="1.8"
      />
      {/* Flat bottom line */}
      <Line x1="4.5" y1="19.5" x2="27.5" y2="19.5" stroke={color} strokeWidth="1.8" />
      {/* L1 — upper-left */}
      <Circle cx="9" cy="10" r="2.8" fill={color} />
      {/* L2 — top-centre */}
      <Circle cx="16" cy="7" r="2.8" fill={color} />
      {/* L3 — upper-right */}
      <Circle cx="23" cy="10" r="2.8" fill={color} />
      {/* N — centre-left */}
      <Circle cx="10.5" cy="17" r="2.2" fill={color} />
      {/* PE — centre-right */}
      <Circle cx="21.5" cy="17" r="2.2" fill={color} />
      {/* CP — lower-left (small signal) */}
      <Circle cx="13" cy="22" r="1.5" fill={color} opacity="0.65" />
      {/* PP — lower-right (small signal) */}
      <Circle cx="19" cy="22" r="1.5" fill={color} opacity="0.65" />
    </Svg>
  );
}

/**
 * IEC 62196-3 CCS Combo 2 (most common in EU / India for DC fast)
 * = Type 2 AC section on top + 2 large rectangular DC pins extended below.
 */
function CCS2({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={(size * 40) / 32} viewBox="0 0 32 40">
      {/* ── AC section (shrunken Type 2, top half) ── */}
      <Path
        d="M5 13 A11 11 0 1 1 27 13 L5 13 Z"
        fill={color}
        opacity="0.12"
        stroke={color}
        strokeWidth="1.5"
      />
      <Line x1="5" y1="13" x2="27" y2="13" stroke={color} strokeWidth="1.5" />
      {/* L1 */}
      <Circle cx="9.5" cy="5.5" r="2.2" fill={color} />
      {/* L2 */}
      <Circle cx="16" cy="3" r="2.2" fill={color} />
      {/* L3 */}
      <Circle cx="22.5" cy="5.5" r="2.2" fill={color} />
      {/* N */}
      <Circle cx="11" cy="11" r="1.7" fill={color} />
      {/* PE */}
      <Circle cx="21" cy="11" r="1.7" fill={color} />

      {/* ── Bridge connecting AC to DC section ── */}
      <Rect x="5" y="13" width="22" height="3" rx="0" fill={color} opacity="0.18" />

      {/* ── DC section extended housing ── */}
      <Path
        d="M5 16 L5 33 Q5 38 10 38 L22 38 Q27 38 27 33 L27 16 Z"
        fill={color}
        opacity="0.08"
        stroke={color}
        strokeWidth="1.5"
      />
      {/* DC+ — left large oval pin */}
      <Ellipse cx="11.5" cy="28" rx="4" ry="4.5" fill={color} />
      {/* DC− — right large oval pin */}
      <Ellipse cx="20.5" cy="28" rx="4" ry="4.5" fill={color} />
    </Svg>
  );
}

/**
 * CHAdeMO (Japanese DC fast standard, common on Nissan / Mitsubishi)
 * Large round housing. 2 prominent DC pins (big circles, left + right centre).
 * 4 small signal pins arranged below in a shallow arc.
 * 1 small latch pin at top centre.
 */
function CHAdeMO({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={(size * 40) / 32} viewBox="0 0 32 40">
      {/* Outer housing circle */}
      <Circle cx="16" cy="18" r="14" fill={color} opacity="0.10" stroke={color} strokeWidth="1.8" />
      {/* Inner ring */}
      <Circle cx="16" cy="18" r="10" fill="none" stroke={color} strokeWidth="1" opacity="0.3" />
      {/* DC+ — left large pin */}
      <Circle cx="10" cy="17" r="4.5" fill={color} />
      {/* DC− — right large pin */}
      <Circle cx="22" cy="17" r="4.5" fill={color} />
      {/* Latch lock pin — top centre, small */}
      <Circle cx="16" cy="7" r="1.8" fill={color} opacity="0.7" />
      {/* Signal pin row — bottom arc (4 small) */}
      <Circle cx="10" cy="27" r="1.5" fill={color} opacity="0.6" />
      <Circle cx="14" cy="29.5" r="1.5" fill={color} opacity="0.6" />
      <Circle cx="18" cy="29.5" r="1.5" fill={color} opacity="0.6" />
      <Circle cx="22" cy="27" r="1.5" fill={color} opacity="0.6" />
    </Svg>
  );
}

/**
 * Tesla / NACS (North American Charging Standard)
 * Very slim, tall oval housing. Two thin rectangular contacts (AC + DC combined).
 * No separate ground ring — unified design.
 */
function Tesla({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={(size * 40) / 32} viewBox="0 0 32 40">
      {/* Slim oval housing */}
      <Path
        d="M10 4 Q10 1 16 1 Q22 1 22 4 L22 33 Q22 37 16 37 Q10 37 10 33 Z"
        fill={color}
        opacity="0.12"
        stroke={color}
        strokeWidth="1.8"
      />
      {/* Left contact — tall narrow rectangle */}
      <Rect x="11.5" y="7" width="3.5" height="15" rx="1.75" fill={color} />
      {/* Right contact — tall narrow rectangle */}
      <Rect x="17" y="7" width="3.5" height="15" rx="1.75" fill={color} />
      {/* Bottom ground bar */}
      <Rect x="12" y="26" width="8" height="2.5" rx="1.25" fill={color} opacity="0.7" />
    </Svg>
  );
}

// NACS is identical to Tesla — it IS the Tesla standard now adopted by SAE
const NACS = Tesla;

// ─── Main export ──────────────────────────────────────────────────────────────

interface ConnectorIconProps {
  chargerType: ChargerType;
  connectorType: ConnectorType;
  /** Icon size in px (width). Height is auto-proportioned 4:5. Default 40. */
  size?: number;
  /** Override the level-based colour */
  color?: string;
}

export function ConnectorIcon({
  chargerType,
  connectorType,
  size = 40,
  color,
}: ConnectorIconProps) {
  const c = color ?? CHARGER_COLORS[chargerType] ?? '#78909C';

  switch (connectorType) {
    case 'ccs':      return <CCS2    size={size} color={c} />;
    case 'chademo':  return <CHAdeMO size={size} color={c} />;
    case 'tesla':    return <Tesla   size={size} color={c} />;
    case 'nacs':     return <NACS    size={size} color={c} />;
    case 'type2':    return <Type2   size={size} color={c} />;
    case 'j1772':    return <J1772   size={size} color={c} />;
    default:
      switch (chargerType) {
        case 'tesla_supercharger': return <Tesla  size={size} color={c} />;
        case 'dc_fast':            return <CCS2   size={size} color={c} />;
        case 'level_2':            return <Type2  size={size} color={c} />;
        default:                   return <J1772  size={size} color={c} />;
      }
  }
}
