# ecoVolt-finder — Build Playbook & Antigravity Prompt Chunks

> A complete, conflict-free build plan for a 3-person team, delivered as ready-to-paste prompts for an AI coding agent (Antigravity).
> **36 prompt chunks** (12 per member), each written so an agent must *reason in text before coding* and *self-verify before finishing* — the goal is a deterministic, faulty-result-resistant build.

---

## 0. How to use this document

**Who this is for:** three developers building in parallel, plus the AI agent (Antigravity) that writes most of the code.

**The core idea:** you never hand the agent a vague instruction. Each chunk below is a *self-contained prompt*. You paste one chunk at a time into Antigravity, in order, on the correct branch. Every chunk follows the same template:

1. **Meta** — chunk ID, owner, branch name, what it depends on.
2. **Context** — what already exists in the repo and what this chunk adds. (Prevents the agent re-inventing things.)
3. **Think-first (mandatory)** — the agent must first write a short design note (modules, sub-modules, data shapes, edge cases) into a `/docs/notes/…md` file and *stop for your review* before writing feature code. This is the single most important anti-failure mechanism: you catch a wrong mental model in 30 seconds of reading instead of after 300 lines of wrong code.
4. **Build spec** — exact files to create, function signatures, data shapes, and behavior. Dense on purpose.
5. **Edge cases for this chunk** — the specific loopholes this chunk must close.
6. **Integration contract** — the inputs it consumes and outputs it produces, so the other two members are never blocked.
7. **Do NOT touch** — files owned by other members. This is how parallel work stays conflict-free.
8. **Acceptance checks** — how the agent proves it's done before you accept the PR.

**Golden rules for the humans:**

- Paste chunks **in numerical order per member**. Cross-member dependencies are called out explicitly.
- One chunk = one feature branch = one PR. Never let a chunk sprawl.
- If the agent's think-first note is wrong, correct *the note*, not the code. Re-run only after the note is right.
- The `/contracts` folder is sacred. Changes there are reviewed by all three before merge (see §4).

---

## 1. Project overview

**ecoVolt-finder** helps electric-vehicle users charge when and where the grid is greenest and cheapest — and helps charging-network operators price and schedule sessions to match renewable supply.

The invisible property "how green is the grid right now" is turned into something a driver can see and act on, and the app closes the loop with a real incentive to act: **you save money and cut CO₂ by shifting when/where you charge, and the app does the waiting for you.**

**Three user types**

| User | What they get |
|---|---|
| **EV driver** | A live "greenness" score per station, cheaper charging windows, smart-scheduled charging ("plug in now, we charge you 1–4am"), and a *true-cost* station recommendation that accounts for travel distance, vehicle type, and range — not just sticker price. |
| **Station manager** (operator) | Set base price per power provider (Torrent Power, GB/GUVNL, Adani, Tata Power, etc.) plus their own service-provider markup; shift load to cheap/renewable windows to cut procurement cost and dodge demand-charge penalties; a real, data-backed "X% renewable-powered" story. |
| **Grid operator / admin** | Network-wide view of load, renewable share, and demand-charge risk; sees EV charging demand smoothed toward renewable peaks. |

**The value loop we must make visible (this is what wins the judging):**

```
Driver plugs in ──▶ app reads live + forecast grid greenness for the station's zone
        ▲                              │
        │                              ▼
   savings + CO₂          app finds the cheapest & greenest window
   shown back to  ◀──── (and/or a better station once travel cost is
   the driver            subtracted) ──▶ charger executes the delayed/
                         scheduled charge automatically
```

If the driver never has to *decide* to wait — the app + charger handle the delay — the benefit is real, not hypothetical.

---

## 2. Locked technical decisions

| Layer | Choice | Notes |
|---|---|---|
| Mobile app | **React Native + Expo**, tested on **Android Expo Go** | Drives a hard constraint: use `react-native-maps` (works in Expo Go on Android), **not** `expo-maps` (needs a dev build). See §9. |
| API backend | **Node.js + Express + TypeScript + PostgreSQL** | REST, JWT auth, pricing & booking engines. |
| ML / data / maps service | **Python + FastAPI** (separate microservice) | Forecasting, renewable classification, Google routing, travel-cost + recommendation engine. |
| Grid data | **Hybrid**: real API (Electricity Maps / India Energy Atlas) **+ mock/seed fallback** | Demo never breaks if wifi/API dies; real data for credibility. See §9. |
| Maps & routing | **Google Maps Platform** (Maps SDK for Android + Routes/Distance Matrix + Geocoding/Places) | Display client-side; distance/route/matrix calls proxied server-side to hide keys. See §9. |
| Money / units | **INR (₹)**, **kWh**, **km**, timezone **Asia/Kolkata (IST)** | Grid APIs return UTC — always convert. |

**Team split**

- **Member 1 — App / UI (React Native, Expo).** Owns `/app`. All screens, the design system, components, client state, navigation, and map *display*.
- **Member 2 — Backend / API (Node + Express + Postgres).** Owns `/server`. DB schema, auth/RBAC, stations, the **pricing engine**, the **booking/scheduling engine**, sessions, analytics, and the proxy layer to the ML service.
- **Member 3 — ML / Data / Maps (Python + FastAPI).** Owns `/ml`. Grid ingestion, renewable classification, forecasting, cost/greenness estimator, Google routing, the **travel-cost model**, and the **recommendation & smart-charge engine**.

---

## 3. Monorepo architecture (ownership = zero conflicts)

One Git repo, four top-level areas. **Members almost never edit the same files**, because each owns a directory. The only shared area is `/contracts`, which is small and change-controlled.

```
ecovolt-finder/
├── app/                     # MEMBER 1 — Expo React Native app
│   ├── src/
│   │   ├── theme/           # design tokens, typography, color scales
│   │   ├── components/      # UI primitives + loading states (Skeleton/Progress/Spinner)
│   │   ├── screens/         # driver / manager / admin screens
│   │   ├── navigation/
│   │   ├── features/        # feature-scoped hooks + state (vehicles, stations, booking…)
│   │   ├── api/             # generated client + fetch hooks (reads /contracts)
│   │   └── lib/             # utils, formatters (₹, kWh, greenness color)
│   └── app.json / eas.json
│
├── server/                  # MEMBER 2 — Node/Express API
│   ├── src/
│   │   ├── modules/         # auth, users, vehicles, stations, pricing, bookings, sessions, analytics
│   │   ├── db/              # schema, migrations, seed
│   │   ├── middleware/      # auth guards, error handler, rate limit, validation
│   │   ├── integrations/    # ML-service client, google proxy
│   │   └── app.ts / server.ts
│   └── prisma/ (or knex/)
│
├── ml/                      # MEMBER 3 — Python FastAPI service
│   ├── app/
│   │   ├── ingestion/       # electricity maps client, india atlas, mock generator
│   │   ├── classify/        # renewable taxonomy + zone mapping
│   │   ├── forecast/        # feature eng + models + backtests
│   │   ├── pricing/         # ToU + greenness cost estimator
│   │   ├── routing/         # google routes/matrix client
│   │   ├── recommend/       # travel-cost + net-benefit ranking + smart-charge optimizer
│   │   └── main.py
│   └── requirements.txt
│
├── contracts/               # SHARED — change-controlled (all 3 review)
│   ├── openapi.node.yaml    # Member 2's REST surface (source of truth for the app)
│   ├── openapi.ml.yaml      # Member 3's service surface (consumed by Member 2)
│   ├── types.ts             # shared TS types (app + server import these)
│   ├── enums.ts             # roles, connector types, providers, statuses
│   └── examples/            # canned JSON responses used as mocks by Member 1
│
├── docs/
│   ├── notes/               # the agent's "think-first" design notes land here
│   ├── DESIGN_SYSTEM.md
│   └── EDGE_CASES.md
└── README.md
```

**Why this eliminates conflicts:** Member 1 lives in `/app`, Member 2 in `/server`, Member 3 in `/ml`. The moment anyone needs a shape the others depend on, it goes in `/contracts` — and because the app builds against `/contracts/examples/*.json` as mocks, Member 1 is never blocked waiting for Member 2 or 3.

---

## 4. GitHub workflow (parallel, synchronized, low-conflict)

**Branches**

- `main` — always demoable. Protected. Only merges from `develop` at milestones.
- `develop` — integration branch. All PRs target this.
- `m1/<chunk-id>-slug`, `m2/<chunk-id>-slug`, `m3/<chunk-id>-slug` — one branch per chunk.

**Cadence**

1. Pull `develop` before starting any chunk.
2. Paste the chunk prompt into Antigravity → it produces the think-first note, then code.
3. Open a PR to `develop`. PR title = chunk ID (e.g., `M2-C6 pricing engine`).
4. **Contract changes** (`/contracts/*`) require a 👍 from the other two members before merge — this is the only place a conflict can hurt, so it's gated.
5. Integrate into `develop` at least **twice a day** (before lunch, end of day) to avoid drift.

**Conflict avoidance rules baked into every chunk**

- Every chunk lists a **Do NOT touch** section naming files owned by others.
- Shared shapes only ever change in `/contracts`, never duplicated locally.
- No two chunks in flight edit the same file. If a chunk needs to, it's split.

**Commit message convention:** `M<member>-C<chunk>: <imperative summary>` (e.g., `M1-C4: add driver map screen with greenness pins`).

**`.gitignore` essentials (add in M1-C1 / M2-C1 / M3-C1):** `node_modules`, `.expo`, `dist`, `build`, `.env*`, `__pycache__`, `*.pyc`, `.venv`, `*.sqlite`, model artifacts (`*.pkl`, `*.joblib`) except a small committed demo model.

---

## 5. The integration contract (build this FIRST, together)

Before any feature work, the three members co-author `/contracts` in a 30-minute session (or Member 2 drafts and the others review). This is the seam that makes parallel work possible. The app codes against the *examples*; the server implements the *node* spec; the server calls the *ml* spec.

### 5.1 Shared enums (`/contracts/enums.ts`)

```ts
export enum Role { DRIVER = 'driver', MANAGER = 'manager', ADMIN = 'admin' }

export enum ConnectorType {
  CCS2 = 'ccs2', CHADEMO = 'chademo', TYPE2_AC = 'type2_ac',
  BHARAT_DC_001 = 'bharat_dc_001', BHARAT_AC_001 = 'bharat_ac_001', THREE_PIN = 'three_pin',
}

export enum VehicleClass { CAR = 'car', BIKE = 'bike' } // 2-wheeler vs 4-wheeler

export enum PowerProvider {
  TORRENT = 'torrent_power', GUVNL_GB = 'guvnl_gb', ADANI = 'adani_energy',
  TATA = 'tata_power', BSES = 'bses', MSEDCL = 'msedcl', OTHER = 'other',
}

export enum SessionStatus {
  RESERVED='reserved', SCHEDULED='scheduled', ACTIVE='active',
  COMPLETED='completed', CANCELLED='cancelled', EXPIRED='expired', FAILED='failed',
}

export enum GreennessBand { VERY_HIGH='very_high', HIGH='high', MEDIUM='medium', LOW='low', VERY_LOW='very_low' }
export enum DataQuality { LIVE='live', CACHED='cached', FORECAST='forecast', MOCK='mock', STALE='stale' }
```

### 5.2 Core shared types (`/contracts/types.ts`) — abbreviated

