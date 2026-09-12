/**
 * lib/gridData.ts
 * ────────────────────────────────────────────────────────────
 * Client-side mock for GridSnapshot + ForecastPoint data.
 * Mirrors the ML service's mock_generator.py logic so the UI
 * never needs the real ML service running for demos.
 *
 * Indian grid patterns:
 *  - Solar: cosine peak at 13:00 IST, zero before 6am / after 7pm
 *  - Wind: higher at night (20–06 IST)
 *  - Coal: backbone, always ≥35% of total
 *  - Nuclear: steady ~5–8%
 *  - Hydro: season-aware (July–Sep monsoon = higher)
 *
 * Zone differentiation:
 *  IN-WE → solar-heavy (Gujarat), IN-SO → wind-heavy (Tamil Nadu coast)
 *  IN-NE → hydro-heavy,           IN-NO → coal-heavy (Delhi/UP)
 */

export type GreennessBand = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'AMBER' | 'LOW' | 'VERY_LOW';
export type DataQuality = 'live' | 'cached' | 'forecast' | 'mock' | 'stale';

export interface GridBreakdown {
  solar: number;
  wind: number;
  hydro: number;
  nuclear: number;
  biomass: number;
  coal: number;
  gas: number;
  unknown: number;
}

export interface GridSnapshot {
  zoneId: string;
  at: string;           // ISO8601 UTC
  renewablePct: number; // 0-100 (excludes nuclear)
  carbonFreePct: number;// 0-100 (includes nuclear)
  carbonIntensity: number; // gCO2eq/kWh
  band: GreennessBand;
  breakdown: GridBreakdown;
  quality: DataQuality;
  asOfAgeSec: number;
  zoneName: string;
}

export interface ForecastPoint {
  hourIST: number;      // 0-23
  label: string;        // "1 PM"
  renewablePct: number;
  carbonIntensity: number;
  confidence: number;   // 0-1
  isRecommended: boolean;
}

export interface PriceQuote {
  baseTariff: number;       // ₹/kWh - provider tariff
  providerMarkup: number;   // ₹/kWh - station operator margin
  touAdjustment: number;    // ₹/kWh - dynamic green/peak adj (can be negative)
  finalPrice: number;       // ₹/kWh sum
  isEstimate: boolean;
  currency: 'INR';
  provider: string;
  validUntilMin: number;    // minutes until price expires
}

// ─── Greenness color scale (6 stops, per design system) ──────────────────────

export function greennessColor(pct: number): string {
  if (pct >= 80) return '#0E8E4F'; // deep emerald - VERY_HIGH
  if (pct >= 65) return '#3DAE5F'; // HIGH
  if (pct >= 50) return '#8FB93B'; // MEDIUM (yellow-green)
  if (pct >= 35) return '#E0A81E'; // AMBER
  if (pct >= 20) return '#E2732B'; // LOW (orange)
  return '#C8442E';                // VERY_LOW (clay red)
}

export function greennessBand(pct: number): GreennessBand {
  if (pct >= 80) return 'VERY_HIGH';
  if (pct >= 65) return 'HIGH';
  if (pct >= 50) return 'MEDIUM';
  if (pct >= 35) return 'AMBER';
  if (pct >= 20) return 'LOW';
  return 'VERY_LOW';
}

export function greennessBandLabel(band: GreennessBand): string {
  const labels: Record<GreennessBand, string> = {
    VERY_HIGH: 'Very High',
    HIGH: 'High',
    MEDIUM: 'Medium',
    AMBER: 'Moderate',
    LOW: 'Low',
    VERY_LOW: 'Very Low',
  };
  return labels[band];
}

// ─── Zone mapping ─────────────────────────────────────────────────────────────

const ZONE_NAMES: Record<string, string> = {
  'IN':    'India (National)',
  'IN-WE': 'West India · Gujarat',
  'IN-SO': 'South India · Tamil Nadu',
  'IN-NO': 'North India · Delhi/UP',
  'IN-EA': 'East India · West Bengal',
  'IN-NE': 'North-East India',
};

