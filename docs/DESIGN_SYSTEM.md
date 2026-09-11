# ecoVolt-finder — "Living Grid" Design System

> **This file is a placeholder.** Member 1 will fill it in fully as part of **M1-C2**.
> The token values and component specs below are the authoritative source — Member 1 implements them exactly.

---

## Palette

### Canvas & Surfaces (light-first app)
| Token | Value | Use |
|---|---|---|
| `--canvas` | `#F3F6F2` | App background (cool off-white, faint green undertone) |
| `--surface` | `#FFFFFF` | Cards, sheets |
| `--surface-sunken` | `#EAF0EA` | Inputs, wells, skeleton base |
| `--line` | `#DCE5DD` | Hairline borders, dividers |

### Ink (Text)
| Token | Value | Use |
|---|---|---|
| `--ink` | `#0C1A13` | Primary text (deep green-black) |
| `--ink-2` | `#4C5C54` | Secondary text |
| `--ink-3` | `#8A998F` | Placeholder / tertiary |

### Brand — Renewable Green
| Token | Value | Use |
|---|---|---|
| `--brand` | `#0E8E4F` | Primary actions, "eco", high-renewable (AA on white) |
| `--brand-press` | `#0A6E3D` | Pressed state |
| `--brand-tint` | `#E3F3E9` | Subtle brand backgrounds |

### Volt — Electric Teal (live / charging / secondary data-viz)
| Token | Value |
|---|---|
| `--volt` | `#0FB8C9` |
| `--volt-tint` | `#DFF5F7` |

### Grid-Dark (active charging screen, live hero panel)
| Token | Value |
|---|---|
| `--grid-900` | `#08150F` |
| `--grid-800` | `#0E2018` |

### Greenness Scale
Maps `renewablePct` → color, 6 stops:

| Range | Band | Color |
|---|---|---|
| ≥ 80 | VERY_HIGH | `#0E8E4F` (deep emerald) |
| 65–79 | HIGH | `#3DAE5F` |
| 50–64 | MEDIUM | `#8FB93B` (yellow-green) |
| 35–49 | — | `#E0A81E` (amber) |
| 20–34 | LOW | `#E2732B` (orange) |
| < 20 | VERY_LOW | `#C8442E` (clay red) |

### Semantic
| Purpose | Color |
|---|---|
| Success | `#0E8E4F` |
| Info / Live | `#0FB8C9` |
| Warning | `#E0A81E` |
| Danger | `#C8442E` |

All text/background pairings must clear **WCAG AA (4.5:1)**.

---

## Typography

Two families only — no monospace, no ALL-CAPS eyebrows.

- **Space Grotesk** (600/700) — display, headings, big data numerals (₹, %, kWh)
- **Manrope** (400/500/600/700) — all body, UI labels, captions

### Type Scale
| Name | Size/Line-height | Family | Weight | Use |
|---|---|---|---|---|
| Display | 34/40 | Space Grotesk | 700 | Hero numbers ("72%", "₹6.8") |
| H1 | 26/32 | Space Grotesk | 600 | |
| H2 | 21/28 | Space Grotesk | 600 | |
| Title | 17/24 | Manrope | 700 | Card titles, screen section titles |
| Body | 15/22 | Manrope | 400/500 | Default text |
| Caption | 13/18 | Manrope | 500 | Supporting text |
| Micro | 11/15 | Manrope | 600 | Chips/status — sentence case, never ALL CAPS |

Numbers use `fontVariant: ['tabular-nums']` so gauges/prices don't jitter.

---

## Spacing, Radius, Elevation

**Spacing (4-base):** 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40

**Radius:** sm 8 · md 12 · lg 16 · xl 22 · pill 999

**Elevation (restrained — NOT the same shadow on everything):**
- `e0 inline`: none (use `--line` border instead)
- `e1 card`: y2, blur 8, `rgba(12,26,19,0.06)`
- `e2 sheet`: y8, blur 24, `rgba(12,26,19,0.12)`

---

## Components (Member 1 implements in M1-C2)

### Primitives
`Text` · `Button` · `Card` · `Sheet` · `Badge/Chip` · `Input` · `SegmentedControl` · `ListRow` · `EmptyState` · `ErrorState` · `OfflineBanner`

### Signature Components
- `GreennessGauge` — radial arc, colored by scale, shows % + band
- `GreennessPin` — map marker colored by scale
- `PriceBreakdown` — base + markup + ToU → final, with "estimate" tag
- `ForecastStrip` — 24h renewable% sparkline, recommended window highlighted
- `TrueCostCard` — charging + travel = true total, vs sticker pick
- `ChargingPulse` — the live moment (volt-teal slow pulse)

### Loading States
| Pattern | Component | When to Use |
|---|---|---|
| Skeleton shimmer | `<Skeleton/>`, `<SkeletonCard/>`, `<SkeletonRow/>` | Data lists & cards while fetching |
| Linear progress | `<LinearProgress/>` | Multi-step compute, session charge progress |
| Circular spinner | `<Spinner/>` | Button busy, pull-to-refresh, app boot |
| Pulse/glow (volt) | `<ChargingPulse/>` | Active charging indicator only |
| Progressive/optimistic | pattern | Map pins as they resolve, stale badge |

All respect `reduceMotion` setting — shimmer/pulse become static.

---

## Copy Rules

- Errors say **what happened and how to fix it** — never a vague apology.
- Empty screens **invite an action** ("No stations in range — widen your search or switch to a 2-wheeler profile").
- Buttons **name the exact action** and keep that name through the flow (button "Book slot" → toast "Slot booked").
- Status badges are **sentence case**, never ALL CAPS.
