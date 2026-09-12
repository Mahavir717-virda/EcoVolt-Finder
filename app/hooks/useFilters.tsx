/**
 * useFilters - Global Filter Context
 * Provides filter state shared between the filters modal and the station list screens.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';

export interface FilterState {
  chargerTypes: string[];
  connectorTypes: string[];
  amenities: string[];
  maxDistance: number | null;
  priceRange: { min: number; max: number } | null;
  availableOnly: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  chargerTypes: [],
  connectorTypes: [],
  amenities: [],
  maxDistance: null,
  priceRange: null,
  availableOnly: false,
};

interface FilterContextValue {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  resetFilters: () => void;
  activeFiltersCount: number;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTERS);

  const setFilters = useCallback((newFilters: FilterState) => {
    setFiltersState(newFilters);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const activeFiltersCount =
    filters.chargerTypes.length +
    filters.connectorTypes.length +
    filters.amenities.length +
    (filters.priceRange ? 1 : 0) +
    (filters.availableOnly ? 1 : 0) +
    (filters.maxDistance != null && filters.maxDistance < 100 ? 1 : 0);

  return (
    <FilterContext.Provider value={{ filters, setFilters, resetFilters, activeFiltersCount }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used inside <FilterProvider>');
  return ctx;
}

/**
 * Apply filter state to a list of stations (client-side filtering).
 * Returns only stations that pass all active filter criteria.
 */
export function applyFiltersToStations<T extends {
  id?: string;
  available_chargers?: number | null;
  total_chargers?: number | null;
  price_from?: number | null;
  amenities?: string[] | null;
  distance?: number | null;
  chargers?: Array<{
    charger_type?: string | null;
    connector_type?: string | null;
    price_per_kwh?: number | null;
    power_kw?: number | null;
  }>;
  connectors?: Array<{
    type?: string | null;
    powerKw?: number | null;
  }>;
}>(stations: T[], filters: FilterState): T[] {
  return stations.filter((station) => {
    // 1. Available chargers only
    if (filters.availableOnly && (station.available_chargers ?? 0) <= 0) {
      return false;
    }

    // 2. Maximum Distance filter
    if (filters.maxDistance != null && filters.maxDistance > 0 && filters.maxDistance < 100) {
      if (station.distance !== undefined && station.distance !== null) {
        if (station.distance > filters.maxDistance) {
          return false;
        }
      }
    }

    // 3. Charger type multi-selection filter
    if (filters.chargerTypes && filters.chargerTypes.length > 0) {
      const selectedTypes = filters.chargerTypes.map((t) => t.toLowerCase());
      const stationChargers = station.chargers || [];
      const stationConnectors = station.connectors || [];

      const hasChargerMatch = stationChargers.some((c) => {
        const type = String(c.charger_type || '').toLowerCase();
        return selectedTypes.includes(type);
      });

      const hasConnectorPowerMatch = stationConnectors.some((cn) => {
        const power = Number(cn.powerKw || 0);
        if (selectedTypes.includes('tesla_supercharger') && power >= 150) return true;
        if (selectedTypes.includes('dc_fast') && power >= 25 && power < 150) return true;
        if (selectedTypes.includes('level_2') && power >= 3 && power < 25) return true;
        if (selectedTypes.includes('level_1') && power > 0 && power < 3) return true;
        return false;
      });

      if (!hasChargerMatch && !hasConnectorPowerMatch) {
        return false;
      }
    }

    // 4. Connector type multi-selection filter
    if (filters.connectorTypes && filters.connectorTypes.length > 0) {
      const selectedConnectors = filters.connectorTypes.map((c) => c.toLowerCase());
      const stationChargers = station.chargers || [];
      const stationConnectors = station.connectors || [];

      const chargerConnectors = stationChargers.map((c) => String(c.connector_type || '').toLowerCase());
      const rawConnectors = stationConnectors.map((cn) => {
        const t = String(cn.type || '').toLowerCase();
        if (t === 'ccs2' || t === 'bharat_dc_001') return 'ccs';
        if (t === 'type2_ac' || t === 'bharat_ac_001') return 'type2';
        if (t === 'three_pin') return 'j1772';
        return t;
      });

      const allConnectors = [...chargerConnectors, ...rawConnectors];
      const hasConnectorMatch = selectedConnectors.some((sc) => allConnectors.includes(sc));
      if (!hasConnectorMatch) {
        return false;
      }
    }

    // 5. Price range filter
    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      const price = station.price_from ?? 12.5;
      if (price < min || price > max) {
        return false;
      }
    }

    // 6. Amenities multi-selection filter
    if (filters.amenities && filters.amenities.length > 0) {
      const stationAmenities = (station.amenities || []).map((a) => a.toLowerCase());
      const hasAllAmenities = filters.amenities.every((fa) =>
        stationAmenities.some((sa) => sa.includes(fa.toLowerCase()) || fa.toLowerCase().includes(sa))
      );
      if (!hasAllAmenities) {
        return false;
      }
    }

    return true;
  });
}
