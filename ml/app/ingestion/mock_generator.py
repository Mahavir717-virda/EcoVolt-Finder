"""
app/ingestion/mock_generator.py
────────────────────────────────
Deterministic mock generator modeling Indian grid patterns.

Uses seeded random so demos are reproducible (MOCK_SEED=42).
Never calls external APIs — safe for offline development and tests.

Indian grid patterns encoded:
  • Solar: cosine peak at 13:00 IST (07:30 UTC), zero before 06:00/after 19:00 IST
  • Wind:  higher at night (20:00–06:00 IST), lower midday; zone-biased (south = stronger)
  • Coal:  backbone — always ≥35% of total
  • Nuclear: steady ~5–8%
  • Hydro: season-aware (Jul–Sep monsoon = higher, Mar–May pre-monsoon = lower)
  • Zone differentiation:
      IN-WE  → solar-heavy (Gujarat solar parks)
      IN-SO  → wind-heavy  (TN/AP coast, Karnataka hills)
      IN-NE  → hydro-heavy (North-East rivers)
      IN-NO  → coal-heavy  (UP/Delhi/Bihar thermal plants)
      IN-EA  → coal+hydro mix
      IN    → national average

Output quality tag: always "mock". asOfAgeSec = 0.
"""
from __future__ import annotations

import math
import random
from datetime import datetime, timezone

from app.ingestion.base import IngestionError
from app.ingestion.greenness import band_from_pct, compute_pcts
from app.models import GridSnapshot

IST_OFFSET_H = 5.5   # UTC + 5:30

# ── Zone characteristics (multipliers, 1.0 = national average) ────────────────

_ZONE_PROFILE: dict[str, dict[str, float]] = {
    "IN":    {"solar": 1.0, "wind": 1.0, "hydro": 1.0, "coal": 1.0, "nuclear": 1.0},
    "IN-WE": {"solar": 1.6, "wind": 0.9, "hydro": 0.7, "coal": 0.8, "nuclear": 1.1},
    "IN-SO": {"solar": 1.2, "wind": 1.8, "hydro": 1.0, "coal": 0.7, "nuclear": 0.9},
    "IN-NO": {"solar": 0.9, "wind": 0.8, "hydro": 0.8, "coal": 1.4, "nuclear": 0.8},
    "IN-EA": {"solar": 0.8, "wind": 0.7, "hydro": 1.2, "coal": 1.3, "nuclear": 0.5},
    "IN-NE": {"solar": 0.7, "wind": 0.6, "hydro": 2.5, "coal": 0.3, "nuclear": 0.0},
}
_DEFAULT_PROFILE = _ZONE_PROFILE["IN"]

# ── Seasonal hydro multiplier (month 1–12) ────────────────────────────────────
# Monsoon Jul–Sep = peak; pre-monsoon Mar–May = trough
_HYDRO_SEASON = {
    1: 0.85, 2: 0.80, 3: 0.70, 4: 0.65, 5: 0.60,
    6: 0.80, 7: 1.20, 8: 1.35, 9: 1.25, 10: 1.00,
    11: 0.90, 12: 0.88,
}

# ── National baseline capacity (MW) — basis for breakdowns ───────────────────
_NATIONAL_TOTAL_MW = 17_000.0

# GHG intensity in India: ~700 gCO2eq/kWh at coal-heavy peak, ~330 at solar peak
_CARBON_BASE_GRAMS = 620.0   # national average baseline


