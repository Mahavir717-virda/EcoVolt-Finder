/**
 * useFilters - Global Filter Context
 * Provides filter state shared between the filters modal and the station list screens.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';

export interface FilterState {
  chargerTypes: string[];
  connectorTypes: string[];
  amenities: string[];
  maxDistance: number;
  priceRange: { min: number; max: number } | null;
  availableOnly: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  chargerTypes: [],
  connectorTypes: [],
  amenities: [],
  maxDistance: 15,
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
    (filters.maxDistance !== DEFAULT_FILTERS.maxDistance ? 1 : 0);

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
  available_chargers?: number | null;
  total_chargers?: number | null;
  chargers?: Array<{
    charger_type?: string | null;
    connectors?: Array<{ connector_type?: string | null }>;
    price_per_kwh?: number | null;
  }>;
}>(stations: T[], filters: FilterState): T[] {
  return stations.filter((station) => {
    // Available only
    if (filters.availableOnly && (station.available_chargers ?? 0) <= 0) {
      return false;
    }

    // Charger type filter
    if (filters.chargerTypes.length > 0) {
      const stationTypes = (station.chargers ?? []).map((c) => c.charger_type?.toUpperCase());
      const hasMatch = filters.chargerTypes.some((ft) =>
        stationTypes.includes(ft.toUpperCase())
      );
      if (!hasMatch) return false;
    }

    // Connector type filter
    if (filters.connectorTypes.length > 0) {
      const stationConnectors = (station.chargers ?? []).flatMap((c) =>
        (c.connectors ?? []).map((cn) => cn.connector_type?.toUpperCase())
      );
      const hasMatch = filters.connectorTypes.some((fc) =>
        stationConnectors.includes(fc.toUpperCase())
      );
      if (!hasMatch) return false;
    }

    // Price range filter
    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      const prices = (station.chargers ?? []).map((c) => c.price_per_kwh ?? 0);
      if (prices.length > 0) {
        const lowestPrice = Math.min(...prices);
        if (lowestPrice < min || lowestPrice > max) return false;
      }
    }

    return true;
  });
}
