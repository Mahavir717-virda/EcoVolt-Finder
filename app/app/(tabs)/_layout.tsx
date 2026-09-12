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
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? colors.textMuted : colors.textSecondary,
        tabBarStyle: (isAdmin || isManager) ? { display: 'none' } : {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isAdmin ? 'Network Admin' : isManager ? 'Manager Hub' : t('tab.home', 'Home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? (isAdmin ? 'shield-checkmark' : isManager ? 'business' : 'map') : (isAdmin ? 'shield-checkmark-outline' : isManager ? 'business-outline' : 'map-outline')} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{
          title: isAdmin ? 'Registry' : isManager ? 'Live Sessions' : t('tab.reservations', 'Reservations'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? (isAdmin ? 'business' : isManager ? 'flash' : 'calendar') : (isAdmin ? 'business-outline' : isManager ? 'flash-outline' : 'calendar-outline')} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: isAdmin ? 'Users & Roles' : isManager ? 'Pricing Engine' : t('tab.saved', 'Saved'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? (isAdmin ? 'people' : isManager ? 'pricetag' : 'bookmark') : (isAdmin ? 'people-outline' : isManager ? 'pricetag-outline' : 'bookmark-outline')} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isAdmin ? 'Audit & Ops' : isManager ? 'Operator Profile' : t('tab.profile', 'Profile'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? (isAdmin ? 'document-text' : 'person') : (isAdmin ? 'document-text-outline' : 'person-outline')} 
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