const ZONE_PROFILES: Record<string, { solar: number; wind: number; hydro: number; coal: number; nuclear: number }> = {
  'IN':    { solar: 1.0, wind: 1.0, hydro: 1.0, coal: 1.0, nuclear: 1.0 },
  'IN-WE': { solar: 1.6, wind: 0.9, hydro: 0.7, coal: 0.8, nuclear: 1.1 }, // Gujarat solar parks
  'IN-SO': { solar: 1.2, wind: 1.8, hydro: 1.0, coal: 0.7, nuclear: 0.9 }, // Tamil Nadu / AP coast
  'IN-NO': { solar: 0.9, wind: 0.8, hydro: 0.8, coal: 1.4, nuclear: 0.8 }, // Delhi/UP thermal
  'IN-EA': { solar: 0.8, wind: 0.7, hydro: 1.2, coal: 1.3, nuclear: 0.5 },
  'IN-NE': { solar: 0.7, wind: 0.6, hydro: 2.5, coal: 0.3, nuclear: 0.0 },
};

// Seasonal hydro multiplier
const HYDRO_SEASON: Record<number, number> = {
  1: 0.85, 2: 0.80, 3: 0.70, 4: 0.65, 5: 0.60,
  6: 0.80, 7: 1.20, 8: 1.35, 9: 1.25, 10: 1.00,
  11: 0.90, 12: 0.88,
};

const NATIONAL_TOTAL_MW = 17000;
const CARBON_BASE = 620; // gCO2eq/kWh at baseline

// Simple seeded pseudo-random (deterministic per hour + zone)
function seededJitter(seed: number, pct: number): number {
  const x = Math.sin(seed) * 10000;
  const r = x - Math.floor(x); // 0-1
  return 1.0 + (r * 2 - 1) * pct;
}

// ─── Core generator ───────────────────────────────────────────────────────────

