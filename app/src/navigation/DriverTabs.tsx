import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DriverTabParamList, DriverStackParamList } from './types';
import {
  HomeMapScreen,
  SmartChargeScreen,
  ActiveSessionScreen,
  ProfileScreen,
  StationDetailScreen,
  RouteCompareScreen,
  BookingConfirmScreen,
  SessionSummaryScreen,
  BookingsScreen,
  ImpactScreen,
  VehiclesScreen,
} from '../screens/driver';
import { colors } from '../theme/tokens';

const Tab = createBottomTabNavigator<DriverTabParamList>();
const Stack = createNativeStackNavigator<DriverStackParamList>();

const DriverTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Explore"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.ink3,
        tabBarLabelStyle: { fontFamily: 'Manrope_600SemiBold', fontSize: 11 },
      }}
    >
      <Tab.Screen name="Explore" component={HomeMapScreen} options={{ title: 'Map' }} />
      <Tab.Screen name="SmartCharge" component={SmartChargeScreen} options={{ title: 'Smart Schedule' }} />
      <Tab.Screen name="Activity" component={ActiveSessionScreen} options={{ title: 'Session' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

export const DriverNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold' },
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen
        name="DriverTabs"
        component={DriverTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StationDetail"
        component={StationDetailScreen}
        options={{ title: 'Station Details' }}
      />
      <Stack.Screen
        name="RouteCompare"
        component={RouteCompareScreen}
        options={{ title: 'Route & True Cost' }}
      />
      <Stack.Screen
        name="BookingConfirm"
        component={BookingConfirmScreen}
        options={{ title: 'Confirm Booking' }}
      />
      <Stack.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ title: 'Bookings & History' }}
      />
      <Stack.Screen
        name="Impact"
        component={ImpactScreen}
        options={{ title: 'Green Impact' }}
      />
      <Stack.Screen
        name="Vehicles"
        component={VehiclesScreen}
        options={{ title: 'My EV Garage' }}
      />
      <Stack.Screen
        name="SessionSummary"
        component={SessionSummaryScreen}
        options={{ title: 'Session Summary' }}
      />
    </Stack.Navigator>
  );
};
