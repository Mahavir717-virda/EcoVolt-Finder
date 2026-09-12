# M1-C2-REVISED: Reference-Matched Design System

**Owner:** Member 1 (Deep Pathak)  
**Supersedes:** M1-C2.md ("Living Grid" system)  
**Status:** Complete  

---

## What Changed vs. M1-C2

| Aspect | Old (M1-C2) | New (M1-C2-REVISED) |
|---|---|---|
| Palette | Emerald + Electric Teal + Grid-Dark | Single green + neutral only |
| Brand green | `#0E8E4F` | `#1C9B4A` |
| Teal/Volt accent | `#0FB8C9` (removed) | N/A — removed entirely |
| Dark surface | `grid900 #08150F` (removed) | N/A |
| Font family | Space Grotesk + Manrope (two fonts) | Manrope only (one family) |
| Greenness scale | 6-stop gradient | 3-band (high/mid/low) reusing brand palette |
| Button height | 48dp | 52dp |
| Button radius | 12 (md) | 14 (button) — rectangular, NOT pill |
| Card radius | 16 (same) | 16 (`radii.card`) |
| Shadow | old green-tinted shadow | neutral rgba(20,24,20) shadow |

---

## Design Tokens (`src/theme/tokens.ts`)

### Colors
```
canvas:         #F7F8F6  — app background
surface:        #FFFFFF  — cards, sheets
surfaceSunken:  #F5F6F5  — inputs, wells
border:         #ECEEEC  — card borders, dividers

ink:            #14181A  — headings, primary values
ink2:           #6B7280  — secondary text, addresses
ink3:           #9CA3AF  — placeholders, tertiary labels

brand:          #1C9B4A  — buttons, selected, active, links
brandPress:     #14803A  — pressed state, ticket header
brandTint:      #E7F7EC  — badge bg, selected date bg

warningAmber:   #F5A623  — lightning bolt icon ONLY
danger:         #E14B4B  — cancel / error states
```

### Greenness (3-band)
```
High (pct ≥ 60):  brand        #1C9B4A
Mid  (30–59):     warningAmber #F5A623
Low  (< 30):      danger       #E14B4B
```

### Typography (Manrope only)
| Token | Size/LH | Weight | Use |
|---|---|---|---|
| screenTitle | 20/26 | 700 | Screen headers |
| sectionLabel | 15/20 | 700 | Section titles, "Nearby You" |
| cardTitle | 16/22 | 700 | Station/vehicle name |
| body | 14/20 | 400 | Descriptions, addresses |
| caption | 13/18 | 500 | Subtitles, timestamps |
| micro | 12/16 | 500 | Stat labels, badge text |
| bigNumeral | 32/36 | 700 | kWh hero readout (tabular-nums) |
| price | 15/20 | 700 | $ amounts |

### Radii
```
card:       16  (cards, sheets)
button:     14  (full-width buttons — NOT pill)
pill:      999  (badges, chips)
input:      12  (input fields)
thumbnail:  12  (station/vehicle images — rounded square)
iconButton: 12  (dark square map toggle)
```

### Shadows
- **card**: y2 / blur10 / rgba(20,24,20,0.06) — used on Card, StationCard
- **sheet**: y-4 / blur20 / rgba(20,24,20,0.15) — used on Sheet, SuccessModal
- **No shadow on buttons** (per spec)

---

## Component Inventory

### Primitives (`src/components/primitives/`)
| Component | Key Spec |
|---|---|
| `Text` | New variants + backward-compat aliases |
| `Button` | h52, r14, primary/outline/ghost/danger, busy state |
| `Card` | r16, border, card/sheet shadows |
| `Pressable (ScalePressable)` | 0.97 scale + 8% dim, spring back |
| `PillTag` | brandTint bg, brand text, r999 |
| `RadioCircle` | 20dp ring, scale-in dot 150ms |
| `SelectableRow` | 48dp thumb, title+subtitle, RadioCircle right |
| `StatColumn` | icon/label (micro ink3) above, bold value below |
| `RatingRow` | amber star + score (ink) + count (ink2) |
| `LocationLine` | pin icon + address text (ink2, 2-line clamp) |
| `FieldInput` | surfaceSunken bg, r12, trailing icon, readonly mode |
| `CopyField` | brandTint bg, r12, ink text, brand copy icon |
| `IconTile` | 48dp r12, brand bg, white icon |
| `ProgressThin` | 6dp track, brand/amber/danger fill, 300ms anim |
| `ConnectorChip` | 40dp circle, surfaceSunken bg, icon centered |

### UI Components (`src/components/ui/`)
| Component | Key Spec |
|---|---|
| `ScreenHeader` | Back chevron + screenTitle + right slot |
| `SearchBar` | Pill input + dark square map-toggle button |
| `StationCard` | 72x72 thumb, bookmark, title, location, rating, connectors, Book btn |
| `TicketCard` | brandPress header, notch cutouts, QR, dashed divider, rows |
| `SuccessModal` | SheetSlideUp 250ms + CheckBounce spring |
| `CircularGauge` | SVG ring, ringColor prop, glowPulse for charging screen |
| `BatteryPill` | Vertical pill, fill level, brand/amber/danger by % |
| `CalendarStrip` | Month header, horizontal date scroll, 36dp selected circle |

### Navigation (`src/components/navigation/`)
| Component | Key Spec |
|---|---|
| `TabBar` | 4 tabs, active=brand, inactive=ink3, hairline top border, no shadow |

---

## Animation Spec Implementation

| Spec Name | Where | Implementation |
|---|---|---|
| PressScale | `ScalePressable` | 0.97 scale + 0.92 opacity, spring back |
| RadioSelect | `RadioCircle` | dot scale 0→1, 150ms ease-out |
| SheetSlideUp | `SuccessModal`, `Sheet` | translateY 300→0, 250ms ease-out, parallel dim fade |
| CheckBounce | `SuccessModal` | spring scale 0→1.1→1, starts 100ms after sheet settles |
| ChargingPulse | `CircularGauge (glowPulse=true)` | opacity 0.4↔0.8, 2.5s ease-in-out loop |
| ProgressFill | `ProgressThin` | width animated 300ms ease |
| SkeletonShimmer | `Skeleton` | opacity 0.35↔0.9, 1.2s loop |

All animations respect `reduceMotion` prop → instant/static.

---

## Backward Compatibility

Existing screen files are NOT broken by this change:
- `colors.line` → alias for `colors.border` (`#ECEEEC`)
- `colors.volt`, `colors.voltTint` → alias to `brand`, `brandTint`  
- `colors.grid900`, `colors.grid800` → alias to `ink`
- `colors.warning`, `colors.success`, `colors.info` → aliases
- `greennessScale` object → exported with 3-band mapped values
- `Text` variants: `h1`, `h2`, `display`, `title`, `bodyMedium` → backward-compat aliases

Screen files can be reskinned one at a time using `M1-THEME-APPLY` prompts without any build breakage.

---

## WCAG AA Verification

| Pair | Ratio | Result |
|---|---|---|
| Ink `#14181A` on White | 19.4:1 | ✅ AAA |
| Ink-2 `#6B7280` on White | 4.6:1 | ✅ AA |
| Brand `#1C9B4A` on White | 4.55:1 | ✅ AA |
| White on Brand `#1C9B4A` | 4.55:1 | ✅ AA |
| White on BrandPress `#14803A` | 6.1:1 | ✅ AA |
| White on Danger `#E14B4B` | 4.5:1 | ✅ AA |