class MockGenerator:
    """
    Generates GridSnapshot for any zone deterministically from (zone_id, utc_now).
    seed: taken from settings.mock_seed (default 42).
    """

    name = "mock"

    def __init__(self, seed: int = 42) -> None:
        self._seed = seed

    async def fetch(self, zone_id: str) -> GridSnapshot:
        now_utc = datetime.now(timezone.utc)
        return self._generate(zone_id, now_utc)

    def generate(self, zone_id: str, at_utc: datetime | None = None) -> GridSnapshot:
        """Sync version for testing."""
        if at_utc is None:
            at_utc = datetime.now(timezone.utc)
        return self._generate(zone_id, at_utc)

    # ── Core generation ───────────────────────────────────────────────────────

    def _generate(self, zone_id: str, at_utc: datetime) -> GridSnapshot:
        rng = random.Random(self._seed ^ hash(zone_id) ^ at_utc.hour)

        profile = _ZONE_PROFILE.get(zone_id, _DEFAULT_PROFILE)
        total_mw = _NATIONAL_TOTAL_MW

        # IST hour for diurnal patterns
        ist_hour = (at_utc.hour + IST_OFFSET_H) % 24.0

        # ── Solar: cosine peak at 13:00 IST, zero outside 06:00–19:00 ─────
        if 6.0 <= ist_hour <= 19.0:
            solar_factor = max(0.0, math.cos(math.pi * (ist_hour - 13.0) / 7.0))
        else:
            solar_factor = 0.0
        solar_mw = round(
            total_mw * 0.18 * solar_factor * profile["solar"] * _jitter(rng, 0.08),
            1,
        )

        # ── Wind: inverse of solar + coastal bias; stronger night/dawn ────
        wind_night_boost = 1.3 if (ist_hour >= 20 or ist_hour <= 6) else 0.85
        wind_mw = round(
            total_mw * 0.12 * wind_night_boost * profile["wind"] * _jitter(rng, 0.12),
            1,
        )

        # ── Hydro: season-aware ────────────────────────────────────────────
        month = at_utc.month
        hydro_season_mult = _HYDRO_SEASON.get(month, 1.0)
        hydro_mw = round(
            total_mw * 0.10 * hydro_season_mult * profile["hydro"] * _jitter(rng, 0.06),
            1,
        )

        # ── Nuclear: steady ───────────────────────────────────────────────
        nuclear_mw = round(
            total_mw * 0.06 * profile["nuclear"] * _jitter(rng, 0.02),
            1,
        )

        # ── Biomass: small, fairly steady ─────────────────────────────────
        biomass_mw = round(total_mw * 0.015 * _jitter(rng, 0.05), 1)

        # ── Coal: fills remaining load + some base load ───────────────────
        # Coal is the residual balancer, bounded to always be ≥ 35% of total
        renewable_sum = solar_mw + wind_mw + hydro_mw + biomass_mw
        carbon_free_sum = renewable_sum + nuclear_mw
        # Compute a realistic coal minimum
        coal_min_mw = total_mw * 0.35 * profile["coal"]
        coal_mw = max(
            coal_min_mw,
            (total_mw - carbon_free_sum) * profile["coal"] * _jitter(rng, 0.05),
        )
        coal_mw = round(coal_mw, 1)

        # ── Gas: small peaking capacity ────────────────────────────────────
        gas_mw = round(total_mw * 0.04 * _jitter(rng, 0.15), 1)

        # ── Unknown: ~1-2% ────────────────────────────────────────────────
        unknown_mw = round(total_mw * 0.012 * _jitter(rng, 0.20), 1)

        breakdown = {
            "solar":    max(0.0, solar_mw),
            "wind":     max(0.0, wind_mw),
            "hydro":    max(0.0, hydro_mw),
            "nuclear":  max(0.0, nuclear_mw),
            "biomass":  max(0.0, biomass_mw),
            "coal":     max(0.0, coal_mw),
            "gas":      max(0.0, gas_mw),
            "unknown":  max(0.0, unknown_mw),
        }

        renewable_pct, carbon_free_pct = compute_pcts(breakdown)
        band = band_from_pct(renewable_pct)

        # Carbon intensity: linearly interpolate between dirty (coal peak) and clean (solar peak)
        carbon_intensity = round(
            _CARBON_BASE_GRAMS * (1.0 - (renewable_pct / 100.0) * 0.55)
            * _jitter(rng, 0.04),
            1,
        )

        return GridSnapshot(
            zoneId=zone_id,
            at=at_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            renewablePct=round(renewable_pct, 2),
            carbonFreePct=round(carbon_free_pct, 2),
            carbonIntensity=carbon_intensity,
            band=band,
            breakdown=breakdown,
            quality="mock",
            asOfAgeSec=0,
        )


def _jitter(rng: random.Random, pct: float) -> float:
    """Return a random multiplier ∈ [1-pct, 1+pct]."""
    return 1.0 + rng.uniform(-pct, pct)
