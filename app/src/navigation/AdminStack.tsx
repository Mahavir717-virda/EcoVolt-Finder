import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminStackParamList } from './types';
import { 
  AdminOverviewScreen,
  ZoneDrilldownScreen,
  OperatorOversightScreen,
  DataQualityScreen,
  AdminAnalyticsScreen,
  UserManagementScreen,
  StationRegistryScreen,
  SystemHealthScreen,
  AuditLogScreen,
  ComplianceSecurityScreen
} from '../screens/admin';
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
        component={ZoneDrilldownScreen}
        options={{ title: 'Zone Diagnostics' }}
      />
      <Stack.Screen
        name="NetworkAnalytics"
        component={AdminAnalyticsScreen}
        options={{ title: 'Network Load & Analytics' }}
      />
      <Stack.Screen
        name="OperatorOversight"
        component={OperatorOversightScreen}
        options={{ title: 'Operator Oversight' }}
      />
      <Stack.Screen
        name="DataQuality"
        component={DataQualityScreen}
        options={{ title: 'Data Quality Monitoring' }}
      />
      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'User & Role Management' }}
      />
      <Stack.Screen
        name="StationRegistry"
        component={StationRegistryScreen}
        options={{ title: 'Station Registry Governance' }}
      />
      <Stack.Screen
        name="SystemHealth"
        component={SystemHealthScreen}
        options={{ title: 'System Health / Ops' }}
      />
      <Stack.Screen
        name="AuditLog"
        component={AuditLogScreen}
        options={{ title: 'Audit Log' }}
      />
      <Stack.Screen
        name="ComplianceSecurity"
        component={ComplianceSecurityScreen}
        options={{ title: 'Compliance & Security' }}
      />
    </Stack.Navigator>
  );
};
