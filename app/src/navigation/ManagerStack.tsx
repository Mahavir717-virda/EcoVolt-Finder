import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ManagerStackParamList } from './types';
import {
  ManagerDashboardScreen,
  StationFormScreen,
  PricingControlScreen,
  ManagerAnalyticsScreen,
} from '../screens/manager';
import { ProfileScreen } from '../screens/driver';
import { colors } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
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
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand + '20', justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="person" size={18} color={colors.brand} />
          </TouchableOpacity>
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
        name="ManagerAnalytics"
        component={ManagerAnalyticsScreen}
        options={{ title: 'Station Analytics' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
};
