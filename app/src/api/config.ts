import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_BASE_URL;
  const extraUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  const configured = envUrl || extraUrl;

  // If a custom non-localhost URL is explicitly set, use it directly
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured;
  }

  // When running via Expo Go on a physical phone or simulator,
  // extract the computer's LAN IP from hostUri (e.g., "192.168.1.50:8081" -> "192.168.1.50")
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any)?.manifest?.debuggerHost;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp) {
      return `http://${hostIp}:4000`;
    }
  }

  // Android emulator loopback fallback
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }

  // iOS simulator or web
  return configured || 'http://localhost:4000';
}

const extra = Constants.expoConfig?.extra || {};

export const ENV = {
  API_BASE_URL: resolveApiBaseUrl(),
  USE_MOCKS: false,
  GOOGLE_MAPS_API_KEY: (extra.googleMapsApiKey as string) || '',
};
