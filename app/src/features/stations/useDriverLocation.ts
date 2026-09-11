import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { GeoPoint } from '@contracts/types';
import { DriverLocationState } from './types';

// Default central EV hub coordinates (Ahmedabad CG Road / Navrangpura)
export const DEFAULT_EV_HUB_COORDS: GeoPoint = {
  lat: 23.0370,
  lng: 72.5622,
};

export function useDriverLocation() {
  const [state, setState] = useState<DriverLocationState>({
    coords: DEFAULT_EV_HUB_COORDS,
    status: 'undetermined',
    isManual: false,
    isLoading: true,
  });

  const fetchCurrentLocation = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState({
          coords: DEFAULT_EV_HUB_COORDS,
          status: 'denied',
          isManual: true,
          isLoading: false,
          errorMessage:
            'Location access not granted. Displaying default Ahmedabad EV hub. Tap the map or search to set a custom origin.',
        });
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setState({
        coords: {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        },
        status: 'granted',
        isManual: false,
        isLoading: false,
      });
    } catch (error) {
      console.warn('[useDriverLocation] Error getting position:', error);
      setState({
        coords: DEFAULT_EV_HUB_COORDS,
        status: 'denied',
        isManual: true,
        isLoading: false,
        errorMessage:
          'Unable to acquire GPS fix. Using default Ahmedabad location.',
      });
    }
  }, []);

  useEffect(() => {
    fetchCurrentLocation();
  }, [fetchCurrentLocation]);

  const setManualLocation = useCallback((coords: GeoPoint) => {
    setState((prev) => ({
      ...prev,
      coords,
      isManual: true,
      status: 'manual',
      errorMessage: undefined,
    }));
  }, []);

  const recenter = useCallback(() => {
    fetchCurrentLocation();
  }, [fetchCurrentLocation]);

  return {
    coords: state.coords,
    status: state.status,
    isManual: state.isManual,
    isLoading: state.isLoading,
    errorMessage: state.errorMessage,
    setManualLocation,
    recenter,
    retryPermission: fetchCurrentLocation,
  };
}
