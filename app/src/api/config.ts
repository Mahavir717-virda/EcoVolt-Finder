import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const ENV = {
  API_BASE_URL: (extra.apiBaseUrl as string) || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
  USE_MOCKS:
    extra.useMocks === false || process.env.EXPO_PUBLIC_USE_MOCKS === 'false' || process.env.USE_MOCKS === 'false'
      ? false
      : extra.useMocks === true || process.env.EXPO_PUBLIC_USE_MOCKS === 'true' || process.env.USE_MOCKS === 'true',
  GOOGLE_MAPS_API_KEY: (extra.googleMapsApiKey as string) || '',
};