function generateForHour(zoneId: string, istHour: number, monthNum: number, seed: number): {
  breakdown: GridBreakdown;
  renewablePct: number;
  carbonFreePct: number;
  carbonIntensity: number;
  band: GreennessBand;
} {
  const profile = ZONE_PROFILES[zoneId] ?? ZONE_PROFILES['IN'];
  const total = NATIONAL_TOTAL_MW;

  // Solar: cosine peak at 13:00 IST
  const solarActive = istHour >= 6 && istHour <= 19;
  const solarFactor = solarActive ? Math.max(0, Math.cos(Math.PI * (istHour - 13) / 7)) : 0;
  const solar = Math.max(0, Math.round(total * 0.18 * solarFactor * profile.solar * seededJitter(seed + 1, 0.08)));

  // Wind: stronger at night
  const windBoost = (istHour >= 20 || istHour <= 6) ? 1.3 : 0.85;
  const wind = Math.max(0, Math.round(total * 0.12 * windBoost * profile.wind * seededJitter(seed + 2, 0.12)));

  // Hydro: season-aware
  const hydroSeason = HYDRO_SEASON[monthNum] ?? 1.0;
  const hydro = Math.max(0, Math.round(total * 0.10 * hydroSeason * profile.hydro * seededJitter(seed + 3, 0.06)));

  // Nuclear: steady
  const nuclear = Math.max(0, Math.round(total * 0.06 * profile.nuclear * seededJitter(seed + 4, 0.02)));

  // Biomass: small steady
  const biomass = Math.max(0, Math.round(total * 0.015 * seededJitter(seed + 5, 0.05)));

  // Coal: residual balancer, always ≥35%
  const renewableSum = solar + wind + hydro + biomass;
  const carbonFreeSum = renewableSum + nuclear;
  const coalMin = total * 0.35 * profile.coal;
  const coal = Math.max(coalMin, (total - carbonFreeSum) * profile.coal * seededJitter(seed + 6, 0.05));

  // Gas & unknown
  const gas = Math.max(0, Math.round(total * 0.04 * seededJitter(seed + 7, 0.15)));
  const unknown = Math.max(0, Math.round(total * 0.012 * seededJitter(seed + 8, 0.20)));

  const breakdown: GridBreakdown = {
    solar,
    wind,
    hydro,
    nuclear,
    biomass,
    coal: Math.round(coal),
    gas,
    unknown,
  };

  const allTotal = solar + wind + hydro + nuclear + biomass + Math.round(coal) + gas + unknown;
  const renewablePct = allTotal > 0 ? Math.round(((solar + wind + hydro + biomass) / allTotal) * 100 * 10) / 10 : 0;
  const carbonFreePct = allTotal > 0 ? Math.round(((solar + wind + hydro + biomass + nuclear) / allTotal) * 100 * 10) / 10 : 0;
  const carbonIntensity = Math.round(CARBON_BASE * (1 - (renewablePct / 100) * 0.55) * seededJitter(seed + 9, 0.04));

  return {
    breakdown,
    renewablePct,
    carbonFreePct,
    carbonIntensity,
    band: greennessBand(renewablePct),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the current GridSnapshot for a zone.
 * zoneId defaults to 'IN-WE' (Gujarat/Western India) since that's where the demo stations are.
 */
export function getLiveGridSnapshot(zoneId: string = 'IN-WE'): GridSnapshot {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const istHour = (utcHour + 5.5) % 24;
  const month = now.getMonth() + 1;
  const seed = utcHour * 100 + zoneId.charCodeAt(0);

  const data = generateForHour(zoneId, istHour, month, seed);

  return {
    zoneId,
    at: now.toISOString(),
    ...data,
    quality: 'mock',
    asOfAgeSec: 0,
    zoneName: ZONE_NAMES[zoneId] ?? 'India',
  };
}

/**
 * Get 24h forecast for a zone.
 * Returns ForecastPoint[] for hours 0-23 IST.
 */
export function getGridForecast(zoneId: string = 'IN-WE'): ForecastPoint[] {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const currentISTHour = Math.floor((utcHour + 5.5) % 24);
  const month = now.getMonth() + 1;

  const points: ForecastPoint[] = [];
  let maxRenewable = 0;
  let bestHour = -1;

  for (let h = 0; h < 24; h++) {
    const seed = h * 100 + zoneId.charCodeAt(0) + 37;
    const data = generateForHour(zoneId, h, month, seed);
    // Confidence decreases the further from now
    const hourDiff = (h - currentISTHour + 24) % 24;
    const confidence = Math.max(0.4, 1 - hourDiff * 0.03);

    if (data.renewablePct > maxRenewable) {
      maxRenewable = data.renewablePct;
      bestHour = h;
    }

    const suffix = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    points.push({
      hourIST: h,
      label: `${h12} ${suffix}`,
      renewablePct: data.renewablePct,
      carbonIntensity: data.carbonIntensity,
      confidence,
      isRecommended: false,
    });
  }

  // Mark the best 2-hour window
  if (bestHour >= 0) {
    points[bestHour].isRecommended = true;
    const next = (bestHour + 1) % 24;
    points[next].isRecommended = true;
  }

  return points;
}

/**
 * Get dynamic price quote for a charger.
 * touAdjustment is negative (discount) during high-renewable hours.
 */
export function getDynamicPriceQuote(stationId: string, basePricePerKwh: number): PriceQuote {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const istHour = (utcHour + 5.5) % 24;
  const month = now.getMonth() + 1;
  const seed = utcHour * 100 + (stationId.charCodeAt(0) || 65);

  const data = generateForHour('IN-WE', istHour, month, seed);
  const renewablePct = data.renewablePct;

  // Markup: ~15-25% of base tariff
  const markup = Math.round(basePricePerKwh * 0.20 * 10) / 10;

  // ToU adjustment: discount during high renewable, premium during peak/low
  // Range: −₹1.5 (very clean) to +₹2.0 (peak/dirty)
  let touAdj = 0;
  if (renewablePct >= 65) touAdj = -Math.round((renewablePct - 50) * 0.04 * 10) / 10;
  else if (renewablePct < 35) touAdj = Math.round((50 - renewablePct) * 0.05 * 10) / 10;

  const finalPrice = Math.round((basePricePerKwh + markup + touAdj) * 10) / 10;

  // Provider based on station ID seed
  const providers = ['Torrent Power', 'GUVNL/GB', 'Adani Energy', 'Tata Power', 'BSES'];
  const providerIdx = (stationId.charCodeAt(stationId.length - 1) || 0) % providers.length;

  return {
    baseTariff: basePricePerKwh,
    providerMarkup: markup,
    touAdjustment: touAdj,
    finalPrice,
    isEstimate: true,
    currency: 'INR',
    provider: providers[providerIdx],
    validUntilMin: 15,
  };
}

/**
 * Get best charging window label for a zone.
 */
export function getBestChargingWindow(zoneId: string = 'IN-WE'): { label: string; renewablePct: number; savingsRs: number } {
  const forecast = getGridForecast(zoneId);
  const best = forecast.find(f => f.isRecommended);
  const current = forecast.find(f => f.hourIST === Math.floor((new Date().getUTCHours() + 5.5) % 24));
  const currentPct = current?.renewablePct ?? 40;
  const bestPct = best?.renewablePct ?? 60;

  const savings = Math.max(0, Math.round((bestPct - currentPct) * 0.1));

  return {
    label: best?.label ?? '1 PM',
    renewablePct: bestPct,
    savingsRs: savings,
  };
}
