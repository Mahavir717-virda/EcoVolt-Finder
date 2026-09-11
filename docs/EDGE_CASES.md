# ecoVolt-finder — Edge Cases Catalog

Mirror of §8 in the build playbook. Each chunk re-states the edge cases it owns.
**Owner of any change to this file: all three members must approve.**

| # | Loophole / Edge Case | Concrete Solution | Owner Chunk(s) |
|---|---|---|---|
| 1 | **Cheaper-but-farther station** — ₹10/kWh saving eaten by >₹10 of travel | Rank by **trueTotalCost = chargingCost + travelCost**, never by sticker ₹/kWh. Show `vsCheapestSticker` so the driver sees the trap. | M3-C8, M3-C9; shown by M1-C6 |
| 2 | **Different providers, different pricing** (Torrent vs GB vs Adani…) | Pricing engine = `baseTariff(provider)` + `providerMarkup(manager)` + `touAdjustment`. Manager enters base + markup per station/connector; provider is a first-class field. | M2-C6; UI M1-C11 |
| 3 | **Greenness isn't measurable per station** | Classify per **grid zone**, map each station→zone (state/DISCOM). UI always labels it as the zone's live value, never "this plug." | M3-C2, M3-C3 |
| 4 | **Renewable vs carbon-free conflation** (nuclear) | Two separate numbers: `renewablePct` and `carbonFreePct`. UI never mixes the terms. | M3-C3 |
| 5 | **Large-hydro classification debate** | Hydro = renewable (documented convention); single flag to flip. | M3-C3 |
| 6 | **"unknown/other" generation in the mix** | Excluded from numerator; kept in denominator only if source includes it, else flagged `unclassified`; never silently guessed. | M3-C3 |
| 7 | **Why would a driver wait?** | Two real incentives: **price** (ToU/green discount) + **automation** (smart-charge schedules the delay). Payoff shown in ₹ and %. | M3-C10; M1-C8 |
| 8 | **Driver needs charge NOW** | Urgent override always available; recommendation still shows the tradeoff it's skipping. | M1-C5/C8; M3-C9 |
| 9 | **Vehicle can't reach the station** (range) | `reachable` computed from current charge %, capacity, efficiency, distance. Unreachable stations filtered or clearly marked. | M3-C8; M1-C4 |
| 10 | **Wrong connector** | `connectorCompatible` filter from vehicle's connector set; incompatible hidden by default, shown greyed with reason. | M2-C5, M3-C9; M1-C4 |
| 11 | **Bike vs car cost/range differ** | Vehicle model carries class + Wh/km; travel-cost and range use it. Defaults per class, user-editable. | M1-C7; M3-C8 |
| 12 | **Grid API down / rate-limited / no wifi** | Hybrid data layer: try live → cache → mock; every value tagged `DataQuality`; UI shows "cached/mock" honestly. Demo never white-screens. | M3-C2 |
| 13 | **Forecast presented as certainty** | Every forecast carries `confidence` (0..1); UI shows confidence, hides/greys low-confidence windows. | M3-C5; M1-C5 |
| 14 | **No published ToU tariff for a DISCOM** | Transparent modelled proxy `base × (1 − renewablePct·k)`, `isEstimate=true`, UI tags it "estimate". | M3-C6, M2-C6 |
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
