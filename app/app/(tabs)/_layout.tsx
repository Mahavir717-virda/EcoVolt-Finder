import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

export default function TabLayout() {
  const { isDark, colors } = useTheme();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();

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
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? colors.textMuted : colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.home', 'Home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'map' : 'map-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: t('tab.reservations', 'Reservations'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'calendar' : 'calendar-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('tab.saved', 'Saved'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'bookmark' : 'bookmark-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile', 'Profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      {/* Hide explore from tabs */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}


