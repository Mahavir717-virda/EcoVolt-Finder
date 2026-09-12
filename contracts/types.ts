// ──────────────────────────────────────────────────────────────
// /contracts/types.ts
// Core shared TypeScript types for ecoVolt-finder.
// ALL THREE MEMBERS import from here — never duplicate locally.
// Changes require a review from all 3 members before merge.
// ──────────────────────────────────────────────────────────────

import type {
  ConnectorType,
  DataQuality,
  GreennessBand,
  PowerProvider,
  SessionStatus,
  VehicleClass,
} from './enums'

// ─── Primitives ──────────────────────────────────────────────

export interface GeoPoint {
  lat: number
  lng: number
}

// ─── Grid / Greenness ────────────────────────────────────────

/**
 * A single snapshot of grid greenness for a zone.
 * Returned by GET /grid/live and embedded in station summaries.
 *
 * Edge-case notes:
 *  • renewablePct ≠ carbonFreePct  (nuclear is carbon-free but NOT renewable)
 *  • 'unknown' in breakdown is excluded from the numerator (never silently guessed)
 *  • quality tag is always shown to the user
 */
export interface GridSnapshot {
  /** Grid zone identifier, e.g. "IN" or "IN-WE" */
  zoneId:          string
  /** ISO 8601 UTC timestamp of this reading */
  at:              string
  /** 0–100: renewable (solar + wind + hydro + biomass + geo) */
  renewablePct:    number
  /** 0–100: renewable + nuclear (carbon-free, not the same as renewable) */
  carbonFreePct:   number
  /** gCO₂eq/kWh */
  carbonIntensity: number
  band:            GreennessBand
  /**
   * Raw fuel-mix breakdown by source.
   * Keys match Electricity Maps breakdown keys: solar, wind, hydro, nuclear,
   * coal, gas, oil, biomass, geothermal, unknown, etc.
   * Values are MW or % depending on the source — normalise before using.
   */
  breakdown:       Record<string, number>
  quality:         DataQuality
  /** How old this reading is in seconds */
  asOfAgeSec:      number
}

// ─── Forecast ────────────────────────────────────────────────

/**
 * A single point in a 24-hour renewable forecast.
 * confidence ∈ [0,1] — low-confidence points are greyed in the UI.
 * hourStartLocal is IST ISO-8601 (e.g. "2026-09-12T14:00:00+05:30").
 */
export interface ForecastPoint {
  hourStartLocal:  string
  renewablePct:    number
  carbonIntensity: number
  /** 0..1 — never omit; UI uses this to show/hide/grey the point */
  confidence:      number
}

// ─── Pricing ─────────────────────────────────────────────────

/**
 * A quoted price for a charging session at a specific connector.
 *
 * Edge-case notes:
 *  • finalPrice = baseTariff + providerMarkup + touAdjustment
 *  • isEstimate = true when any component is modelled, not published
 *  • validUntil = price-lock expiry — session must start before this time
 */
export interface PriceQuote {
  stationId:       string
  connectorType:   ConnectorType
  /** Provider's published (or modelled) base tariff, ₹/kWh */
  baseTariff:      number
  /** Manager's service-provider markup, ₹/kWh (cannot be negative) */
  providerMarkup:  number
  /**
   * Time-of-use / greenness adjustment, ₹/kWh.
   * Negative = green discount. Bounded so finalPrice ≥ floor.
   */
  touAdjustment:   number
  /** ₹/kWh — what the driver pays */
  finalPrice:      number
  /** true when baseTariff or touAdjustment is a transparent model proxy, not a published tariff */
  isEstimate:      boolean
  currency:        'INR'
  /** ISO 8601 UTC — the price is locked until this time */
  validUntil:      string
}

// ─── Stations ────────────────────────────────────────────────

export interface ConnectorInfo {
  type:      ConnectorType
  /** kW */
  powerKw:   number
  available: number
  total:     number
}

/**
 * Lightweight station card — used in the station list and map pins.
 * Full detail (connectors, pricing, operator info) is fetched separately.
 */
export interface StationSummary {
  id:           string
  name:         string
  location:     GeoPoint
  operatorName: string
  provider:     PowerProvider
  connectors:   ConnectorInfo[]
  greenness: {
    renewablePct: number
    band:         GreennessBand
    quality:      DataQuality
  }
  /** Cheapest connector final price ₹/kWh */
  priceFrom:    number
}

