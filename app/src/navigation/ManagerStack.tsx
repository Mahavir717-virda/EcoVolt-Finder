import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ManagerStackParamList } from './types';
import {
  ManagerDashboardScreen,
  StationFormScreen,
  PricingControlScreen,
  ManagerAnalyticsScreen,
} from '../screens/manager';
import { colors } from '../theme/tokens';

const Stack = createNativeStackNavigator<ManagerStackParamList>();

export const ManagerNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ManagerDashboard"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold' },
        contentStyle: { backgroundColor: colors.canvas },
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
        name="ManagerAnalytics"
        component={ManagerAnalyticsScreen}
        options={{ title: 'Station Analytics' }}
      />
    </Stack.Navigator>
  );
};
