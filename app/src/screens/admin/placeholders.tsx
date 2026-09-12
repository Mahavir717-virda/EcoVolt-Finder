import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../../components';
import { colors, spacing } from '../../theme/tokens';

const PlaceholderScreen: React.FC<{ title: string }> = ({ title }) => (
  <View style={styles.container}>
    <Text variant="h2">{title}</Text>
    <Text variant="body" color={colors.ink2}>Under Construction</Text>
  </View>
);

export const ZoneDrilldownScreen = () => <PlaceholderScreen title="Zone Diagnostics" />;
export const OperatorOversightScreen = () => <PlaceholderScreen title="Operator Oversight" />;
export const DataQualityScreen = () => <PlaceholderScreen title="Data Quality" />;
export const AdminAnalyticsScreen = () => <PlaceholderScreen title="Platform Analytics" />;
export const UserManagementScreen = () => <PlaceholderScreen title="User Management" />;
export const StationRegistryScreen = () => <PlaceholderScreen title="Station Registry" />;
export const SystemHealthScreen = () => <PlaceholderScreen title="System Health" />;
export const AuditLogScreen = () => <PlaceholderScreen title="Audit Log" />;
export const ComplianceSecurityScreen = () => <PlaceholderScreen title="Compliance & Security" />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    padding: spacing.lg,
  },
});
