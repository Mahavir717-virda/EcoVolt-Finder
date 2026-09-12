import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ecoVolt-finder',
  slug: 'ecovolt-finder',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  plugins: ['expo-asset', 'expo-router'],
  android: {
    ...config.android,
    package: 'com.ecovolt.finder',
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
    ],
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY || '',
      },
    },
  },
  extra: {
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
    useMocks: process.env.USE_MOCKS !== 'false',
    googleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY || '',
  },
});
