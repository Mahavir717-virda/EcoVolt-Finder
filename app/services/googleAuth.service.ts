/**
 * Google OAuth Service for React Native / Expo
 * Manages OAuth 2.0 WebBrowser authentication flow with Google Identity.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Complete any pending browser auth sessions
WebBrowser.maybeCompleteAuthSession();

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  verified_email?: boolean;
}

export interface GoogleAuthResult {
  success: boolean;
  user?: {
    email: string;
    name: string;
    photoUrl?: string;
    googleId?: string;
    idToken?: string;
  };
  error?: string;
}

/**
 * Resolves the appropriate Google OAuth Client ID based on platform & environment.
 */
export function getGoogleClientId(): string {
  const extra = Constants.expoConfig?.extra || {};

  if (Platform.OS === 'android' && (extra.googleAndroidClientId || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID)) {
    return extra.googleAndroidClientId || process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  }
  if (extra.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
    return extra.googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  }
  return extra.googleClientId || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
}

function decodeJwt(jwtToken: string): any {
  try {
    const parts = jwtToken.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr =
      typeof atob === 'function'
        ? atob(base64)
        : decodeURIComponent(
            escape(
              Array.from(base64, (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
            )
          );
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Initiates the Google OAuth 2.0 WebBrowser Consent Flow.
 */
export async function promptGoogleAuthAsync(): Promise<GoogleAuthResult> {
  const clientId = getGoogleClientId();

  // If Client ID is present, run full Google OAuth 2.0 interactive popup
  if (clientId && clientId.trim() !== '') {
    try {
      const isWeb = Platform.OS === 'web';
      const isExpoGo =
        Constants.appOwnership === 'expo' ||
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
        (Constants.executionEnvironment as string) === 'storeClient';

      const nonce = Math.random().toString(36).substring(2, 15);

      let startUrl: string;
      let returnUrl: string;

      if (isWeb) {
        returnUrl =
          typeof window !== 'undefined' && window.location?.origin
            ? `${window.location.origin}/oauth`
            : 'http://localhost:8081/oauth';

        startUrl =
          `https://accounts.google.com/o/oauth2/v2/auth` +
          `?client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(returnUrl)}` +
          `&response_type=token%20id_token` +
          `&scope=${encodeURIComponent('openid email profile')}` +
          `&nonce=${encodeURIComponent(nonce)}` +
          `&prompt=select_account`;
      } else if (isExpoGo) {
        // When running in Expo Go, proxy through auth.expo.io
        const owner = Constants.expoConfig?.owner || 'anonymous';
        const slug = Constants.expoConfig?.slug || 'ecovolt-finder';
        const proxyRedirectUri = `https://auth.expo.io/@${owner}/${slug}`;

        // Local return URI to return into Expo Go app
        returnUrl = Linking.createURL('expo-auth-session');

        const googleAuthUrl =
          `https://accounts.google.com/o/oauth2/v2/auth` +
          `?client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(proxyRedirectUri)}` +
          `&response_type=token%20id_token` +
          `&scope=${encodeURIComponent('openid email profile')}` +
          `&nonce=${encodeURIComponent(nonce)}` +
          `&prompt=select_account`;

        // auth.expo.io requires starting at /start?authUrl=...&returnUrl=... to preserve the session
        startUrl = `${proxyRedirectUri}/start?authUrl=${encodeURIComponent(googleAuthUrl)}&returnUrl=${encodeURIComponent(returnUrl)}`;
      } else {
        // Standalone native build
        returnUrl = makeRedirectUri({
          scheme: 'ecovolt',
          path: 'oauth',
        });

        startUrl =
          `https://accounts.google.com/o/oauth2/v2/auth` +
          `?client_id=${encodeURIComponent(clientId)}` +
          `&redirect_uri=${encodeURIComponent(returnUrl)}` +
          `&response_type=token%20id_token` +
          `&scope=${encodeURIComponent('openid email profile')}` +
          `&nonce=${encodeURIComponent(nonce)}` +
          `&prompt=select_account`;
      }

      const response = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);

      if (response.type === 'success' && response.url) {
        // Parse parameters from both hash fragment (#) and query string (?)
        const hashPart = response.url.includes('#') ? response.url.split('#')[1] : '';
        const queryPart = response.url.includes('?') ? response.url.split('?')[1].split('#')[0] : '';
        const hashParams = new URLSearchParams(hashPart);
        const queryParams = new URLSearchParams(queryPart);

        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
        const idToken = hashParams.get('id_token') || queryParams.get('id_token');

        let decodedPayload: any = null;
        if (idToken) {
          decodedPayload = decodeJwt(idToken);
        }

        let userProfile: GoogleUserProfile | null = null;
        if (accessToken) {
          try {
            const userRes = await fetch('https://www.googleapis.com/userinfo/v2/me', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userRes.ok) {
              userProfile = await userRes.json();
            }
          } catch (e) {
            console.warn('[GoogleAuthService] UserInfo fetch warning:', e);
          }
        }

        const email = userProfile?.email || decodedPayload?.email;
        const name =
          userProfile?.name ||
          decodedPayload?.name ||
          (email ? email.split('@')[0] : 'Google Driver');
        const photoUrl = userProfile?.picture || decodedPayload?.picture;
        const googleId = userProfile?.id || decodedPayload?.sub;

        if (email || idToken) {
          return {
            success: true,
            user: {
              email: email || '',
              name,
              photoUrl,
              googleId,
              idToken: idToken || undefined,
            },
          };
        }
      }

      if (response.type === 'cancel' || response.type === 'dismiss') {
        return { success: false, error: 'Google sign-in was cancelled' };
      }
    } catch (err: any) {
      console.warn('[GoogleAuthService] OAuth browser flow error:', err);
      return { success: false, error: `Google sign-in failed: ${err.message}` };
    }
  }

  // If no Client ID is configured, fail with clear instructions
  return {
    success: false,
    error: 'Google Client ID is not configured. Please add your EXPO_PUBLIC_GOOGLE_CLIENT_ID in app/.env',
  };
}