```ts
export interface GeoPoint { lat: number; lng: number }

export interface GridSnapshot {
  zoneId: string;               // e.g. "IN" or "IN-WE"
  at: string;                   // ISO8601 UTC
  renewablePct: number;         // 0..100
  carbonFreePct: number;        // renewable + nuclear
  carbonIntensity: number;      // gCO2eq/kWh
  band: GreennessBand;
  breakdown: Record<string, number>; // {solar, wind, hydro, nuclear, coal, gas, biomass, unknown...}
  quality: DataQuality;         // live | cached | forecast | mock | stale
  asOfAgeSec: number;           // how old this reading is
}

export interface ForecastPoint { hourStartLocal: string; renewablePct: number; carbonIntensity: number; confidence: number } // 0..1
export interface PriceQuote {
  stationId: string; connectorType: ConnectorType;
  baseTariff: number;           // provider tariff, ₹/kWh
  providerMarkup: number;       // manager's service-provider markup, ₹/kWh
  touAdjustment: number;        // time-of-use / greenness adjustment, ₹/kWh (can be negative)
  finalPrice: number;           // ₹/kWh, sum of the above
  isEstimate: boolean;          // true when any component is modeled, not published
  currency: 'INR';
  validUntil: string;           // price-lock expiry ISO8601
}

export interface StationSummary {
  id: string; name: string; location: GeoPoint; operatorName: string; provider: PowerProvider;
  connectors: { type: ConnectorType; powerKw: number; available: number; total: number }[];
  greenness: { renewablePct: number; band: GreennessBand; quality: DataQuality };
  priceFrom: number;            // cheapest connector final price ₹/kWh
}

// The recommendation is the "brain" output — the headline edge case lives here.
export interface StationRecommendation {
  station: StationSummary;
  distanceKm: number; travelMinutes: number;
  energyNeededKwh: number;
  chargingCost: number;         // ₹ = finalPrice * energyNeeded
  travelCost: number;           // ₹, from vehicle model
  trueTotalCost: number;        // chargingCost + travelCost   ← what we rank on
  vsCheapestSticker: number;    // ₹ saved/lost vs naive "cheapest ₹/kWh" pick
  reachable: boolean;           // range check given current battery %
  connectorCompatible: boolean;
  recommendedWindow?: { startLocal: string; endLocal: string; renewablePct: number; confidence: number };
  reason: string;               // human explanation, e.g. "₹12 cheaper energy but ₹18 extra travel — net worse than Station B"
}
```

### 5.3 REST surface (Node — `openapi.node.yaml`, summarized)

```
POST   /auth/signup            POST /auth/login          POST /auth/refresh
GET    /me                     PATCH /me
GET    /vehicles  POST /vehicles  PATCH /vehicles/:id  DELETE /vehicles/:id
GET    /stations?lat&lng&radiusKm&connector&class      GET /stations/:id
POST   /stations (manager)     PATCH /stations/:id (manager, owner-only)
POST   /stations/:id/connectors ...
GET    /pricing/quote?stationId&connector&kwh          # calls pricing engine
POST   /bookings               GET /bookings            PATCH /bookings/:id/cancel
POST   /sessions/:id/start     POST /sessions/:id/stop  GET /sessions/:id
GET    /recommendations?originLat&originLng&vehicleId&kwh   # proxies ML recommend
GET    /forecast?zoneId (or ?stationId)                     # proxies ML forecast
GET    /impact/me              GET /analytics/station/:id (manager)  GET /analytics/network (admin)
```

### 5.4 ML service surface (Python — `openapi.ml.yaml`, summarized)

```
GET  /grid/live?zoneId               -> GridSnapshot
GET  /grid/forecast?zoneId&hours=24  -> ForecastPoint[]
POST /classify                        (raw breakdown) -> {renewablePct, carbonFreePct, band}
POST /estimate/windows                (zoneId, tariff)-> per-hour {price, renewablePct, confidence}
POST /route/matrix                    (origin, stationIds[]) -> distances/times
POST /recommend                       (origin, vehicle, kwh, candidateStations[]) -> StationRecommendation[]
POST /smartcharge/plan                (constraints) -> {startLocal, endLocal, expectedRenewablePct}
GET  /health
```

> **Mocking:** Member 3 commits realistic sample responses to `/contracts/examples/` for every ML endpoint on day 1 (even before the models exist), and Member 2 does the same for REST. Member 1 builds entirely against these until the real services are ready. This is what lets all three start at hour zero.

---

## 6. Design system — "Living Grid"

The design brief: an energy + mobility product for Indian EV users, that must feel *credible to judges* and *calm to use*, where the single memorable idea is **greenness made visible**. We spend our boldness on one thing — the greenness gauge and the live-charging moment — and keep everything else quiet and disciplined.

**Deliberately avoided (the common "AI-generated" tells):** warm cream + terracotta palettes; a single bright acid accent on near-black everywhere; identical rounded cards with the same grey shadow; ALL-CAPS eyebrow labels; monospace for data; "→" appended to buttons; accenting one word in a heading. None of these appear in ecoVolt-finder.

### 6.1 Palette

Green carries "renewable/eco". A distinct **electric teal** carries "volt / live / charging" so the two ideas never blur. Amber→red is reserved for the greenness scale and warnings, so it never competes with the brand.

```
Canvas & surfaces (light-first app)
--canvas          #F3F6F2   app background (cool off-white, faint green undertone — NOT cream)
--surface         #FFFFFF   cards, sheets
--surface-sunken  #EAF0EA   inputs, wells, skeleton base
--line            #DCE5DD   hairline borders, dividers

Ink (text)
--ink             #0C1A13   primary text (deep green-black)
--ink-2           #4C5C54   secondary text
--ink-3           #8A998F   placeholder / tertiary

Brand — renewable green
--brand           #0E8E4F   primary actions, "eco", high-renewable   (AA on white)
--brand-press     #0A6E3D   pressed state
--brand-tint      #E3F3E9   subtle brand backgrounds

Volt — electric teal (live / charging / secondary data-viz accent)
--volt            #0FB8C9
--volt-tint       #DFF5F7

Grid-dark surface (active-charging screen bg, live hero panel, map night)
--grid-900        #08150F   deep grid green-black
--grid-800        #0E2018
```

**Greenness scale** (drives gauges, map pins, badges). Map `renewablePct` → color, 6 stops:

```
>=80  VERY_HIGH  #0E8E4F   (deep emerald)
65-79 HIGH       #3DAE5F
50-64 MEDIUM     #8FB93B   (yellow-green)
35-49 —          #E0A81E   (amber)
20-34 LOW        #E2732B   (orange)
<20   VERY_LOW   #C8442E   (clay red)
```

**Semantic:** success `#0E8E4F` · info/live `#0FB8C9` · warning `#E0A81E` · danger `#C8442E`.
All text/background pairings must clear **WCAG AA (4.5:1)**; the palette above is chosen to pass on `--surface`/`--canvas`.

### 6.2 Typography

Two families, clearly distinct roles (no monospace, no all-caps eyebrows):

- **Space Grotesk** (600/700) — display, headings, and *big data numerals* (₹, %, kWh). Technical, mobility feel. `@expo-google-fonts/space-grotesk`.
- **Manrope** (400/500/600/700) — all body, UI labels, captions. `@expo-google-fonts/manrope`.

**Type scale (dp, size/line-height):**

```
Display  34/40  Space Grotesk 700   hero numbers (e.g. "72%", "₹6.8")
H1       26/32  Space Grotesk 600
H2       21/28  Space Grotesk 600
Title    17/24  Manrope 700         card titles, screen section titles
Body     15/22  Manrope 400/500     default text
Caption  13/18  Manrope 500         supporting text
Micro    11/15  Manrope 600         chips/status — sentence case, never ALL CAPS
```

Line length in any text block ≤ ~60 characters on mobile. Numbers use tabular figures (`fontVariant: ['tabular-nums']`) so gauges/prices don't jitter.

### 6.3 Spacing, radius, elevation

```
Spacing (4-base):  4 · 8 · 12 · 16 · 20 · 24 · 32 · 40
Radius:            sm 8 · md 12 · lg 16 · xl 22 · pill 999
Elevation (restrained, NOT the same shadow on everything):
  e1 card:   y2  blur 8   rgba(12,26,19,0.06)
  e2 sheet:  y8  blur 24  rgba(12,26,19,0.12)
  e0 inline: none (use --line border instead of a shadow)
```

Hierarchy comes from type, spacing, and *one* border/shadow level per role — not from stacking shadows.

### 6.4 Component kit (Member 1 builds these in M1-C2)

Primitives: `Text` (typed to the scale), `Button` (primary/secondary/ghost/danger + busy state), `Card`, `Sheet` (bottom sheet), `Badge/Chip`, `Input`, `SegmentedControl` (e.g. Car/Bike), `ListRow`, `EmptyState`, `ErrorState`, `OfflineBanner`.

Signature components: `GreennessGauge` (radial arc, colored by scale, shows % + band), `GreennessPin` (map marker colored by scale), `PriceBreakdown` (base + markup + ToU → final, with an "estimate" tag when `isEstimate`), `ForecastStrip` (24h renewable% sparkline with the recommended window highlighted), `TrueCostCard` (charging + travel = true total, vs sticker pick), `ChargingPulse` (the live moment — see 6.5).

### 6.5 Loading states — explicit mapping (as requested)

Each pattern is used for a specific reason, never decoratively. All respect `prefers-reduced-motion` / a `reduceMotion` setting (shimmer & pulse become static).

| Pattern | Component | Use it for |
|---|---|---|
| **Skeleton** (shimmer blocks matching final layout) | `<Skeleton/>`, `<SkeletonCard/>`, `<SkeletonRow/>` | Data lists & cards while fetching: station list, station detail, bookings history, manager/admin dashboard cards, map station cards. |
| **Linear progress** (thin bar, top-of-screen or inline) | `<LinearProgress/>` (determinate + indeterminate) | Multi-step compute: route calculation, "finding your greenest window", recommendation ranking, report/impact generation. Determinate variant for **session charge progress** (battery % → target). |
| **Circular spinner** | `<Spinner/>` (sm inline / lg centered) | Inline **button busy** state (keep the label: "Booking…"), pull-to-refresh, and the **full-screen app boot / auth check**. |
| **Pulse / glow (volt)** | `<ChargingPulse/>` | The one orchestrated motion moment: the **active charging** indicator — a slow volt-teal pulse. Used on exactly one element per screen, deliberately. |
| **Progressive / optimistic** | pattern, not a component | Map pins appear as they resolve; a greenness badge shows last-known value with a small "updating" dot while refetching (never blocks the UI). |

**Copy rules for states** (from the design brief): errors say what happened and how to fix it, in the product's voice, never a vague apology. Empty screens invite an action ("No stations in range — widen your search or switch to a 2-wheeler profile"). Buttons name the exact action and keep that name through the flow (button "Book slot" → toast "Slot booked").

Full spec lives in `docs/DESIGN_SYSTEM.md` (Member 1 writes it in M1-C2).

---

## 7. Complete workflows

### 7.1 Driver — primary flows

**A. Onboarding & vehicle setup**
1. Splash / boot (full-screen spinner while checking session).
2. Value intro (3 lightweight panels: see greenness → save money → we time it for you).
3. Role = driver. Sign up / log in.
4. Add a vehicle: class (Car/Bike via `SegmentedControl`), model (optional), battery capacity (kWh), efficiency (Wh/km, prefilled sensible defaults per class, editable), connector type(s), current charge %. → used for range + travel-cost + compatibility.

