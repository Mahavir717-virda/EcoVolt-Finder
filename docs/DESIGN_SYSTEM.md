# ecoVolt-finder — "Living Grid" Design System

The authoritative specification for typography, color scales, spatial geometry, primitive components, and loading states across the **ecoVolt-finder** application.

---

## 1. Palette

### Canvas & Surfaces (Light-first)
| Token | Value | Use Case |
|---|---|---|
| `--canvas` | `#F3F6F2` | Primary app background (cool crisp off-white, faint green undertone) |
| `--surface` | `#FFFFFF` | Cards, elevated sheets, input overlays |
| `--surface-sunken` | `#EAF0EA` | Wells, text inputs, skeleton placeholders |
| `--line` | `#DCE5DD` | Hairline borders, separators, subtle dividers |

### Ink (Typography)
| Token | Value | Use Case |
|---|---|---|
| `--ink` | `#0C1A13` | Deep green-black primary headings & body text (16.8:1 AAA on surface) |
| `--ink-2` | `#4C5C54` | Secondary text, captions, helper info (6.2:1 AA on canvas) |
| `--ink-3` | `#8A998F` | Placeholder text, disabled labels |

### Brand & Accents
| Token | Value | Use Case |
|---|---|---|
| `--brand` | `#0E8E4F` | Primary actions, "eco", high-renewable badges (4.6:1 AA on white) |
| `--brand-press` | `#0A6E3D` | Active / pressed state |
| `--brand-tint` | `#E3F3E9` | Subtle brand backgrounds & badge pills |
| `--volt` | `#0FB8C9` | Electric teal: active charging moments, live telemetry gauges |
| `--volt-tint` | `#DFF5F7` | Charging telemetry rings & volt badges |
| `--grid-900` | `#08150F` | Dark surface for live charging hero screen & night map display |
| `--grid-800` | `#0E2018` | Dark well background container |

### Greenness Scale (6 Stops)
Maps `renewablePct` $\rightarrow$ color and band:

| Range (%) | Band | Color | Hex Code | Visual Character |
|---|---|---|---|---|
| $\ge 80$ | `very_high` | Emerald | `#0E8E4F` | Peak clean generation |
| $65 - 79$ | `high` | Green | `#3DAE5F` | High renewable window |
| $50 - 64$ | `medium` | Yellow-Green | `#8FB93B` | Balanced grid mix |
| $35 - 49$ | `moderate` | Amber | `#E0A81E` | Moderate carbon intensity |
| $20 - 34$ | `low` | Orange | `#E2732B` | Thermal heavy mix |
| $< 20$ | `very_low` | Clay Red | `#C8442E` | Peak fossil grid state |

### Semantic System
| Purpose | Color | Hex Code |
|---|---|---|
| Success | Green | `#0E8E4F` |
| Info / Live | Electric Teal | `#0FB8C9` |
| Warning | Amber | `#E0A81E` |
| Danger | Clay Red | `#C8442E` |

---

## 2. Typography

Two font families with distinct responsibilities (no generic monospace, no all-caps eyebrows):

1. **Space Grotesk** (`600 SemiBold`, `700 Bold`): Headings, display banners, and big data numerals (`₹`, `%`, `kWh`).
2. **Manrope** (`400 Regular`, `500 Medium`, `600 SemiBold`, `700 Bold`): All UI labels, buttons, inputs, paragraphs, and captions.

### Type Scale (dp)
| Token | Size / Line-Height | Family | Weight | Purpose |
|---|---|---|---|---|
| `display` | 34 / 40 | Space Grotesk | 700 Bold | Big hero numbers ("72%", "₹6.8") |
| `h1` | 26 / 32 | Space Grotesk | 600 SemiBold | Primary screen headers |
| `h2` | 21 / 28 | Space Grotesk | 600 SemiBold | Major section headers |
| `title` | 17 / 24 | Manrope | 700 Bold | Card titles, list headers |
| `body` | 15 / 22 | Manrope | 400 Regular / 500 Medium | Primary readable content |
| `caption` | 13 / 18 | Manrope | 500 Medium | Timestamps, metadata, hints |
| `micro` | 11 / 15 | Manrope | 600 SemiBold | Chips & status badges (sentence case) |

*Note: Numerals use `fontVariant: ['tabular-nums']` across gauges and tariffs to prevent UI jitter.*

---

## 3. Spacing, Radii & Elevation

- **Spacing (4-base grid):** `4 (xs)`, `8 (sm)`, `12 (md)`, `16 (base)`, `20 (lg)`, `24 (xl)`, `32 (xxl)`, `40 (xxxl)`.
- **Radii:** `sm: 8`, `md: 12`, `lg: 16`, `xl: 22`, `pill: 999`.
- **Elevation Hierarchy:**
  - `e0 inline`: `borderWidth: 1`, `borderColor: '#DCE5DD'` (no shadow).
  - `e1 card`: `y: 2`, `blur: 8`, `rgba(12,26,19,0.06)`, `elevation: 2`.
  - `e2 sheet`: `y: 8`, `blur: 24`, `rgba(12,26,19,0.12)`, `elevation: 6`.

---

## 4. UI Components

### Primitives (`app/src/components/primitives/`)
- `Text`: Typography scale with tabular numerals support.
- `Button`: Primary, secondary, ghost, and danger variants with inline `busy` indicator retaining button label text.
- `Card`: Elevation-aware container (`e0`, `e1`, `e2`) with padding presets.
- `Sheet`: Bottom sheet modal with drag handle and safe area inset awareness.
- `Chip` / `Badge`: Sentence-case status pills (`subtle`, `solid`, `outline`).
- `Input`: Text input with active brand focus highlight, error messaging, and helper copy.
- `SegmentedControl`: Pill tab selector for options (e.g. Car / Bike).
- `ListRow`: Reusable item row with icons, title, subtitle, divider, and trailing widgets.
- `EmptyState`: Contextual empty views with clear action invitation.
- `ErrorState`: Diagnoses what happened and provides a concrete fix action.
- `OfflineBanner`: Amber indicator showing cached/stale data status.

### Loading & Telemetry Components (`app/src/components/feedback/`)
- `Skeleton`, `SkeletonCard`, `SkeletonRow`: Shimmer placeholders matching final content layout.
- `LinearProgress`: Determinate mode (battery charging progress) and indeterminate mode (calculating routes/optimizations).
- `Spinner`: Circular activity indicator (`small` inline, `large` centered).
- `ChargingPulse`: Dedicated volt-teal pulsing ring for active charging session telemetry.
- *Motion Control*: All feedback components support `reduceMotion` accessibility toggles.

---

## 5. Copywriting Standards

1. **Errors Diagnose and Guide**: Always state what went wrong and how the user can recover (e.g. *"Price lock expired · Tap to refresh tariff"* instead of *"Something went wrong"*).
2. **Action-Oriented Empty States**: Always tell the user what action opens up more data (e.g. *"No stations in range — widen your search or switch to a 2-wheeler profile"*).
3. **Explicit Action Buttons**: Button labels explicitly match their immediate downstream confirmation (e.g., button `"Book slot"` $\rightarrow$ snackbar `"Slot booked"`).
4. **Sentence Case Badges**: Status badges never use all-caps (`Very high renewable`, not `VERY HIGH`).
