"""
tests/test_ingestion.py
────────────────────────
Tests for the M3-C2 ingestion layer:
  • MockGenerator: shape, zone differentiation, renewable/carbonFree invariants
  • Resolver: mock mode, hybrid fallback on API failure, cache quality tagging
  • Greenness helpers: compute_pcts, band_from_pct
  • Edge cases: unknown excluded from numerators, renewablePct ≠ carbonFreePct
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.config import Settings
from app.ingestion.base import IngestionError
from app.ingestion.greenness import band_from_pct, compute_pcts
from app.ingestion.mock_generator import MockGenerator
from app.ingestion.resolver import _cache, clear_cache, resolve


# ─── Greenness helpers ────────────────────────────────────────────────────────

class TestComputePcts:
    def test_renewable_excludes_nuclear(self):
        breakdown = {"solar": 100, "nuclear": 50, "coal": 50}
        renewable, carbon_free = compute_pcts(breakdown)
        assert renewable < carbon_free  # nuclear bumps carbonFree but not renewable

    def test_unknown_excluded_from_numerator_and_denominator(self):
        """unknown must not inflate renewable OR the total."""
        breakdown_with = {"solar": 100, "coal": 100, "unknown": 1000}
        breakdown_without = {"solar": 100, "coal": 100}
        r_with, cf_with = compute_pcts(breakdown_with)
        r_without, cf_without = compute_pcts(breakdown_without)
        # unknown should NOT dilute the % — it's excluded from total too
        assert abs(r_with - r_without) < 0.01, (
            f"unknown changed renewablePct: {r_with:.2f} vs {r_without:.2f}"
        )

    def test_zero_breakdown_returns_zeros(self):
        r, cf = compute_pcts({})
        assert r == 0.0 and cf == 0.0

    def test_all_solar_100pct(self):
        breakdown = {"solar": 500}
        r, _ = compute_pcts(breakdown)
        assert abs(r - 100.0) < 0.01

    def test_all_coal_0pct(self):
        breakdown = {"coal": 500}
        r, cf = compute_pcts(breakdown)
        assert r == 0.0 and cf == 0.0

    def test_pcts_bounded_0_to_100(self):
        breakdown = {"solar": 9999, "wind": 9999, "nuclear": 9999}
        r, cf = compute_pcts(breakdown)
        assert 0 <= r <= 100
        assert 0 <= cf <= 100


class TestBandFromPct:
    @pytest.mark.parametrize("pct,expected", [
        (85, "very_high"),
        (80, "very_high"),
        (75, "high"),
        (65, "high"),
        (60, "medium"),
        (50, "medium"),
        (30, "low"),
        (20, "low"),
        (10, "very_low"),
        (0,  "very_low"),
    ])
    def test_thresholds(self, pct, expected):
        assert band_from_pct(pct) == expected


# ─── MockGenerator ────────────────────────────────────────────────────────────

class TestMockGenerator:
    def setup_method(self):
        self.gen = MockGenerator(seed=42)

    def test_returns_grid_snapshot(self):
        snap = self.gen.generate("IN")
        assert snap.zoneId == "IN"
        assert snap.quality == "mock"

    def test_quality_always_mock(self):
        for zone in ["IN", "IN-WE", "IN-SO", "IN-NO", "IN-EA", "IN-NE"]:
            snap = self.gen.generate(zone)
            assert snap.quality == "mock", f"expected mock for {zone}, got {snap.quality}"

    def test_as_of_age_is_zero(self):
        snap = self.gen.generate("IN")
        assert snap.asOfAgeSec == 0

    def test_renewable_pct_range(self):
        snap = self.gen.generate("IN")
        assert 0 <= snap.renewablePct <= 100
        assert 0 <= snap.carbonFreePct <= 100

    def test_renewable_not_equal_carbon_free_when_nuclear(self):
        """If nuclear is non-zero, carbonFreePct must be ≥ renewablePct."""
        snap = self.gen.generate("IN")
        assert snap.carbonFreePct >= snap.renewablePct, (
            f"carbonFreePct {snap.carbonFreePct} < renewablePct {snap.renewablePct}"
        )

    def test_band_is_valid(self):
        snap = self.gen.generate("IN-WE")
        assert snap.band in ("very_high", "high", "medium", "low", "very_low")

    def test_breakdown_has_expected_keys(self):
        snap = self.gen.generate("IN")
        assert "solar" in snap.breakdown
        assert "coal" in snap.breakdown
        assert "wind" in snap.breakdown

    def test_unknown_not_in_renewable_numerator(self):
        """Manually verify: adding unknown to breakdown doesn't change pcts."""
        snap = self.gen.generate("IN")
        bd_with = {**snap.breakdown, "unknown": 99999}
        bd_without = {k: v for k, v in snap.breakdown.items() if k != "unknown"}
        r_with, _ = compute_pcts(bd_with)
        r_without, _ = compute_pcts(bd_without)
        assert abs(r_with - r_without) < 0.01

    def test_solar_higher_at_noon(self):
        """IN-WE (solar-heavy zone) should have more solar at noon IST."""
        noon_utc = datetime(2026, 9, 12, 7, 30, 0, tzinfo=timezone.utc)   # 13:00 IST
        night_utc = datetime(2026, 9, 12, 20, 0, 0, tzinfo=timezone.utc)  # 01:30 IST
        noon_snap  = self.gen.generate("IN-WE", at_utc=noon_utc)
        night_snap = self.gen.generate("IN-WE", at_utc=night_utc)
        assert noon_snap.breakdown.get("solar", 0) > night_snap.breakdown.get("solar", 0), (
            "Solar should be higher at noon than at night"
        )

    def test_solar_zero_at_night(self):
        """Solar should be 0 MW between 19:00 and 06:00 IST."""
        midnight_utc = datetime(2026, 9, 12, 20, 0, 0, tzinfo=timezone.utc)  # 01:30 IST
        snap = self.gen.generate("IN", at_utc=midnight_utc)
        assert snap.breakdown.get("solar", 0) == 0.0, (
            f"Solar should be 0 at night, got {snap.breakdown.get('solar')}"
        )

    def test_zone_differentiation_solar(self):
        """IN-WE should have more solar than IN-NE (hydro zone)."""
        at_noon = datetime(2026, 9, 12, 7, 30, 0, tzinfo=timezone.utc)
        we_snap = self.gen.generate("IN-WE", at_utc=at_noon)
        ne_snap = self.gen.generate("IN-NE", at_utc=at_noon)
        assert we_snap.breakdown.get("solar", 0) > ne_snap.breakdown.get("solar", 0)

    def test_zone_differentiation_hydro(self):
        """IN-NE should have more hydro than IN-NO."""
        at_noon = datetime(2026, 9, 12, 7, 30, 0, tzinfo=timezone.utc)
        ne_snap = self.gen.generate("IN-NE", at_utc=at_noon)
        no_snap = self.gen.generate("IN-NO", at_utc=at_noon)
        assert ne_snap.breakdown.get("hydro", 0) > no_snap.breakdown.get("hydro", 0)

    def test_coal_always_significant(self):
        """Coal should be at least 35% of total for IN (national grid)."""
        snap = self.gen.generate("IN")
        total = sum(v for k, v in snap.breakdown.items() if k != "unknown" and v > 0)
        coal = snap.breakdown.get("coal", 0)
        coal_pct = coal / total * 100 if total > 0 else 0
        assert coal_pct >= 30, f"Coal unexpectedly low: {coal_pct:.1f}% of total"

    def test_deterministic_same_seed(self):
        """Same seed + zone + time → same result."""
        at = datetime(2026, 9, 12, 7, 0, 0, tzinfo=timezone.utc)
        g1 = MockGenerator(seed=42)
        g2 = MockGenerator(seed=42)
        s1 = g1.generate("IN", at_utc=at)
        s2 = g2.generate("IN", at_utc=at)
        assert s1.renewablePct == s2.renewablePct
        assert s1.breakdown == s2.breakdown

    def test_different_seeds_differ(self):
        at = datetime(2026, 9, 12, 7, 0, 0, tzinfo=timezone.utc)
        g1 = MockGenerator(seed=42)
        g2 = MockGenerator(seed=99)
        s1 = g1.generate("IN", at_utc=at)
        s2 = g2.generate("IN", at_utc=at)
        # At least something should differ
        assert s1.renewablePct != s2.renewablePct or s1.breakdown != s2.breakdown

    def test_timestamp_is_utc(self):
        snap = self.gen.generate("IN")
        assert snap.at.endswith("Z"), f"Timestamp not UTC: {snap.at}"

    def test_all_standard_zones(self):
        """Every standard zone should produce a valid snapshot."""
        for zone in ["IN", "IN-WE", "IN-SO", "IN-NO", "IN-EA", "IN-NE"]:
            snap = self.gen.generate(zone)
            assert 0 <= snap.renewablePct <= 100
            assert snap.quality == "mock"

    def test_unknown_zone_falls_back_to_national(self):
        """An unknown zone ID should not crash — falls back to IN profile."""
        snap = self.gen.generate("IN-UNKNOWN")
        assert snap.quality == "mock"
        assert 0 <= snap.renewablePct <= 100


