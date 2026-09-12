import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { colors } from '@/constants/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

/**
 * AuthGuard — lives inside AuthProvider so it can read auth state.
 * Redirects to (auth)/login when unauthenticated, to (tabs) when authenticated.
 * Shows a splash indicator while the session is being restored from SecureStore.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return; // Wait until boot-check is done

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in but trying to access a protected route → send to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in but still on an auth screen → send to app
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    // Render a centered spinner while SecureStore is being checked
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Custom themes with VoltSpot branding
  const VoltSpotLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary[500],
      background: colors.white,
      card: colors.white,
      text: colors.neutral[900],
      border: colors.neutral[200],
    },
  };

  const VoltSpotDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.primary[400],
      background: colors.background.dark,
      card: colors.background.card.dark,
      text: colors.text.primary.dark,
      border: colors.neutral[700],
    },
  };

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? VoltSpotDarkTheme : VoltSpotLightTheme}>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="station/[stationId]"
              options={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="modal"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
            <Stack.Screen
              name="modal/filters"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </Stack>
        </AuthGuard>
        <StatusBar style="auto" />
      </ThemeProvider>
    </AuthProvider>
  );
}
