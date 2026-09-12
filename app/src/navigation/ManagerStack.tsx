import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ManagerStackParamList } from './types';
import {
  ManagerDashboardScreen,
  StationFormScreen,
  PricingControlScreen,
  ManagerAnalyticsScreen,
  BookingOversightScreen,
  DisputesScreen,
  ProfileSettingsScreen,
  NotificationsScreen,
} from '../screens/manager';
import { colors } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator<ManagerStackParamList>();

export const ManagerNavigator: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ManagerStackParamList>>();

  return (
    <Stack.Navigator
      initialRouteName="ManagerDashboard"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold' },
        contentStyle: { backgroundColor: colors.canvas },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Notifications')}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand + '20', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="notifications" size={18} color={colors.brand} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => navigation.navigate('ProfileSettings')}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand + '20', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="person" size={18} color={colors.brand} />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Stack.Screen
        name="ManagerDashboard"
        component={ManagerDashboardScreen}
        options={{ title: 'Manager Portal' }}
      />
      <Stack.Screen
        name="StationList"
        component={ManagerDashboardScreen}
        options={{ title: 'My Stations' }}
      />
      <Stack.Screen
        name="StationForm"
        component={StationFormScreen}
        options={{ title: 'Edit Station' }}
      />
      <Stack.Screen
        name="PricingControls"
        component={PricingControlScreen}
        options={{ title: 'Pricing & Tariffs' }}
      />
      <Stack.Screen
        name="LiveSessions"
        component={ManagerDashboardScreen}
        options={{ title: 'Active Sessions' }}
      />
      <Stack.Screen
        name="BookingOversight"
        component={BookingOversightScreen}
        options={{ title: 'Upcoming Bookings' }}
      />
      <Stack.Screen
        name="ManagerAnalytics"
        component={ManagerAnalyticsScreen}
        options={{ title: 'Station Analytics' }}
      />
      <Stack.Screen
        name="Disputes"
        component={DisputesScreen}
        options={{ title: 'Disputes & Refunds' }}
      />
      <Stack.Screen
        name="ProfileSettings"
        component={ProfileSettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Alerts' }}
      />
    </Stack.Navigator>
  );
};