**B. Find & evaluate a station**
1. Home = map (react-native-maps) centered on the driver; station pins colored by live greenness; a top badge "Grid now: 72% renewable · high".
2. Search / filter sheet: connector, min power kW, vehicle class, "show only reachable", sort by (true total cost / greenest / nearest).
3. Tap a pin → station card (skeleton while loading) → open station detail:
   - Live greenness gauge + `DataQuality` tag (live/cached/mock).
   - `ForecastStrip`: next 24h renewable%, recommended window highlighted ("1–2pm ~68%, high confidence").
   - `PriceBreakdown`: base tariff (provider) + markup + ToU adj → final ₹/kWh, connector-by-connector.
   - Availability (available/total connectors), power kW.
   - `TrueCostCard`: "To top up 18 kWh here: energy ₹123 + travel ₹18 = **₹141**. Nearest cheaper-looking station is actually ₹9 more once travel is added."

**C. Decide: now vs smart window (the incentive loop)**
1. Two CTAs: **Charge now** and **Smart charge**.
2. Smart charge → app shows the recommended window + the payoff ("start 1:10pm, save ₹34, +46% renewable, done by 2:40pm") and an **urgent override** ("I need it now").
3. Confirm → booking created with a **price lock** (quoted ₹/kWh held until `validUntil`).

**D. Charge & see impact**
1. Active session screen: `ChargingPulse` (volt), determinate `LinearProgress` toward target %, live cost accruing, live greenness during the session.
2. Stop / auto-complete → summary: kWh delivered, ₹ paid, **avg renewable % achieved**, **CO₂ avoided vs grid-average**.
3. History & "Green impact" screen aggregates lifetime ₹ saved and kg CO₂ avoided (with empty state for first-timers).

### 7.2 Station manager (operator) — flows
1. Role = manager. Dashboard: their stations, live occupancy, today's revenue, current renewable share, **demand-charge risk meter** (are too many sessions stacking into a peak window?).
2. Add / edit station: name, location (map pin + geocode), power provider (Torrent/GB/Adani/Tata/…), connectors (type, power kW, count).
3. **Pricing control** (the multi-provider loophole): set **base tariff** (defaults to the provider's known slab, editable) + **service-provider markup** (₹/kWh, the manager's margin) + opt into **dynamic ToU/greenness discount** (auto-lower price in green/off-peak windows to attract load). Live preview of the resulting `finalPrice` per connector across the day.
4. Live sessions list; ability to mark a connector offline (maintenance).
5. Station analytics: utilization, revenue, renewable share achieved, avg price, demand-charge exposure over time.

### 7.3 Grid operator / admin — flows
1. Role = admin. Network overview: total live load, aggregate renewable share of charging, sessions shifted into renewable windows (the demand-response story), zones with data-quality warnings.
2. Drill into any zone: live + forecast greenness, stations in zone, load curve.
3. Read-only oversight of operators + ability to flag data issues. (No pricing control — that's the manager's.)

---

## 8. Edge cases & loopholes — with the solution and where it lives

This is the "handle every loophole" catalog. `EDGE_CASES.md` in the repo mirrors this; each chunk re-states the ones it owns.

