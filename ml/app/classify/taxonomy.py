"""
app/classify/taxonomy.py
─────────────────────────
Defines the fuel-mix taxonomy for renewable and carbon-free calculations.
"""
from __future__ import annotations

# The core sets
RENEWABLE_BASE = frozenset({"solar", "wind", "biomass", "geothermal"})
CARBON_FREE_EXTRA = frozenset({"nuclear"})
FOSSIL = frozenset({"coal", "gas", "oil", "diesel"})

# Single flag to flip hydro convention
HYDRO_IS_RENEWABLE = True

def get_renewable_keys() -> set[str]:
    keys = set(RENEWABLE_BASE)
    if HYDRO_IS_RENEWABLE:
        keys.add("hydro")
    return keys

def get_carbon_free_keys() -> set[str]:
    return get_renewable_keys() | CARBON_FREE_EXTRA

EXCLUDE_KEYS = frozenset({"unknown", "other"})