// ─── Recommendation ──────────────────────────────────────────

/**
 * The brain's output for a single candidate station.
 *
 * THE KEY EDGE CASE: ranking is on trueTotalCost, not sticker ₹/kWh.
 * A station that looks cheaper per-kWh but is farther away may rank lower
 * once travelCost is added. vsCheapestSticker exposes this trap to the user.
 *
 * reachable = false stations are shown greyed / excluded from ranking.
 * connectorCompatible = false stations are hidden by default.
 */
export interface StationRecommendation {
  station?:            StationSummary
  stationId?:          string
  distanceKm:          number
  travelMinutes:       number
  energyNeededKwh:     number
  /** ₹ = finalPrice × energyNeededKwh */
  chargingCost:        number
  /** ₹ — from vehicle travel-cost model */
  travelCost:          number
  /** chargingCost + travelCost — the ranking key */
  trueTotalCost:       number
  /** ₹ saved (positive) or lost (negative) vs naive "cheapest ₹/kWh" pick */
  vsCheapestSticker:   number
  reachable:           boolean
  connectorCompatible: boolean
  /** The optimal charging window if smart-charge is available */
  recommendedWindow?: {
    startLocal:    string
    endLocal:      string
    renewablePct:  number
    /** 0..1 */
    confidence:    number
  }
  /** Plain-language explanation the UI shows the driver */
  reason:              string
}

// ─── Vehicles ────────────────────────────────────────────────

export interface Vehicle {
  id:             string
  userId:         string
  vehicleClass:   VehicleClass
  /** Optional: "Tata Nexon EV" */
  model?:         string
  batteryKwh:     number
  efficiencyWhKm: number
  connectors:     ConnectorType[]
  /** 0–100 */
  currentChargePct: number
}

// ─── Sessions ────────────────────────────────────────────────

export interface Session {
  id:               string
  bookingId:        string
  stationId:        string
  connectorType:    ConnectorType
  vehicleId:        string
  userId:           string
  status:           SessionStatus
  startedAt?:       string
  endedAt?:         string
  energyKwh?:       number
  /** ₹ — always computed from the LOCKED price at booking time */
  cost?:            number
  /** 0–100, average renewable % achieved during the session */
  avgRenewablePct?: number
  /** kg CO₂ avoided vs grid-average carbon intensity */
  co2AvoidedKg?:   number
}

// ─── Impact / Analytics ──────────────────────────────────────

export interface DriverImpact {
  userId:          string
  totalSessions:   number
  totalKwh:        number
  totalSpent:      number
  savedVsSticker:  number
  co2AvoidedKg:   number
  avgRenewablePct: number
}

// ─── Gamification & Leaderboard ───────────────────────────────

export type GreenTier = 'Eco Sprout' | 'Solar Cruiser' | 'Green Pioneer' | 'Net-Zero Champion'

export interface Badge {
  id:          string
  title:       string
  description: string
  icon:        string
  unlocked:    boolean
  progress:    number // 0..100
  unlockedAt?: string
}

export interface LeaderboardEntry {
  rank:          number
  userId:        string
  name:          string
  avatarInitial: string
  tier:          GreenTier
  tierColor:     string
  greenScore:    number
  co2AvoidedKg:  number
  cleanKwh:      number
  greenStreak:   number
  isCurrentUser: boolean
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[]
  currentUserRank: {
    rank:              number
    totalUsers:        number
    pointsToNextRank:  number
    nextRankUser?:     string
  }
}

export interface GamificationProfile {
  userId:             string
  name:               string
  avatarInitial:      string
  greenScore:         number
  tier:               GreenTier
  tierColor:          string
  currentStreak:      number
  longestStreak:      number
  streakBonusPct:     number
  co2AvoidedKg:       number
  cleanKwh:           number
  totalSessions:      number
  treesEquivalent:    number
  cleanKmDriven:      number
  ledHoursPowered:    number
  badges:             Badge[]
  rank:               number
  totalUsers:         number
  pointsToNextTier:   number
  nextTier?:          GreenTier
  shareableSummary:   string
}

