import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const ENV = {
  API_BASE_URL: (extra.apiBaseUrl as string) || 'http://localhost:4000',
  USE_MOCKS: extra.useMocks === true || extra.useMocks === 'true' || true,
  GOOGLE_MAPS_API_KEY: (extra.googleMapsApiKey as string) || '',
};
