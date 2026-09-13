/**
 * useUserLocation Hook
 * Ultra-reliable location acquisition with fast cache, 4s timeout, and Gujarat EV Hub fallback
 */

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

// Default central EV hub coordinates (Gandhinagar, Gujarat - near Capital Complex)
export const DEFAULT_EV_HUB_COORDS: LocationCoords = {
  latitude: 23.2156,
  longitude: 72.6369,
};

export interface UserLocationState {
  coords: LocationCoords;
  isFallback: boolean;
  isLoading: boolean;
  permissionGranted: boolean;
  errorMessage: string | null;
}

export function useUserLocation() {
  const [state, setState] = useState<UserLocationState>({
    coords: DEFAULT_EV_HUB_COORDS,
    isFallback: true,
    isLoading: true,
    permissionGranted: false,
    errorMessage: null,
  });

  const requestLocation = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setState({
          coords: DEFAULT_EV_HUB_COORDS,
          isFallback: true,
          isLoading: false,
          permissionGranted: false,
          errorMessage: 'Location permission not granted. Showing Gandhinagar EV Hub.',
        });
        return;
      }

      // Step 1: Immediately grab last known position if available for instant UI rendering
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords) {
          setState({
            coords: {
              latitude: lastKnown.coords.latitude,
              longitude: lastKnown.coords.longitude,
            },
            isFallback: false,
            isLoading: false,
            permissionGranted: true,
            errorMessage: null,
          });
        }
      } catch {}

      // Step 2: Acquire fresh position with a 4.5s timeout promise race
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), 4500)
      );

      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const result = await Promise.race([positionPromise, timeoutPromise]);

      if (result && result.coords) {
        setState({
          coords: {
            latitude: result.coords.latitude,
            longitude: result.coords.longitude,
          },
          isFallback: false,
          isLoading: false,
          permissionGranted: true,
          errorMessage: null,
        });
      } else {
        // Timed out: keep current or fallback
        setState((prev) => ({
          ...prev,
          isLoading: false,
          permissionGranted: true,
        }));
      }
    } catch (err: any) {
      console.warn('[useUserLocation] Location error, using default hub:', err?.message || err);
      setState({
        coords: DEFAULT_EV_HUB_COORDS,
        isFallback: true,
        isLoading: false,
        permissionGranted: false,
        errorMessage: 'Unable to get GPS fix. Using default Gandhinagar hub.',
      });
    }
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    ...state,
    refreshLocation: requestLocation,
  };
}
