/**
 * App route constants for type-safe navigation
 */

export const ROUTES = {
  // Auth routes
  AUTH: {
    LOGIN: '/(auth)/login',
    SIGNUP: '/(auth)/signup',
    ONBOARDING: '/(auth)/onboarding',
  },

  // Tab routes
  TABS: {
    HOME: '/(tabs)/home',
    RESERVATIONS: '/(tabs)/reservations',
    FAVORITES: '/(tabs)/favorites',
    PROFILE: '/(tabs)/profile',
  },

  // Station routes
  STATION: {
    DETAILS: '/station/[stationId]',
    RESERVE: '/station/reserve',
  },

  // Modal routes
  MODAL: {
    FILTERS: '/modal/filters',
  },
} as const;

// Helper to generate dynamic routes
export function getStationRoute(stationId: string): string {
  return `/station/${stationId}`;
}

export function getReserveRoute(stationId: string, chargerId: string): string {
  return `/station/reserve?stationId=${stationId}&chargerId=${chargerId}`;
}
