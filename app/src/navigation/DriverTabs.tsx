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

import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, Text, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator<DriverTabParamList>();
const Stack = createNativeStackNavigator<DriverStackParamList>();

const DriverTabNavigator: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const [currentLocation, setCurrentLocation] = React.useState('San Francisco, CA');

  const handleLocationPress = () => {
    Alert.alert(
      'Select Region',
      'Choose a region to find stations:',
      [
        { text: 'San Francisco, CA', onPress: () => setCurrentLocation('San Francisco, CA') },
        { text: 'New York, NY', onPress: () => setCurrentLocation('New York, NY') },
        { text: 'Austin, TX', onPress: () => setCurrentLocation('Austin, TX') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <Tab.Navigator
      initialRouteName="Explore"
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0 },
        headerTintColor: colors.ink,
        headerTitle: '',
        headerLeft: () => (
          <TouchableOpacity 
            onPress={handleLocationPress} 
            style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16 }}
          >
            <Ionicons name="location" size={20} color={colors.brand} />
            <Text style={{ marginLeft: 6, fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: colors.ink }}>
              {currentLocation}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.ink} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            style={{ marginRight: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brand + '20', justifyContent: 'center', alignItems: 'center' }}
          >
            <Ionicons name="person" size={18} color={colors.brand} />
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.ink3,
        tabBarLabelStyle: {
          fontFamily: 'Manrope_600SemiBold',
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Explore"
        component={HomeMapScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'map' : 'map-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="SmartCharge"
        component={SmartChargeScreen}
        options={{
          title: 'Smart Schedule',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'flash' : 'flash-outline'}
              size={size || 22}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Activity"
        component={ActiveSessionScreen}
        options={{
          title: 'Session',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'battery-charging' : 'battery-charging-outline'}
              size={size || 22}
              color={color}
            />
          ),
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
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
};
