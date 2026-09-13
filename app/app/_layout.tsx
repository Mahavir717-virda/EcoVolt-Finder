import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { colors } from '@/constants/colors';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { FilterProvider } from '@/hooks/useFilters';
import { LanguageProvider } from '@/hooks/useLanguage';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { initDeviceNotifications } from '@/services/notifications.service';

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
      initDeviceNotifications().catch(() => {});
    } else if (isAuthenticated) {
      initDeviceNotifications().catch(() => {});
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

function ThemedNavigation() {
  const { isDark, colors: themeColors } = useTheme();

  // Custom themes with VoltSpot branding
  const VoltSpotTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: themeColors.primary,
      background: themeColors.background,
      card: themeColors.surface,
      text: themeColors.textPrimary,
      border: themeColors.border,
    },
  };

  return (
    <NavigationThemeProvider value={VoltSpotTheme}>
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
          <Stack.Screen
            name="modal/edit-profile"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="modal/payment-methods"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="modal/appearance"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="modal/notifications-settings"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="modal/help-center"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="modal/contact-us"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="modal/terms-privacy"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="modal/language"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="modal/notifications"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </AuthGuard>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <FilterProvider>
          <AuthProvider>
            <ThemedNavigation />
          </AuthProvider>
        </FilterProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

