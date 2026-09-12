import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { CapsuleTabBar } from '@/src/components/navigation/CapsuleTabBar';

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading, user, profile } = useAuth();

  const isManager =
    (profile as any)?.role === 'manager' ||
    (user as any)?.role === 'manager' ||
    user?.email === 'mahavir@gmail.com' ||
    profile?.email === 'mahavir@gmail.com';

  const isAdmin =
    (profile as any)?.role === 'admin' ||
    (user as any)?.role === 'admin' ||
    user?.email === 'admin@ecovolt.in' ||
    profile?.email === 'admin@ecovolt.in';

  // While checking token on mount, show a centered spinner
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not authenticated — redirect to login screen
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <CapsuleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 1. Reservations (Tab 0) */}
      <Tabs.Screen
        name="reservations"
        options={{
          title: t('tab.reservations', 'Bookings'),
        }}
      />

      {/* 2. Vehicle / EV Garage (Tab 1) */}
      <Tabs.Screen
        name="vehicles"
        options={{
          title: t('tab.vehicles', 'Vehicle'),
        }}
      />

      {/* 3. HOME (Tab 2 - Visual Center) */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home', 'Home'),
        }}
      />

      {/* 4. Saved (Tab 3) */}
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tab.saved', 'Saved'),
        }}
      />

      {/* 5. Profile (Tab 4) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile', 'Profile'),
        }}
      />

      {/* Hidden Routes */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