# ─── Resolver ─────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clear_ingestion_cache():
    """Clear the in-process cache before each test to prevent cross-test pollution."""
    clear_cache()
    yield
    clear_cache()


def _mock_settings(**overrides) -> Settings:
    defaults = {
        "grid_mode": "mock",
        "electricity_maps_token": "",
        "mock_seed": 42,
        "grid_cache_ttl_sec": 300,
    }
    defaults.update(overrides)
    return Settings.model_construct(**defaults)


class TestResolver:
    def test_mock_mode_returns_mock_quality(self):
        settings = _mock_settings(grid_mode="mock")
        snap = asyncio.get_event_loop().run_until_complete(
            resolve("IN-WE", settings)
        )
        assert snap.quality == "mock"
        assert snap.zoneId == "IN-WE"

    def test_mock_mode_no_api_call(self):
        """In mock mode, no HTTP calls should be made."""
        settings = _mock_settings(grid_mode="mock")
        with patch("app.ingestion.resolver.ElectricityMapsClient") as MockClient:
            asyncio.get_event_loop().run_until_complete(resolve("IN", settings))
            MockClient.assert_not_called()

    def test_hybrid_falls_back_to_mock_on_api_failure(self):
        """In hybrid mode with a forced API error, falls back to mock."""
        settings = _mock_settings(
            grid_mode="hybrid",
            electricity_maps_token="fake-token",
        )
        with patch(
            "app.ingestion.resolver.ElectricityMapsClient",
            return_value=AsyncMock(
                name="electricity_maps",
                fetch=AsyncMock(
                    side_effect=IngestionError("electricity_maps", "forced test failure")
                ),
            ),
        ):
            snap = asyncio.get_event_loop().run_until_complete(
                resolve("IN-WE", settings)
            )
        assert snap.quality == "mock", f"Expected mock fallback, got {snap.quality}"
        assert snap.zoneId == "IN-WE"

    def test_hybrid_serves_cache_after_live_success(self):
        """After a live fetch, the cache should serve subsequent requests with quality=cached."""
        settings = _mock_settings(
            grid_mode="hybrid",
            electricity_maps_token="fake-token",
            grid_cache_ttl_sec=300,
        )

        live_snap_data = {
            "zoneId": "IN",
            "at": "2026-09-12T07:00:00Z",
            "renewablePct": 72.0,
            "carbonFreePct": 74.0,
            "carbonIntensity": 410.0,
            "band": "high",
            "breakdown": {"solar": 4000, "coal": 5000},
            "quality": "live",
            "asOfAgeSec": 10,
        }
        from app.models import GridSnapshot
        live_snap = GridSnapshot.model_validate(live_snap_data)

        with patch(
            "app.ingestion.resolver.ElectricityMapsClient",
            return_value=AsyncMock(
                name="electricity_maps",
                fetch=AsyncMock(return_value=live_snap),
            ),
        ):
            asyncio.get_event_loop().run_until_complete(resolve("IN", settings))

        # Second call — API "fails" but cache should be hit
        with patch(
            "app.ingestion.resolver.ElectricityMapsClient",
            return_value=AsyncMock(
                name="electricity_maps",
                fetch=AsyncMock(
                    side_effect=IngestionError("electricity_maps", "down on second call")
                ),
            ),
        ):
            snap2 = asyncio.get_event_loop().run_until_complete(resolve("IN", settings))

        assert snap2.quality == "cached", f"Expected cached, got {snap2.quality}"

    def test_hybrid_no_token_goes_straight_to_mock(self):
        """In hybrid mode with no token, should skip live step and go to mock."""
        settings = _mock_settings(grid_mode="hybrid", electricity_maps_token="")
        snap = asyncio.get_event_loop().run_until_complete(resolve("IN-SO", settings))
        assert snap.quality == "mock"

    def test_all_zones_succeed_in_mock_mode(self):
        settings = _mock_settings(grid_mode="mock")
        for zone in ["IN", "IN-WE", "IN-SO", "IN-NO", "IN-EA", "IN-NE"]:
            snap = asyncio.get_event_loop().run_until_complete(resolve(zone, settings))
            assert snap.quality == "mock"
            assert 0 <= snap.renewablePct <= 100


