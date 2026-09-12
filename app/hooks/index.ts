/**
 * Hooks Index
 * Export all custom hooks
 */

export { AuthProvider, useAuth } from './useAuth';
export { useCharger, useChargerAvailability, useChargerStats, useChargers } from './useChargers';
export { useFavoriteStatus, useFavorites } from './useFavorites';
export {
    useAllChargersRealtime, useChargerRealtime, useStationChargers, useUserReservationsRealtime
} from './useRealtime';
export {
    useActiveReservationCount, useCancelReservation, useCreateReservation, useReservation, useReservations
} from './useReservations';
export { useNearbyStations, useStation, useStations } from './useStations';
export { applyFiltersToStations, DEFAULT_FILTERS, FilterProvider, useFilters } from './useFilters';
export type { FilterState } from './useFilters';