| # | Loophole / edge case | Concrete solution | Owner chunk(s) |
|---|---|---|---|
| 1 | **Cheaper-but-farther station** — ₹10/kWh saving eaten by >₹10 of travel | Rank by **trueTotalCost = chargingCost + travelCost**, never by sticker ₹/kWh. Show `vsCheapestSticker` so the driver sees the trap. | M3-C8, M3-C9; shown by M1-C6 |
| 2 | **Different providers, different pricing** (Torrent vs GB vs Adani…) | Pricing engine = `baseTariff(provider)` + `providerMarkup(manager)` + `touAdjustment`. Manager enters base + markup per station/connector; provider is a first-class field. | M2-C6; UI M1-C11 |
| 3 | **Greenness isn't measurable per station** | Classify per **grid zone**, map each station→zone (state/DISCOM). UI always labels it as the zone's live value, never "this plug." | M3-C2, M3-C3 |
| 4 | **Renewable vs carbon-free conflation** (nuclear) | Two separate numbers: `renewablePct` (solar+wind+hydro+biomass+geo) and `carbonFreePct` (+nuclear). UI never mixes the terms. | M3-C3 |
| 5 | **Large-hydro classification debate** | One documented convention (hydro = renewable), stated in UI/methodology; single flag to flip it. | M3-C3 |
| 6 | **"unknown/other" generation in the mix** | Excluded from numerator; kept in denominator only if source includes it, else flagged `unclassified`; never silently guessed. | M3-C3 |
| 7 | **Why would a driver wait?** | Two real incentives: **price** (ToU/green discount) + **automation** (smart-charge schedules the delay; driver doesn't babysit). Payoff shown in ₹ and %. | M3-C10; M1-C8 |
| 8 | **Driver needs charge NOW** | Urgent override always available; recommendation still shows the tradeoff it's skipping. | M1-C5/C8; M3-C9 |
| 9 | **Vehicle can't reach the station** (range) | `reachable` computed from current charge %, capacity, efficiency, distance; unreachable stations are filtered or clearly marked. | M3-C8; M1-C4 |
| 10 | **Wrong connector** | `connectorCompatible` filter from vehicle's connector set; incompatible hidden by default, shown greyed with reason. | M2-C5, M3-C9; M1-C4 |
| 11 | **Bike vs car cost/range differ** | Vehicle model carries class + Wh/km; travel-cost and range use it. Defaults per class, user-editable. | M1-C7; M3-C8 |
| 12 | **Grid API down / rate-limited / no wifi** | Hybrid data layer: try live → cache → mock; every value tagged `DataQuality`; UI shows "cached/mock" honestly. Demo never white-screens. | M3-C2 |
| 13 | **Forecast presented as certainty** | Every forecast carries `confidence` (0..1) + band; UI shows confidence, hides/greys low-confidence windows. | M3-C5; M1-C5 |
| 14 | **No published ToU tariff for a DISCOM** | Transparent modeled proxy `base × (1 − renewablePct·k)`, `isEstimate=true`, UI tags it "estimate". | M3-C6, M2-C6 |
| 15 | **Double-booking a connector** | Atomic reservation in a DB transaction with row lock + capacity check; conflicting request gets a clean 409. | M2-C7 |
| 16 | **Demand-charge / peak stacking** | Booking engine caps concurrent sessions per station and nudges bookings out of peak; manager sees demand-charge risk. | M2-C7; M2-C10 |
| 17 | **Price changes mid-booking** | Price **locked** at booking (`validUntil`); session bills the locked price even if the manager edits later. | M2-C6, M2-C7 |
| 18 | **Station goes offline after booking** | Connector status watched; affected bookings auto-flagged, driver notified, easy rebook. | M2-C8; M2-C11 |
| 19 | **Location permission denied** | Fallback to manual search / pick-on-map; app fully usable without GPS. | M1-C4 |
| 20 | **No stations / all occupied** | Actionable empty states (widen radius, switch class, join waitlist), not dead ends. | M1-C4/C10 |
| 21 | **Timezone drift** (UTC grid data vs IST user) | All grid timestamps stored UTC, converted to IST for display; forecasts keyed by IST local hour. | M3-C4 |
| 22 | **Manager edits another manager's station** | Ownership check in RBAC middleware; 403 otherwise. | M2-C3, M2-C5 |
| 23 | **Payment failure / cancellation** | Mockable payment with explicit success/failure states; cancel within grace window refunds/releases the slot. | M2-C7 |
| 24 | **Bad numeric inputs** (0 kWh, battery already full, negative markup) | Zod validation on server + client guards; battery-full short-circuits with a friendly message. | M2 all; M1-C7 |
| 25 | **Google key leakage** | Directions/Matrix/Geocoding called **server-side** (proxied); only a restricted Maps-SDK-for-Android key ships in the app. | M3-C7, M2-C9, M1-C1 |
| 26 | **Google routing quota/cost blowup** | Distance-matrix results cached; only rank the K nearest candidate stations (pre-filtered by haversine) — not the whole network. | M3-C7, M3-C9 |
| 27 | **Offline app usage** | Cache last-known stations/greenness; read-only browsing offline with an `OfflineBanner`. | M1-C12 |
| 28 | **Accessibility** | AA contrast, labeled controls, focus/hit targets ≥44dp, reduced-motion honored. | M1-C2/C12 |

---

## 9. External APIs — setup guide (do these before coding the integrations)

> Details marked ⚠️ change over time (free-tier limits, pricing, exact endpoints). Verify at signup — don't hardcode assumptions. Keep all keys in `.env`, never in Git.

### 9.1 ⚠️ CRITICAL — Expo Go + maps
- Use **`react-native-maps`**, installed via `npx expo install react-native-maps` so Expo picks the version matching your SDK. On **Android Expo Go it renders with Google Maps** out of the box for basic display (markers, polylines, camera). This is why you can develop maps on Android Expo Go.
- Do **NOT** use the newer **`expo-maps`** module — it requires a **development build** and will not run in Expo Go. Since your test target is Android Expo Go, `react-native-maps` is the correct choice.
- Things that still push you to a **development build** (`npx expo run:android` or `eas build --profile development`): custom native modules, some map styling/features, background location, and using a Google provider on iOS. For the hackathon on Android Expo Go you can avoid this, but keep a dev-build path in your back pocket if a native feature is missing. Pin your Expo SDK version at project init and don't bump it mid-hackathon.
- The **Maps SDK for Android API key** goes in `app.json` under `expo.android.config.googleMaps.apiKey`. Restrict that key to Android apps by package name + SHA-1.

### 9.2 Google Maps Platform (get one project, enable APIs, make TWO keys)
Create a Google Cloud project, enable billing (required even for free usage), then enable: **Maps SDK for Android** (client display), **Routes API** (or legacy Directions + Distance Matrix), **Geocoding API**, and optionally **Places API** (search autocomplete).
- **Key A — Android/client:** restricted to your Android package + SHA-1. Ships in `app.json`. Used only for map *display*.
- **Key B — server:** restricted by IP (your backend / ML service). Used for Routes/Distance-Matrix/Geocoding calls, which are **proxied server-side** so the key never ships in the app.
- **Routes API** (current): `POST https://routes.googleapis.com/directions/v2:computeRoutes` and `:computeRouteMatrix` — returns distance, duration, and an encoded polyline. Legacy equivalents: Directions API (`/maps/api/directions/json`) and Distance Matrix API. Either works; Routes is the newer recommendation.
- ⚠️ Free usage: Google provides monthly free usage caps per product; confirm current limits and set a **budget alert**. Our design keeps calls low by pre-filtering candidate stations with a cheap haversine distance and only matrix-ranking the nearest K (see M3-C7/C9).

### 9.3 Electricity Maps (primary live/forecast greenness)
- Sign up for an API token. ⚠️ Free/trial access is typically limited (often one zone / recent data); full history + forecast is a paid plan. Check for **student/hackathon access** at signup.
- Auth header: `auth-token: <TOKEN>`. India zone id is `IN` (some datasets expose sub-zones like `IN-WE`, `IN-NO`, `IN-SO`, `IN-EA`, `IN-NE`).
- Useful endpoints (v3): `/power-breakdown/latest`, `/power-breakdown/history`, `/power-breakdown/forecast`, `/carbon-intensity/latest`, `/carbon-intensity/forecast`, and a zones list.
- Handy: responses include `renewablePercentage` and `fossilFreePercentage` plus a `powerProductionBreakdown` (solar, wind, hydro, nuclear, coal, gas, biomass, unknown…). We still compute our own `renewablePct` from the breakdown (so mock + real share one code path), but these fields are a good cross-check.

### 9.4 India Energy Atlas / Grid-India (secondary, credibility)
- India-specific sources (CEA, CERC, POSOCO/Grid-India) give state-granular demand, fuel mix, and carbon intensity — great for judge credibility ("authoritative Indian data"). ⚠️ Public real-time API availability/auth is less clean than Electricity Maps; **verify what's actually queryable before committing**. Treat as an optional enrichment/secondary source behind the same `GridSnapshot` interface.
- If no clean API is available in time, rely on Electricity Maps for real data and the **mock generator** for reliability — and say so honestly in the pitch (judges respect the clarity about what's real vs modeled).

### 9.5 The hybrid data contract (so real vs mock is invisible to the app)
All three sources implement one interface returning `GridSnapshot`. Resolution order: **live API → recent cache → mock generator**, and every value is tagged `DataQuality` (`live`/`cached`/`mock`/`stale`). The app only ever reads `GridSnapshot` + its quality tag. A single env flag `GRID_MODE=live|mock|hybrid` forces behavior for demos. (Built in M3-C2.)

### 9.6 Env vars (each service keeps its own `.env`, plus a committed `.env.example`)
```
# app/.env         GOOGLE_MAPS_ANDROID_KEY=...    API_BASE_URL=...
# server/.env       DATABASE_URL=...  JWT_SECRET=...  JWT_REFRESH_SECRET=...  ML_SERVICE_URL=...  GOOGLE_SERVER_KEY=...
# ml/.env           ELECTRICITY_MAPS_TOKEN=...  GOOGLE_SERVER_KEY=...  GRID_MODE=hybrid  INDIA_ATLAS_KEY=...(optional)
```

---

## 10. Prompt conventions (why these chunks won't produce garbage)

Every chunk below is engineered so the agent can't hand-wave:

1. **Think-first gate** — the agent writes a design note and pauses. You approve the *thinking* before any feature code exists.
2. **Explicit file lists** — the agent creates exactly the named files; no mystery structure.
3. **Signatures & data shapes given** — less room to invent an incompatible interface.
4. **Contract-bound** — inputs/outputs reference `/contracts`, so pieces fit.
5. **Edge cases restated per chunk** — the relevant loopholes travel with the code that must handle them.
6. **Do-NOT-touch list** — protects other members' files → parallel-safe.
7. **Acceptance checks** — a concrete self-test the agent runs (typecheck, unit test, sample request) before declaring done.

Paste a chunk verbatim. When the agent asks to proceed past the think-first note, review the note, then approve.

---

# MEMBER 1 — App / UI (React Native + Expo) · Chunks M1-C1 → M1-C12

> Owns `/app`. Every chunk: paste the block between **PROMPT START/END** into Antigravity on the branch named in Meta. The agent must produce the *think-first note* and pause before coding. All screens build against `/contracts/examples/*.json` mocks until real APIs are live, controlled by a single `USE_MOCKS` flag.

### M1-C1 — Expo app bootstrap & foundations
**Meta:** owner M1 · branch `m1/c1-bootstrap` · depends on: `/contracts` skeleton.

═══ PROMPT START ═══
You are setting up the React Native app for **ecoVolt-finder**, an EV charging renewable-optimization app. Target runtime is **Android via Expo Go**, so use **Expo (managed)** and **`react-native-maps`** — do NOT use `expo-maps` (it needs a dev build). Pin the current Expo SDK.

**Think first (write to `docs/notes/M1-C1.md`, then stop for my review):** list the folder structure under `app/src`, the navigation graph (auth stack, driver tabs, manager stack, admin stack), the libraries you'll add and why, and how the `USE_MOCKS` flag + API base URL flow through the app. Do not write feature code until I approve this note.

**Then build:**
- Initialize the Expo app in `/app` with TypeScript. Add: React Navigation (native stack + bottom tabs), `react-native-maps` (via `npx expo install`), `@tanstack/react-query`, `zustand` (light client state), `expo-secure-store`, `expo-location`, `@expo-google-fonts/space-grotesk` + `@expo-google-fonts/manrope` + `expo-font`, `react-native-svg` (for the greenness gauge), and `zod`.
- Configure `app.json`: app name "ecoVolt-finder", Android package `com.ecovolt.finder`, location permission strings, and `expo.android.config.googleMaps.apiKey` read from env (`GOOGLE_MAPS_ANDROID_KEY`). Add `.env.example` and load env via `expo-constants`/`app.config.ts`.
- Create the folder structure exactly as in the repo architecture (`theme/`, `components/`, `screens/`, `navigation/`, `features/`, `api/`, `lib/`).
- Set up `src/api/http.ts`: a fetch wrapper reading `API_BASE_URL`, attaching the JWT from secure store, refreshing on 401, and a `USE_MOCKS` switch that returns `/contracts/examples/*.json` instead of hitting the network.
- Create a React Query provider, a root `App.tsx` that loads fonts (full-screen `<Spinner/>` placeholder until fonts + auth check resolve), and a navigation container with a placeholder screen per stack.
- Add `.gitignore` (node_modules, .expo, .env*, dist).

**Do NOT touch:** `/server`, `/ml`. Only add to `/contracts` if you create the `examples/` folder placeholders.

**Acceptance checks:** `npx tsc --noEmit` passes; app boots in Android Expo Go to a placeholder home; fonts load; toggling `USE_MOCKS` changes a demo fetch source. Commit as `M1-C1: expo bootstrap + navigation + http layer`.
═══ PROMPT END ═══

### M1-C2 — Design system & UI kit (incl. all loading states)
**Meta:** owner M1 · branch `m1/c2-design-system` · depends on M1-C1.

═══ PROMPT START ═══
Implement the **"Living Grid" design system** for ecoVolt-finder in `/app/src/theme` and `/app/src/components`, and write `docs/DESIGN_SYSTEM.md`.

**Think first (`docs/notes/M1-C2.md`, then stop):** list every token, every primitive, every loading component, and the greenness color function signature. Confirm the palette avoids the generic AI tells (no cream/terracotta, no all-caps eyebrows, no monospace data, no identical shadows, no "→" in buttons).

**Then build tokens** in `theme/tokens.ts` exactly:
- Colors: canvas `#F3F6F2`, surface `#FFFFFF`, surface-sunken `#EAF0EA`, line `#DCE5DD`, ink `#0C1A13`, ink-2 `#4C5C54`, ink-3 `#8A998F`, brand `#0E8E4F`, brand-press `#0A6E3D`, brand-tint `#E3F3E9`, volt `#0FB8C9`, volt-tint `#DFF5F7`, grid-900 `#08150F`, grid-800 `#0E2018`; semantic success/info/warning/danger = `#0E8E4F`/`#0FB8C9`/`#E0A81E`/`#C8442E`.
- Greenness scale + `greennessColor(pct)` and `greennessBand(pct)` per the 6 stops in the design system (≥80 emerald … <20 clay red).
- Type scale (Space Grotesk for Display/H1/H2 + big numerals; Manrope for Title/Body/Caption/Micro). Sizes/line-heights per DESIGN_SYSTEM. Numbers use `tabular-nums`.
- Spacing 4→40, radii sm8…pill999, elevation e0/e1/e2 as specified (NOT the same shadow everywhere).

**Then build primitives** in `components/`: `Text` (variant-typed), `Button` (primary/secondary/ghost/danger, `busy` shows inline `<Spinner/>` and keeps its label), `Card`, `Sheet`, `Chip/Badge`, `Input` (with error text), `SegmentedControl`, `ListRow`, `EmptyState`, `ErrorState` (says what happened + a fix action), `OfflineBanner`.

**Loading components** (respect a `reduceMotion` setting — shimmer/pulse become static):
- `Skeleton`, `SkeletonCard`, `SkeletonRow` (shimmer, shaped like final content).
- `LinearProgress` (determinate + indeterminate).
- `Spinner` (sm inline / lg centered).
- `ChargingPulse` (slow volt-teal pulse, used for the live charging moment only).

**Do NOT touch:** `/server`, `/ml`, other members' contract files.

**Acceptance checks:** a hidden `theme/Preview.tsx` screen renders every token, primitive, and loading state; contrast of ink/brand on surface passes AA; `tsc` clean. Commit `M1-C2: design system + UI kit + loading states`.
═══ PROMPT END ═══

### M1-C3 — Auth flow & session
**Meta:** owner M1 · branch `m1/c3-auth` · depends on M1-C2; consumes Node `/auth/*`, `/me` (mock until M2-C3).

═══ PROMPT START ═══
Build onboarding + auth for ecoVolt-finder against the Node auth contract (`/contracts/openapi.node.yaml`), using mocks (`USE_MOCKS`) until the backend is live.

**Think first (`docs/notes/M1-C3.md`):** map screens (Splash → Intro(3 panels) → Role select → Login/Signup → OTP-or-email verify), the auth store shape, token storage/refresh, and how role gates navigation (driver tabs vs manager stack vs admin stack).

**Then build:** `features/auth/` with a `zustand` store (`user`, `role`, `tokens`, `hydrate()` from secure store), screens under `screens/auth/`, form validation with `zod`, and route guards in `navigation/`. Boot uses full-screen `<Spinner/>` while hydrating; login button uses `busy` state; errors use `ErrorState`/inline messages in the product voice (never a vague apology).

**Edge cases:** invalid credentials (clear message + retry), expired token (silent refresh, else bounce to login), role-appropriate landing screen.

**Do NOT touch:** `/server`, `/ml`. **Acceptance:** full mock login → lands on the correct stack per role; token persists across app restart; `tsc` clean. Commit `M1-C3: auth flow + session + role routing`.
═══ PROMPT END ═══

### M1-C4 — Driver home: map + station discovery
**Meta:** owner M1 · branch `m1/c4-driver-map` · depends on M1-C2/C3; consumes `/stations`, `/grid/live` (mock first).

═══ PROMPT START ═══
Build the driver **home map** screen for ecoVolt-finder using `react-native-maps` (Android Expo Go).

**Think first (`docs/notes/M1-C4.md`):** describe the screen regions (map, top greenness badge, search bar, filter sheet, station cards carousel), the data hooks (`useNearbyStations`, `useLiveGrid`), and the location-permission fallback path.

**Then build** `screens/driver/HomeMapScreen.tsx` + `features/stations/`:
- Map centered on the driver (via `expo-location`); if permission denied → manual search / pick-on-map fallback (no dead end).
- `GreennessPin` markers colored by `greennessColor(renewablePct)`; tapping a pin opens a bottom `Sheet` station card (`SkeletonCard` while loading).
- Top badge: "Grid now: NN% renewable · <band>" with a `DataQuality` tag; a small "updating" dot when refetching (progressive/optimistic — never block the map).
- Filter sheet: connector type, min kW, vehicle class, "reachable only", sort by (true total cost / greenest / nearest).
- Station cards show name, distance, `priceFrom`, greenness chip.

**Edge cases (#9,#10,#12,#19,#20):** unreachable stations greyed with a reason; incompatible connectors filtered; mock/cached data shown honestly via the quality tag; permission-denied fallback; empty state ("No stations in range — widen search or switch to a 2-wheeler profile").

**Do NOT touch:** `/server`, `/ml`. **Acceptance:** renders pins on Android Expo Go from mock data; filters change the list; denying location still lets you search; `tsc` clean. Commit `M1-C4: driver map + discovery + filters`.
═══ PROMPT END ═══

### M1-C5 — Station detail (greenness, forecast, price, true cost)
**Meta:** owner M1 · branch `m1/c5-station-detail` · depends on M1-C4; consumes `/stations/:id`, `/pricing/quote`, `/forecast`.

═══ PROMPT START ═══
Build `screens/driver/StationDetailScreen.tsx` for ecoVolt-finder — the decision screen.

**Think first (`docs/notes/M1-C5.md`):** list sections and the components each uses: header, `GreennessGauge`, `ForecastStrip`, `PriceBreakdown` (per connector), availability, `TrueCostCard`, and the two CTAs (Charge now / Smart charge).

**Then build the signature components** (in `components/`) and the screen:
- `GreennessGauge` (SVG radial arc colored by scale; shows % + band + `DataQuality`).
- `ForecastStrip` (24h renewable% sparkline; highlight the recommended window; show `confidence`; grey/omit low-confidence hours).
- `PriceBreakdown` (base + markup + ToU → final ₹/kWh; show an "estimate" tag when `isEstimate`).
- `TrueCostCard` (energy ₹ + travel ₹ = **true total**, plus the `vsCheapestSticker` line that exposes the cheaper-far-station trap).
- Skeletons per section while loading.

**Edge cases (#1,#4,#5,#13,#14):** never conflate renewable vs carbon-free (show both if space); label estimates; show forecast confidence; true-cost always includes travel.

**Do NOT touch:** `/server`, `/ml`. **Acceptance:** renders fully from mock `StationSummary`+`PriceQuote`+`ForecastPoint[]`+`StationRecommendation`; estimate/quality tags visible; `tsc` clean. Commit `M1-C5: station detail + gauge/forecast/price/true-cost`.
═══ PROMPT END ═══

### M1-C6 — Route & travel-cost comparison
**Meta:** owner M1 · branch `m1/c6-route` · depends on M1-C5; consumes `/recommendations` (draws route polyline from ML route data).

═══ PROMPT START ═══
Build `screens/driver/RouteCompareScreen.tsx` for ecoVolt-finder: show the drive to a station and the honest total-cost comparison.

**Think first (`docs/notes/M1-C6.md`):** describe how you render the polyline on `react-native-maps` from an encoded polyline, the distance/time header, the vehicle-aware travel-cost line, and the comparison card between the tapped station and the app's recommended station.

**Then build:** decode the route polyline (add a small decoder util in `lib/`) and draw it; header shows distance km + drive minutes; a `LinearProgress` while the route/recommendation computes; a comparison showing Station A (chosen) vs the recommended one with `trueTotalCost` for each and a plain-language `reason`.

**Edge cases (#1,#8,#9,#11):** show when the "cheaper" station is actually worse after travel; if unreachable, say so and suggest the reachable alternative; travel cost reflects the selected vehicle class.

**Do NOT touch:** `/server`, `/ml`. **Acceptance:** polyline draws from a mock encoded polyline; comparison math displays from mock `StationRecommendation[]`; `tsc` clean. Commit `M1-C6: route + true-cost comparison`.
═══ PROMPT END ═══

### M1-C7 — Vehicle profile & management
**Meta:** owner M1 · branch `m1/c7-vehicles` · depends on M1-C3; consumes `/vehicles`.

═══ PROMPT START ═══
Build vehicle management for ecoVolt-finder (`screens/driver/Vehicles*`, `features/vehicles/`).

**Think first (`docs/notes/M1-C7.md`):** the vehicle form fields and their validation, the sensible per-class defaults (Car vs Bike Wh/km + typical battery kWh), and how the active vehicle feeds range/compatibility/travel-cost elsewhere.

**Then build:** list + add/edit/delete vehicle. Fields: class (`SegmentedControl` Car/Bike), name/model (optional), battery capacity kWh, efficiency Wh/km (prefilled per class, editable), connector type(s) (multi-select), current charge %. `zod` validation. Persist active vehicle in the vehicles store.

**Edge cases (#11,#24):** default efficiency differs by class; reject non-positive capacity, charge % outside 0–100; "battery already full" surfaces later where relevant.

**Do NOT touch:** `/server`, `/ml`. **Acceptance:** CRUD works against mocks; defaults switch with class; validation blocks bad input; `tsc` clean. Commit `M1-C7: vehicle profiles + defaults`.
═══ PROMPT END ═══

### M1-C8 — Smart-charge scheduling & booking
**Meta:** owner M1 · branch `m1/c8-scheduling` · depends on M1-C5/C7; consumes `/smartcharge/plan`, `/bookings`, `/pricing/quote`.

═══ PROMPT START ═══
Build the **smart-charge + booking** flow for ecoVolt-finder (`screens/driver/SmartChargeScreen.tsx`, `screens/driver/ConfirmBookingScreen.tsx`).

**Think first (`docs/notes/M1-C8.md`):** the two paths (Charge now vs Smart charge), how the recommended window + payoff is shown, the urgent override, and the price-lock display.

**Then build:** Smart charge shows the recommended start/end window with the payoff in ₹ saved + renewable% gained + finish time; an **"I need it now"** urgent override; Confirm screen shows the locked price (`validUntil` countdown) and creates the booking. `LinearProgress` while planning; button `busy` on confirm; success toast "Slot booked".

**Edge cases (#7,#8,#13,#17):** always offer urgent override; show forecast confidence behind the window; make the price-lock explicit; if the window's confidence is low, say so.

**Do NOT touch:** `/server`, `/ml`. **Acceptance:** plan → confirm → booking created against mocks; urgent path bypasses the window; price lock + countdown visible; `tsc` clean. Commit `M1-C8: smart-charge + booking confirm`.
═══ PROMPT END ═══

### M1-C9 — Active charging session
**Meta:** owner M1 · branch `m1/c9-session` · depends on M1-C8; consumes `/sessions/:id`.

═══ PROMPT START ═══
Build `screens/driver/ActiveSessionScreen.tsx` for ecoVolt-finder — the live charging moment.

**Think first (`docs/notes/M1-C9.md`):** the live elements (charge % toward target, cost accruing, live greenness during session), how you poll/refresh session state, and where the single `ChargingPulse` moment goes.

**Then build:** determinate `LinearProgress` from current→target %; `ChargingPulse` (volt) as the one animated element; live cost using the locked price; live greenness chip; Stop button (`busy` while stopping) → completion summary (kWh, ₹ paid, avg renewable % achieved, CO₂ avoided). Poll session every few seconds via React Query.

**Edge cases (#17,#18):** bill the locked price; if the connector goes offline mid-session, show a clear state + next step.

**Do NOT touch:** `/server`, `/ml`. **Acceptance:** progresses and completes from a mock session; only one animated element on screen; reduced-motion makes the pulse static; `tsc` clean. Commit `M1-C9: active session + completion summary`.
═══ PROMPT END ═══

### M1-C10 — Bookings, history & green impact
**Meta:** owner M1 · branch `m1/c10-impact` · depends on M1-C9; consumes `/bookings`, `/impact/me`.

═══ PROMPT START ═══
Build bookings/history + the **Green Impact** screen for ecoVolt-finder (`screens/driver/Bookings*`, `screens/driver/ImpactScreen.tsx`).

**Think first (`docs/notes/M1-C10.md`):** the list states (upcoming/active/past), the impact aggregates (lifetime ₹ saved, kg CO₂ avoided, avg renewable % achieved), and the first-time empty states.

**Then build:** bookings list with statuses + cancel action (grace-window aware, from contract); Impact screen with big Space-Grotesk numerals + a simple renewable-share visual; `SkeletonRow` while loading; inviting empty states.

**Edge cases (#20,#23):** cancel within grace window; empty history invites the first charge, doesn't dead-end.

**Do NOT touch:** `/server`, `/ml`. **Acceptance:** lists + cancel work against mocks; impact aggregates render; empty states shown when data is empty; `tsc` clean. Commit `M1-C10: bookings + green impact`.
═══ PROMPT END ═══

### M1-C11 — Station-manager app
**Meta:** owner M1 · branch `m1/c11-manager` · depends on M1-C2/C3; consumes manager `/stations`, `/pricing`, `/analytics/station/:id`.

═══ PROMPT START ═══
Build the **station-manager** experience for ecoVolt-finder (`screens/manager/*`).

**Think first (`docs/notes/M1-C11.md`):** manager dashboard widgets, the add/edit-station form (incl. provider + connectors), and the **pricing control** UI (base tariff + service-provider markup + optional dynamic green discount) with a live all-day price preview.

**Then build:**
- Dashboard: their stations, live occupancy, today's revenue, current renewable share, and a **demand-charge risk meter**.
- Add/edit station: name, location (map pin + geocode), **power provider** (Torrent/GB/Adani/Tata/…), connectors (type, kW, count).
- **Pricing control:** base tariff (defaults per provider, editable) + markup (₹/kWh) + toggle dynamic ToU/green discount; live preview of `finalPrice` per connector across 24h.
- Live sessions list; mark connector offline.

**Edge cases (#2,#16,#22,#24):** provider is first-class; manager sees demand-charge risk; only their own stations are editable (guarded server-side too); reject negative markup / invalid tariffs.

**Do NOT touch:** `/server`, `/ml`. **Acceptance:** manager can add a station, set provider + base + markup, and see the price preview update; dashboard renders from mocks; `tsc` clean. Commit `M1-C11: station-manager dashboard + pricing control`.
═══ PROMPT END ═══

### M1-C12 — Admin/grid dashboard + global polish
**Meta:** owner M1 · branch `m1/c12-admin-polish` · depends on all M1; consumes `/analytics/network`.

═══ PROMPT START ═══
Build the admin/grid dashboard and run a global polish pass for ecoVolt-finder.

**Think first (`docs/notes/M1-C12.md`):** admin widgets (network load, aggregate renewable share, sessions shifted into green windows, zones with data-quality warnings), plus a checklist for the polish pass (empty/error/offline states, reduced-motion, accessibility, loading-state audit).

**Then build:** `screens/admin/NetworkDashboardScreen.tsx` (+ zone drilldown, read-only). Then polish: add `OfflineBanner` wiring (cache last-known stations/greenness for read-only offline), verify every list/detail has skeleton + error + empty states, ensure only deliberate motion remains, audit AA contrast and ≥44dp hit targets, honor `reduceMotion` everywhere.

**Edge cases (#12,#27,#28):** offline read-only browsing; honest data-quality tags; accessibility pass.

**Do NOT touch:** `/server`, `/ml`. **Acceptance:** admin dashboard renders from mocks; airplane-mode shows cached data + banner; a written polish checklist in `docs/notes/M1-C12.md` is all ticked; `tsc` clean. Commit `M1-C12: admin dashboard + polish/accessibility/offline`.
═══ PROMPT END ═══

---

# MEMBER 2 — Backend / API (Node + Express + Postgres) · Chunks M2-C1 → M2-C12

> Owns `/server`. Implements the `openapi.node.yaml` surface, calls Member 3's `openapi.ml.yaml` service, and is the source of truth for pricing, bookings, and sessions. Commit ML-mock example responses to `/contracts/examples/` early so the app isn't blocked.

### M2-C1 — Backend bootstrap
**Meta:** owner M2 · branch `m2/c1-bootstrap` · depends on `/contracts`.

═══ PROMPT START ═══
Set up the **ecoVolt-finder** API in `/server`: Node + Express + TypeScript + PostgreSQL.

**Think first (`docs/notes/M2-C1.md`, then stop):** the folder layout (`modules/`, `db/`, `middleware/`, `integrations/`), the config/env strategy, the error/response envelope shape, the logging approach, and how OpenAPI is kept in sync with `/contracts/openapi.node.yaml`.

**Then build:** Express app with TypeScript; structured config from env (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ML_SERVICE_URL`, `GOOGLE_SERVER_KEY`, `PORT`); Prisma (or Knex) wired to Postgres; a `docker-compose.yml` running Postgres for local dev; a global error handler emitting a consistent envelope `{ error: { code, message, details? } }`; request logging; `helmet` + `cors` + a base `express-rate-limit`; a `GET /health` returning db connectivity; and an OpenAPI doc served at `/docs`. Add `.env.example` and `.gitignore`.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** `docker-compose up` starts Postgres; server boots; `/health` returns ok with db connected; `tsc` clean. Commit `M2-C1: express+postgres bootstrap + health + error envelope`.
═══ PROMPT END ═══

### M2-C2 — Database schema, migrations & seed
**Meta:** owner M2 · branch `m2/c2-schema` · depends M2-C1.

═══ PROMPT START ═══
Design and migrate the **ecoVolt-finder** database.

**Think first (`docs/notes/M2-C2.md`):** an ER description of all tables + relationships + indexes, and how station→grid-zone mapping and multi-provider pricing are represented. Confirm shapes match `/contracts/types.ts`.

**Then build** migrations + models for: `users` (role enum), `vehicles` (class, capacity_kwh, efficiency_wh_km, connectors[], charge_pct), `operators` (owner user), `stations` (operator_id, location lat/lng, provider enum, zone_id), `connectors` (station_id, type, power_kw, count, status), `grid_zones` (id, name), `station_zone_map`, `tariffs` (provider, zone, base_rate, optional ToU slabs), `pricing_rules` (station/connector: markup, dynamic-discount toggle & params), `bookings` (user, station, connector, window, status, locked price snapshot), `sessions` (booking, energy_kwh, cost, avg_renewable_pct, co2_avoided, status), `forecast_cache`, `reviews` (optional). Add spatial or lat/lng indexes for geo queries. Write a **seed** with a few Indian operators/providers (Torrent, GUVNL/GB, Adani, Tata), stations across 2–3 zones, connectors, tariffs, and demo users (driver/manager/admin).

**Edge cases (#2,#3,#17):** provider + zone are first-class; bookings store a **locked price snapshot**; station carries a zone_id for greenness mapping.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** migrations run clean; seed populates demo data; a sample geo query returns nearby stations; `tsc` clean. Commit `M2-C2: schema + migrations + seed`.
═══ PROMPT END ═══

### M2-C3 — Auth & RBAC
**Meta:** owner M2 · branch `m2/c3-auth` · depends M2-C2. Unblocks M1-C3.

═══ PROMPT START ═══
Implement auth + role-based access for **ecoVolt-finder** per `openapi.node.yaml`.

**Think first (`docs/notes/M2-C3.md`):** the token strategy (access + refresh, lifetimes, rotation), password hashing, the `requireAuth` and `requireRole(...)` middleware, and the **ownership guard** (a manager may only mutate their own operator's stations).

**Then build:** `POST /auth/signup`, `/auth/login`, `/auth/refresh`; `GET/PATCH /me`; `bcrypt`/`argon2` hashing; JWT issue/verify; `requireAuth`, `requireRole`, and `requireStationOwnership` middleware; `zod` validation on all bodies; stricter rate limits on auth routes.

**Edge cases (#22,#24):** ownership 403s; invalid credential messages don't leak which field failed; reject malformed input.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** signup→login→access protected route→refresh works via `supertest`; a manager editing another's station gets 403; `tsc` clean. Commit `M2-C3: auth + jwt + rbac + ownership`.
═══ PROMPT END ═══

### M2-C4 — Users & vehicles API
**Meta:** owner M2 · branch `m2/c4-vehicles` · depends M2-C3. Unblocks M1-C7.

═══ PROMPT START ═══
Implement profile + vehicle endpoints for **ecoVolt-finder**.

**Think first (`docs/notes/M2-C4.md`):** validation rules and per-class defaults for vehicles, and the response shapes (must match `/contracts/types.ts`).

**Then build:** `GET/PATCH /me`; `GET/POST /vehicles`, `PATCH/DELETE /vehicles/:id` (owner-scoped). Validate class∈{car,bike}, capacity_kwh>0, 0≤charge_pct≤100, efficiency_wh_km>0, connectors ⊆ ConnectorType. Provide sensible class defaults if omitted.

**Edge cases (#11,#24):** reject invalid numerics; default efficiency per class.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** CRUD covered by tests incl. rejection cases; `tsc` clean. Commit `M2-C4: users + vehicles api`.
═══ PROMPT END ═══

### M2-C5 — Stations, operators & geo search
**Meta:** owner M2 · branch `m2/c5-stations` · depends M2-C3. Unblocks M1-C4/C11.

═══ PROMPT START ═══
Implement station/operator endpoints + geo search for **ecoVolt-finder**.

**Think first (`docs/notes/M2-C5.md`):** the geo-query approach (PostGIS vs haversine SQL), how availability is computed from connector status, and how a `StationSummary` is assembled (incl. greenness fetched via the ML integration + priceFrom via the pricing engine).

**Then build:** `GET /stations?lat&lng&radiusKm&connector&class&sort` (returns `StationSummary[]`, nearest-K pre-filtered by haversine), `GET /stations/:id`, `POST /stations` + `PATCH /stations/:id` (manager, ownership-guarded), connector CRUD, operator registry read. Attach each station's `zone_id`; availability = free/total connectors.

**Edge cases (#3,#10,#22,#26):** station→zone attached for greenness; connector filter; ownership guard; cap candidate set to nearest K to keep downstream routing cheap.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** geo query returns correct nearby stations from seed; manager scoping enforced; `tsc` clean. Commit `M2-C5: stations + operators + geo search`.
═══ PROMPT END ═══

### M2-C6 — Pricing engine (multi-provider)
**Meta:** owner M2 · branch `m2/c6-pricing` · depends M2-C2/C5. Unblocks M1-C5/C11.

═══ PROMPT START ═══
Implement the **pricing engine** for ecoVolt-finder — the multi-provider pricing loophole.

**Think first (`docs/notes/M2-C6.md`):** write the pricing formula and every input in plain text before coding: `finalPrice = baseTariff(provider,zone) + providerMarkup(manager) + touAdjustment(time, renewablePct)`. Define how the dynamic green discount is bounded, when a value is a published tariff vs a modeled estimate (`isEstimate`), and how a quote becomes a **price lock**.

**Then build** `modules/pricing/`:
- `computeQuote({stationId, connectorType, kwh, at})` → `PriceQuote` (base + markup + touAdjustment → finalPrice, `isEstimate`, `validUntil`).
- `GET /pricing/quote?stationId&connector&kwh` returns `PriceQuote`.
- ToU adjustment: if a published ToU tariff exists use it; else use a transparent modeled proxy `base × (−k·renewablePct)` clamped to a configured min/max, marked `isEstimate`.
- Green discount is opt-in per station (from `pricing_rules`) and bounded so price never goes below a floor.

**Edge cases (#2,#5,#14,#17,#24):** provider-specific base; honest estimate flag; bounded discount; a lockable quote with `validUntil`; reject negative markup.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** quotes for stations on different providers differ correctly; estimate flag set when no ToU tariff; discount respects the floor; unit tests on the formula; `tsc` clean. Commit `M2-C6: multi-provider pricing engine + quotes + price lock`.
═══ PROMPT END ═══

### M2-C7 — Booking & scheduling engine
**Meta:** owner M2 · branch `m2/c7-bookings` · depends M2-C6. Unblocks M1-C8.

═══ PROMPT START ═══
Implement bookings + scheduling for ecoVolt-finder with correctness under concurrency.

**Think first (`docs/notes/M2-C7.md`):** the booking state machine (reserved→scheduled→active→completed / cancelled / expired / failed), the **anti-double-booking** strategy (DB transaction + row lock + capacity check), how a booking captures the **price lock**, the **demand-charge-aware** concurrency cap per station, and cancellation/refund grace rules.

**Then build** `modules/bookings/`: `POST /bookings` (validates connector availability for the window inside a transaction; writes locked price snapshot; returns 409 on conflict), `GET /bookings`, `PATCH /bookings/:id/cancel` (grace-window aware, releases slot). Enforce a configurable max concurrent sessions per station to smooth peaks; nudge bookings out of a configured peak window when possible.

**Edge cases (#15,#16,#17,#23):** no double-booking under parallel requests; price is locked at booking; peak stacking capped; cancellation releases the slot and refunds within grace.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** a concurrency test firing two simultaneous bookings for the last connector yields exactly one success + one 409; locked price persists; `tsc` clean. Commit `M2-C7: booking engine + concurrency + price lock + demand cap`.
═══ PROMPT END ═══

### M2-C8 — Session lifecycle & metering
**Meta:** owner M2 · branch `m2/c8-sessions` · depends M2-C7. Unblocks M1-C9.

═══ PROMPT START ═══
Implement charging sessions for ecoVolt-finder.

**Think first (`docs/notes/M2-C8.md`):** how a session starts from a booking, how energy is metered (mock meter or manager input) in a demo, how cost uses the **locked** price, and how live greenness is snapshotted during the session for the impact summary.

**Then build:** `POST /sessions/:id/start`, `POST /sessions/:id/stop`, `GET /sessions/:id`. On stop: compute energy_kwh, cost (locked price × kWh), avg_renewable_pct (from snapshots via ML), and CO₂ avoided vs grid-average. Handle a connector going offline mid-session (mark session, expose a clear state).

**Edge cases (#17,#18):** always bill the locked price; offline-connector handling; guard against stopping an already-stopped session.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** start→stop produces a correct summary from seed + mock meter; locked price honored; `tsc` clean. Commit `M2-C8: session lifecycle + metering + impact calc`.
═══ PROMPT END ═══

### M2-C9 — Integration layer (ML service + Google proxy)
**Meta:** owner M2 · branch `m2/c9-integrations` · depends M2-C1; consumes `openapi.ml.yaml`.

═══ PROMPT START ═══
Build the integration layer for ecoVolt-finder that fronts Member 3's ML service and Google's server-side APIs.

**Think first (`docs/notes/M2-C9.md`):** the ML client interface (forecast, recommend, route matrix, smartcharge plan), timeout + retry + **fallback-to-mock** behavior, a short-TTL cache, and why Google Directions/Matrix/Geocoding are proxied here (key never ships in the app).

**Then build** `integrations/mlClient.ts` and `integrations/googleProxy.ts`, plus the passthrough endpoints: `GET /recommendations`, `GET /forecast`, and any geocoding the app needs. On ML timeout/error, serve the cached or `/contracts/examples` mock and tag `DataQuality` accordingly so the app degrades gracefully.

**Edge cases (#12,#25,#26):** graceful fallback when ML/Google are down; server-side key only; cache to limit quota/cost.

**Do NOT touch:** `/app`, `/ml` (call it over HTTP only). **Acceptance:** with ML service down, `/recommendations` still returns mock-tagged data; Google key never appears in any app-facing response; `tsc` clean. Commit `M2-C9: ml client + google proxy + graceful fallback`.
═══ PROMPT END ═══

### M2-C10 — Impact & analytics APIs
**Meta:** owner M2 · branch `m2/c10-analytics` · depends M2-C8. Unblocks M1-C10/C11/C12.

═══ PROMPT START ═══
Implement analytics/impact endpoints for ecoVolt-finder.

**Think first (`docs/notes/M2-C10.md`):** the aggregates for each audience — driver impact (₹ saved, kg CO₂ avoided, avg renewable %), manager station analytics (utilization, revenue, renewable share, demand-charge exposure), admin network metrics (total load, aggregate renewable share, sessions shifted into green windows).

**Then build:** `GET /impact/me`, `GET /analytics/station/:id` (owner-scoped), `GET /analytics/network` (admin). Derive from sessions/bookings + greenness snapshots. Provide a **demand-charge risk** signal for managers (concurrent-load vs a configured peak threshold).

**Edge cases (#16,#22):** manager sees only their stations; demand-charge risk surfaced.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** endpoints return correct aggregates from seed + a few sessions; scoping enforced; `tsc` clean. Commit `M2-C10: impact + station + network analytics`.
═══ PROMPT END ═══

### M2-C11 — Notifications & incentives
**Meta:** owner M2 · branch `m2/c11-notify` · depends M2-C7/C8.

═══ PROMPT START ═══
Implement notifications/incentive nudges for ecoVolt-finder (structured, mockable).

**Think first (`docs/notes/M2-C11.md`):** the event triggers (green window starting, booking reminder, connector offline affecting a booking, session complete) and the delivery abstraction (Expo push token + email), kept behind an interface so it can run in a no-op mock mode for the demo.

**Then build:** a `notifications` module with a provider interface, an Expo-push implementation (store push token on the user), event hooks fired from booking/session modules, and a `GET /notifications` history. Default to mock/no-op unless configured.

**Edge cases (#7,#18):** the "your green window starts now" nudge is the automation incentive; connector-offline notifies affected bookings.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** events enqueue notifications in mock mode; history endpoint returns them; `tsc` clean. Commit `M2-C11: notifications + incentive nudges`.
═══ PROMPT END ═══

### M2-C12 — Hardening, tests, seed & OpenAPI finalize
**Meta:** owner M2 · branch `m2/c12-harden` · depends all M2.

═══ PROMPT START ═══
Harden the ecoVolt-finder backend for the demo.

**Think first (`docs/notes/M2-C12.md`):** the validation/error taxonomy, the test matrix (auth, pricing formula, booking concurrency, session billing, scoping), the demo seed script, and the security checklist (helmet, cors allowlist, rate limits, no secret leakage).

**Then build:** complete `zod` validation coverage + a documented error-code catalog; `jest`+`supertest` tests for the matrix above (must include the booking concurrency test and the pricing-formula test); a one-command **demo seed** producing a coherent Indian dataset (providers, stations across zones, a booked + a completed session); finalize `/docs` OpenAPI to match `/contracts/openapi.node.yaml`; add a `README` run guide.

**Do NOT touch:** `/app`, `/ml`. **Acceptance:** `npm test` green; demo seed yields a working end-to-end story; OpenAPI matches contract; `tsc` clean. Commit `M2-C12: validation + tests + demo seed + openapi finalize`.
═══ PROMPT END ═══

---

# MEMBER 3 — ML / Data / Maps & Optimization (Python + FastAPI) · Chunks M3-C1 → M3-C12

> Owns `/ml`. Exposes `openapi.ml.yaml` (consumed by Member 2 over HTTP). Commit realistic sample responses to `/contracts/examples/` on day 1 so Members 1 & 2 aren't blocked. A single `GRID_MODE=live|mock|hybrid` env flag governs data behavior.

### M3-C1 — Python service bootstrap
**Meta:** owner M3 · branch `m3/c1-bootstrap` · depends `/contracts`.

═══ PROMPT START ═══
Set up the **ecoVolt-finder** ML/data service in `/ml`: Python + FastAPI.

**Think first (`docs/notes/M3-C1.md`, then stop):** the package layout (`ingestion/`, `classify/`, `forecast/`, `pricing/`, `routing/`, `recommend/`), the config/env approach, the exact endpoint list from `openapi.ml.yaml`, and how `GRID_MODE` threads through the service.

**Then build:** a FastAPI app with routers stubbed for every `openapi.ml.yaml` endpoint (returning the `/contracts/examples` sample payloads for now), Pydantic models mirroring `/contracts/types.ts` (`GridSnapshot`, `ForecastPoint`, `StationRecommendation`, etc.), config from env, `GET /health`, CORS for the Node service, structured logging, `requirements.txt`, `Dockerfile`, `.env.example`, `.gitignore`. Commit the example JSON payloads to `/contracts/examples/` so M1/M2 can integrate immediately.

**Do NOT touch:** `/app`, `/server`. **Acceptance:** service boots; every endpoint returns a schema-valid sample; `/health` ok; `pytest` scaffold runs. Commit `M3-C1: fastapi bootstrap + stubbed contract endpoints + example payloads`.
═══ PROMPT END ═══

### M3-C2 — Hybrid grid data ingestion
**Meta:** owner M3 · branch `m3/c2-ingestion` · depends M3-C1.

═══ PROMPT START ═══
Build the **hybrid grid data layer** for ecoVolt-finder: real APIs with a mock fallback, behind one interface.

**Think first (`docs/notes/M3-C2.md`):** define a `GridSource` interface returning `GridSnapshot`; describe the Electricity Maps client (auth header, power-breakdown + carbon-intensity, India zone `IN`/sub-zones), the optional India Energy Atlas/Grid-India source, and the **mock generator** modeling Indian patterns (solar midday peak ~11–3, wind often stronger at night, seasonal shift). Specify the resolution order **live → cache → mock**, the cache TTL, retry/backoff, and how each result is tagged `DataQuality` (`live/cached/mock/stale`).

**Then build** `ingestion/`: `electricity_maps.py`, `india_atlas.py` (optional, stub if no clean API — document that honestly), `mock_generator.py`, and a `resolver.py` implementing the fallback order + caching + tagging, governed by `GRID_MODE`. Expose `GET /grid/live?zoneId` → `GridSnapshot`.

**Edge cases (#12,#21):** never crash on API failure — degrade to cache→mock and tag it; store timestamps in UTC (convert on display downstream).

**Do NOT touch:** `/app`, `/server`. **Acceptance:** with `GRID_MODE=mock`, `/grid/live` returns believable India-shaped data tagged `mock`; with `hybrid` and a forced API failure, it falls back to mock and tags it; `pytest` covers the fallback. Commit `M3-C2: hybrid grid ingestion + fallback + quality tags`.
═══ PROMPT END ═══

### M3-C3 — Renewable classification & zone mapping
**Meta:** owner M3 · branch `m3/c3-classify` · depends M3-C2.

═══ PROMPT START ═══
Build the **renewable classification** module for ecoVolt-finder.

**Think first (`docs/notes/M3-C3.md`):** write the taxonomy explicitly — RENEWABLE = {solar, wind, hydro, biomass, geothermal}; CARBON_FREE = RENEWABLE ∪ {nuclear}; FOSSIL = {coal, gas, oil, diesel}. State the hydro decision (hydro counts as renewable; single flag to flip). Define how `unknown/other` is handled (excluded from numerator; flagged `unclassified`, never guessed). Define `renewable_percentage`, `carbon_free_percentage`, and the `band` thresholds.

**Then build** `classify/`: `taxonomy.py` (the sets + config flag), `metrics.py` (`renewable_percentage(mix)`, `carbon_free_percentage(mix)`, `band(pct)`), and `zones.py` (station→zone lookup + a small station-zone table for the demo). Expose `POST /classify` (raw breakdown → percentages + band). Wire these into `GET /grid/live` so `GridSnapshot` carries correct percentages.

**Edge cases (#3,#4,#5,#6):** zone-level not station-level; renewable ≠ carbon-free; documented hydro convention; unknown excluded/flagged.

**Do NOT touch:** `/app`, `/server`. **Acceptance:** unit tests on known mixes (incl. an unknown-heavy mix and a nuclear-heavy mix) return expected percentages/bands; `pytest` green. Commit `M3-C3: renewable classification + zone mapping`.
═══ PROMPT END ═══

### M3-C4 — Historical store & feature engineering
**Meta:** owner M3 · branch `m3/c4-features` · depends M3-C2/C3.

═══ PROMPT START ═══
Build historical storage + features for forecasting in ecoVolt-finder.

**Think first (`docs/notes/M3-C4.md`):** the historical schema (per zone, timestamped renewable% + carbon intensity), resampling to 15-min/hourly, the feature set (hour-of-day, day-of-week, month/season, lag features, rolling means), **IST** handling (store UTC, feature on IST local hour), and the train/test split for backtesting.

**Then build** `forecast/data.py` (load/store history — from the API where available, else a committed CSV of realistic Indian-shaped history for the demo) and `forecast/features.py` (the feature builders). Ensure timezone conversion UTC→IST is centralized and tested.

**Edge cases (#21):** correct IST conversion; no leakage between train/test.

**Do NOT touch:** `/app`, `/server`. **Acceptance:** feature frame builds from the demo history; IST conversion unit-tested; `pytest` green. Commit `M3-C4: historical store + feature engineering (IST)`.
═══ PROMPT END ═══

### M3-C5 — Forecasting model
**Meta:** owner M3 · branch `m3/c5-forecast` · depends M3-C4. Unblocks M1-C5, M2-C9.

═══ PROMPT START ═══
Build the **renewable-% forecaster** for ecoVolt-finder — baseline first, fancy only if time allows.

**Think first (`docs/notes/M3-C5.md`):** define the **baseline** first (average renewable% by hour-of-day × season) and why it's legitimate; then the optional upgrade (Prophet or XGBoost) behind the same interface; the **confidence** derivation (e.g., from historical variance in that hour/season bucket); the backtest metrics (MAE/MAPE) and how you validate against held-out history.

**Then build** `forecast/model.py` with a `Forecaster` interface: `fit(history)`, `predict(zoneId, hours)` → `ForecastPoint[]` (each with `renewablePct`, `carbonIntensity`, `confidence` 0..1, IST hour). Implement the baseline; add the optional model behind a flag; persist a small demo model. Expose `GET /grid/forecast?zoneId&hours=24`. Backtest and write metrics to `docs/notes/M3-C5-metrics.md`.

**Edge cases (#13):** every point carries a real confidence; low-confidence points are flagged so the UI can grey them; never present a guess as certainty.

**Do NOT touch:** `/app`, `/server`. **Acceptance:** forecast returns 24 IST-hour points with confidence; backtest MAE reported vs the naive baseline; `pytest` green. Commit `M3-C5: renewable forecaster + confidence + backtest`.
═══ PROMPT END ═══

### M3-C6 — Cost/greenness time-slot estimator
**Meta:** owner M3 · branch `m3/c6-windows` · depends M3-C5. Unblocks M2-C6 (ToU proxy alignment).

═══ PROMPT START ═══
Build the per-hour **cost + greenness window** estimator for ecoVolt-finder.

**Think first (`docs/notes/M3-C6.md`):** how you combine forecast renewable% with a tariff to produce per-hour `{price, renewablePct, confidence}`; when price uses a published ToU tariff vs a **transparent modeled proxy** (mark `isEstimate`); and the "best window" selection given a duration.

**Then build** `pricing/windows.py`: `estimate_windows(zoneId, tariff, hours)` → per-hour estimates; `best_window(estimates, durationH, constraints)` → the greenest affordable window. Keep the proxy formula identical in spirit to Member 2's pricing engine so numbers agree; clamp to a floor; tag estimates. Expose `POST /estimate/windows`.

**Edge cases (#14):** estimate vs published clearly flagged; consistent with the backend pricing engine.

**Do NOT touch:** `/app`, `/server`. **Acceptance:** window estimates render for a demo zone/tariff; best-window respects duration + floor; `pytest` green. Commit `M3-C6: cost/greenness window estimator`.
═══ PROMPT END ═══

### M3-C7 — Google routing & distance
**Meta:** owner M3 · branch `m3/c7-routing` · depends M3-C1. Unblocks M1-C6, M2-C9.

═══ PROMPT START ═══
Build the **Google routing** module for ecoVolt-finder (server-side; key never ships in the app).

**Think first (`docs/notes/M3-C7.md`):** which Google API you'll call (Routes API `computeRouteMatrix`/`computeRoutes`, or legacy Distance Matrix + Directions), the request/response shapes you need (distance, duration, encoded polyline), the **caching** strategy, and how you keep quota/cost low by only matrixing the **nearest K** candidate stations (pre-filtered by haversine upstream).

**Then build** `routing/google.py`: `route_matrix(origin, stationCoords[])` → distances/times; `route(origin, dest)` → distance/time/polyline; `geocode(query)`; short-TTL caching; graceful error handling with a haversine-distance fallback (tagged as estimated) if Google is unavailable. Expose `POST /route/matrix`. Read `GOOGLE_SERVER_KEY` from env.

**Edge cases (#25,#26,#12):** server-side key only; cache + nearest-K to control cost; haversine fallback if the API fails.

**Do NOT touch:** `/app`, `/server`. **Acceptance:** matrix returns distances/times for demo coords (mock or live); fallback works with the key absent; `pytest` green. Commit `M3-C7: google routing + matrix + cache + fallback`.
═══ PROMPT END ═══

### M3-C8 — Travel-cost & range model (bike vs car)
**Meta:** owner M3 · branch `m3/c8-travel-cost` · depends M3-C7.

═══ PROMPT START ═══
Build the **travel-cost + range** model for ecoVolt-finder — the core of the cheaper-but-farther loophole.

**Think first (`docs/notes/M3-C8.md`):** write the math in plain text first. Travel energy = distanceKm × efficiency(Wh/km, per vehicle class) → kWh; travel cost ₹ = travel energy × a reference ₹/kWh (origin/home tariff or a config default). Range check: reachable if `(charge_pct/100 × capacity_kwh) / efficiency ≥ distanceKm × safetyFactor`. Note how bike vs car differ (efficiency, typical range) and how a return trip is/isn't counted.

**Then build** `recommend/travel.py`: `travel_cost(distanceKm, vehicle, refRate)` and `is_reachable(distanceKm, vehicle, safetyFactor)`, with per-class defaults and clear units. Unit-test with a car and a bike over the same distance to show the cost/range difference.

**Edge cases (#1,#9,#11):** vehicle-class-aware cost + range; safety margin on reachability; documented assumptions.

**Do NOT touch:** `/app`, `/server`. **Acceptance:** tests show bike vs car diverge as expected; unreachable flagged correctly at a boundary distance; `pytest` green. Commit `M3-C8: travel-cost + range model`.
═══ PROMPT END ═══

### M3-C9 — Recommendation & ranking engine (the brain)
**Meta:** owner M3 · branch `m3/c9-recommend` · depends M3-C3/C6/C7/C8. Unblocks M1-C4/C5/C6, M2-C9.

═══ PROMPT START ═══
Build the **recommendation engine** for ecoVolt-finder — rank stations by true total cost, not sticker price.

**Think first (`docs/notes/M3-C9.md`):** write the scoring in plain text. For each candidate station: `chargingCost = finalPrice × energyNeeded`; `travelCost` from M3-C8; `trueTotalCost = chargingCost + travelCost`; plus a small time penalty option. Filters: `connectorCompatible`, `reachable`. Also compute `vsCheapestSticker` (₹ difference vs the naive cheapest-₹/kWh pick) to expose the trap, and a plain-language `reason`. Describe how greenness and availability influence a tie-break or a blended score, and make weights configurable.

**Then build** `recommend/engine.py`: `recommend(origin, vehicle, kwh, candidateStations[])` → `StationRecommendation[]` sorted by `trueTotalCost` (respecting filters), each with the fields in `/contracts/types.ts` and a human `reason`. Pull greenness/forecast from classify/forecast, distances from routing, price from the estimator (or accept prices passed in by Member 2). Expose `POST /recommend`.

**Edge cases (#1,#8,#9,#10,#26):** rank on true total cost; never recommend unreachable/incompatible stations (mark them, don't rank them); expose the sticker-trap delta; operate on the nearest-K only.

**Do NOT touch:** `/app`, `/server`. **Acceptance:** a scenario test where the cheapest-₹/kWh station is NOT the recommendation because travel cost flips it; unreachable/incompatible excluded; `reason` strings are sensible; `pytest` green. Commit `M3-C9: net-benefit recommendation engine`.
═══ PROMPT END ═══

### M3-C10 — Smart-charge optimizer
**Meta:** owner M3 · branch `m3/c10-smartcharge` · depends M3-C5/C6. Unblocks M1-C8, M2-C7.

═══ PROMPT START ═══
Build the **smart-charge optimizer** for ecoVolt-finder — the automation incentive ("why would a driver wait").

**Think first (`docs/notes/M3-C10.md`):** the inputs (deadline, min charge needed, charge rate/kW, urgent flag) and the objective: pick a start window that maximizes expected renewable% (and/or minimizes cost) while finishing before the deadline; respect a per-station concurrency hint to avoid peak stacking. Describe the urgent short-circuit (charge now, skip optimization) and how you present the payoff (₹ saved + renewable% gained + finish time).

**Then build** `recommend/smartcharge.py`: `plan(constraints, windows)` → `{startLocal, endLocal, expectedRenewablePct, expectedSavings, confidence}` or an immediate plan when urgent. Expose `POST /smartcharge/plan`.

**Edge cases (#7,#8,#16):** urgent override; feasibility (if deadline can't be met, return the best feasible plan + a clear note); avoid recommending everyone into the exact same peak slot.

**Do NOT touch:** `/app`, `/server`. **Acceptance:** for a demo forecast, the plan lands in a high-renewable window before the deadline; urgent returns an immediate plan; infeasible deadline handled; `pytest` green. Commit `M3-C10: smart-charge optimizer`.
═══ PROMPT END ═══

### M3-C11 — Validation, guardrails & explainability
**Meta:** owner M3 · branch `m3/c11-validation` · depends M3-C5/C9/C10.

═══ PROMPT START ═══
Add validation + guardrails + explainability across the ecoVolt-finder ML service.

**Think first (`docs/notes/M3-C11.md`):** list the guardrails as assertions — never rank an unreachable/incompatible station; never emit a confidence outside [0,1]; never present a `mock`/low-confidence value without its tag; recommendation `reason` must reference the actual deciding factor. List the backtests/metrics you'll expose for the pitch.

**Then build:** a `guardrails.py` with runtime checks + a test suite exercising them; a small `/metrics` or a `docs/notes/M3-C11-metrics.md` summarizing forecaster accuracy vs baseline and a few recommendation scenarios; a **deterministic mock mode** (seeded RNG) so demos are reproducible.

**Edge cases (#4,#6,#9,#10,#13):** all the above encoded as tests.

**Do NOT touch:** `/app`, `/server`. **Acceptance:** guardrail tests fail loudly if a bad recommendation is constructed; mock mode is reproducible across runs; `pytest` green. Commit `M3-C11: guardrails + validation + explainability`.
═══ PROMPT END ═══

### M3-C12 — Packaging, demo data & integration finalize
**Meta:** owner M3 · branch `m3/c12-package` · depends all M3; coordinates with M2-C9.

═══ PROMPT START ═══
Finalize the ecoVolt-finder ML service for integration + demo.

**Think first (`docs/notes/M3-C12.md`):** confirm every `openapi.ml.yaml` endpoint's live response matches the committed `/contracts/examples`; list the demo dataset you'll ship (Indian-shaped grid history + a station-zone table + seeded forecasts) so the whole app tells a coherent story offline; and the run/README steps.

**Then build:** finalize all endpoints against the contract; ship the offline demo dataset + a seeded model; confirm `GRID_MODE=mock` gives a fully self-contained, reproducible demo; Dockerize; write `/ml/README.md`; do a joint smoke test with Member 2's `mlClient` (over HTTP) and fix any shape mismatches in `/contracts` via a reviewed PR.

**Do NOT touch:** `/app`, `/server` internals (integrate over HTTP + `/contracts` only). **Acceptance:** Node's `mlClient` calls all endpoints successfully in `hybrid` and `mock` modes; example payloads match live shapes; `pytest` green. Commit `M3-C12: packaging + demo data + integration finalize`.
═══ PROMPT END ═══

---

## 11. Build sequencing (parallel tracks + dependency graph)

Everyone starts at hour zero because the app builds against `/contracts/examples`. Real wiring happens as services come online.

**Phase 0 — together (before splitting):** co-author `/contracts` (§5). Members 2 & 3 drop mock example payloads for every endpoint. This unblocks everything.

**Phase 1 — foundations (parallel):** M1-C1 → M1-C2 · M2-C1 → M2-C2 → M2-C3 · M3-C1 → M3-C2 → M3-C3.

**Phase 2 — core features (parallel):**
- M1: C3 (auth) → C4 (map) → C5 (detail) → C7 (vehicles).
- M2: C4 (vehicles) → C5 (stations) → C6 (pricing) → C7 (bookings).
- M3: C4 (features) → C5 (forecast) → C7 (routing) → C8 (travel-cost).

**Phase 3 — the brain + the loop (parallel):**
- M3: C6 (windows) → C9 (recommendation) → C10 (smart-charge).
- M2: C8 (sessions) → C9 (integration to ML/Google) → C10 (analytics).
- M1: C6 (route compare) → C8 (scheduling) → C9 (session) → C10 (impact) → C11 (manager).

**Phase 4 — hardening & polish (parallel):** M1-C12 · M2-C11, M2-C12 · M3-C11, M3-C12. Then merge `develop` → `main` and rehearse the demo.

**Key cross-member unblocks:**
- M2-C3 (auth) unblocks M1-C3.
- M2-C5/C6 unblock M1-C4/C5 real data.
- M3-C5 (forecast) unblocks M1-C5 forecast strip + M2-C9 proxy.
- M3-C9 (recommend) unblocks M1-C6 true-cost compare + M2-C9.
- M3-C10 (smart-charge) unblocks M1-C8 + M2-C7 scheduling nudges.

```
Dependency spine (left unblocks right):
contracts ─┬─ M2: bootstrap→schema→auth→stations→pricing→bookings→sessions→integration→analytics
           ├─ M3: bootstrap→ingestion→classify→features→forecast→windows→routing→travel→recommend→smartcharge
           └─ M1: bootstrap→design→auth→map→detail→vehicles→route→schedule→session→impact→manager→admin
                          (M1 always has mocks, so it never stalls)
```

---

## 12. Demo-day checklist (what makes judges believe it)

- **The loop, on screen:** driver opens a station → sees live greenness + a cheaper/greener window → taps Smart charge → sees "save ₹34, +46% renewable, done by 2:40pm" → charger executes the delay. That's the whole pitch in 20 seconds.
- **The honest edge case:** show a station that's cheaper per-kWh but loses once travel is added — the `TrueCostCard` exposing `vsCheapestSticker` is the "we thought about this" moment.
- **Real data, safely:** run `GRID_MODE=hybrid`; if venue wifi dies, the mock tag appears but nothing breaks. Say out loud which numbers are live vs modeled — judges reward the honesty.
- **Multi-provider pricing:** show two stations on different providers (Torrent vs GB) with different base tariffs + manager markups resolving to different final prices.
- **Rigor signals:** renewable vs carbon-free kept distinct; forecast confidence shown; estimates labeled; unknown generation flagged.

---

## Appendix — reusable "think-first" preamble

If you want to enforce the reason-before-code behavior even more strongly, prepend this to any chunk:

> Before writing any code, write a design note to `docs/notes/<CHUNK-ID>.md` covering: (1) the modules and sub-modules you'll create and each one's single responsibility; (2) the exact files and their public function/type signatures; (3) the data shapes in/out, referencing `/contracts`; (4) the edge cases from §8 this chunk owns and how each is handled; (5) your self-test plan. Then STOP and wait for my approval of the note. Do not write feature code until I reply "approved". After approval, implement exactly what the note describes; if you discover the note was wrong, update the note first, then the code.

*End of playbook.*








