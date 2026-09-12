import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DriverTabParamList, DriverStackParamList } from './types';
import {
  HomeMapScreen,
  ProfileScreen,
  StationDetailScreen,
  RouteCompareScreen,
  BookingConfirmScreen,
  SessionSummaryScreen,
  BookingsScreen,
  ImpactScreen,
  VehiclesScreen,
  SlotAvailabilityScreen,
  SavedScreen,
} from '../screens/driver';
import { colors } from '../theme/tokens';
import { CapsuleTabBar } from '../components/navigation/CapsuleTabBar';

const Tab = createBottomTabNavigator<DriverTabParamList>();
const Stack = createNativeStackNavigator<DriverStackParamList>();

const DriverTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props) => <CapsuleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* 1. Reservations / Bookings Tab */}
      <Tab.Screen
        name="Reservations"
        component={BookingsScreen}
        options={{
          title: 'Bookings',
        }}
      />

      {/* 2. Vehicle / EV Garage Tab */}
      <Tab.Screen
        name="Vehicle"
        component={VehiclesScreen}
        options={{
          title: 'Garage',
        }}
      />

      {/* 3. Central HOME Primary Tab */}
      <Tab.Screen
        name="Home"
        component={HomeMapScreen}
        options={{
          title: 'Home',
        }}
      />

      {/* 4. Saved Stations Tab */}
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{
          title: 'Saved',
        }}
      />

      {/* 5. Profile Tab */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
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
      <Stack.Screen
        name="SlotAvailability"
        component={SlotAvailabilityScreen}
        options={{ title: 'Slot Availability', headerShown: false }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
};
