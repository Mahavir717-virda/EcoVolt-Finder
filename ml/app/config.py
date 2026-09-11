"""
app/config.py
─────────────
Pydantic-Settings config for the ecoVolt-finder ML service.
All env vars are loaded from .env (or the environment directly).

GRID_MODE is the master switch:
  live   — always call external APIs, fail loudly on error
  mock   — never call external APIs, return seeded deterministic data
  hybrid — try live → cached → mock (demo-safe default)
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Grid data source ─────────────────────────────────────────────
    grid_mode: Literal["live", "mock", "hybrid"] = "hybrid"

    # ── External API keys ────────────────────────────────────────────
    electricity_maps_token: str = ""
    google_server_key: str = ""
    india_atlas_key: str = ""

    # ── Server ───────────────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000

    # ── Cache / mock ─────────────────────────────────────────────────
    grid_cache_ttl_sec: int = 300
    mock_seed: int = 42

    # ── App metadata ──────────────────────────────────────────────────
    version: str = "0.1.0"

    # ── CORS ─────────────────────────────────────────────────────────
    # Comma-separated list of allowed origins for the Node service
    allowed_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton — call this everywhere instead of instantiating Settings()."""
    return Settings()
