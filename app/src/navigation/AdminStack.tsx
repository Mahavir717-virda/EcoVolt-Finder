import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminStackParamList } from './types';
import { AdminOverviewScreen, ZoneDetailScreen } from '../screens/admin';
import { colors } from '../theme/tokens';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="AdminOverview"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold' },
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen
        name="AdminOverview"
        component={AdminOverviewScreen}
        options={{ title: 'Grid Admin Center' }}
      />
      <Stack.Screen
        name="ZoneDetail"
        component={ZoneDetailScreen}
        options={{ title: 'Zone Diagnostics' }}
      />
      <Stack.Screen
        name="NetworkAnalytics"
        component={AdminOverviewScreen}
        options={{ title: 'Network Load & Renewable Shift' }}
      />
    </Stack.Navigator>
  );
};