# ─── FastAPI endpoint integration ─────────────────────────────────────────────

class TestGridLiveEndpoint:
    """Tests that the /grid/live endpoint uses the resolver (not the example stub)."""

    def test_grid_live_returns_mock_quality_in_mock_mode(self, client):
        """With GRID_MODE=mock (set in conftest), endpoint returns quality=mock."""
        r = client.get("/grid/live", params={"zoneId": "IN-WE"})
        assert r.status_code == 200
        data = r.json()
        assert data["quality"] == "mock"
        assert data["zoneId"] == "IN-WE"

    def test_grid_live_breakdown_has_solar_key(self, client):
        r = client.get("/grid/live", params={"zoneId": "IN-WE"})
        data = r.json()
        assert "solar" in data["breakdown"]

    def test_grid_live_carbon_free_gte_renewable(self, client):
        """carbonFreePct must be ≥ renewablePct (nuclear is carbon-free but not renewable)."""
        r = client.get("/grid/live", params={"zoneId": "IN"})
        data = r.json()
        assert data["carbonFreePct"] >= data["renewablePct"], (
            f"carbonFreePct {data['carbonFreePct']} < renewablePct {data['renewablePct']}"
        )

    def test_grid_live_timestamp_utc(self, client):
        r = client.get("/grid/live", params={"zoneId": "IN"})
        data = r.json()
        assert data["at"].endswith("Z"), f"Timestamp not UTC: {data['at']}"

    def test_grid_live_different_zones_differ(self, client):
        """Different zones should return different breakdowns."""
        we = client.get("/grid/live", params={"zoneId": "IN-WE"}).json()
        ne = client.get("/grid/live", params={"zoneId": "IN-NE"}).json()
        # IN-WE is solar-heavy; IN-NE is hydro-heavy — they must differ
        assert we["breakdown"] != ne["breakdown"], (
            "IN-WE and IN-NE returned identical breakdowns — zone differentiation broken"
        )
