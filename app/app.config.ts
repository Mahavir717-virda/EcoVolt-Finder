import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ecoVolt-finder',
  slug: 'ecovolt-finder',
  scheme: 'ecovolt',
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
    useMocks: process.env.USE_MOCKS === 'true',
    googleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY || '',
    googleClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
    googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
  },
});
