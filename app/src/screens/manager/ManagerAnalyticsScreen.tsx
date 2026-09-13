import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { http } from '../../api/http';
import {
  Text,
  Button,
  Card,
  SkeletonCard,
  LinearProgress,
} from '../../components';
import { colors, radii, spacing } from '../../theme/tokens';

interface TrendDay {
  date: string;
  utilization: number;
  revenue: number;
  renewableShare: number;
  avgPrice: number;
  demandPeakKw: number;
}

export const ManagerAnalyticsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useQuery<{ trends: TrendDay[] }>({
    queryKey: ['manager', 'analytics', 'trends'],
    queryFn: async () => {
      const res = await http.get<{ trends: TrendDay[] }>('/analytics/manager/trends');
      return res;
    },
    staleTime: 10000,
  });

  const handleDownloadCsv = async () => {
    try {
      // In a real app, this might use expo-file-system or Linking to a signed URL.
      // For this hackathon, we'll open a simulated URL or directly download if supported.
      const exportUrl = `http://localhost:3000/api/v1/analytics/manager/export`;
      await Linking.openURL(exportUrl);
    } catch (err) {
      Alert.alert('Error', 'Failed to open CSV download link.');
    }
  };

  const trends = data?.trends || [];
  
  // Basic aggregations
  const totalRevenue = trends.reduce((sum, d) => sum + d.revenue, 0);
  const totalUtilization = trends.reduce((sum, d) => sum + d.utilization, 0);
  const maxDemand = Math.max(...trends.map(d => d.demandPeakKw), 0);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <View style={styles.header}>
          <Text variant="h1" style={styles.screenTitle}>
            Network Analytics
          </Text>
          <Text variant="caption" color={colors.ink2}>
            Utilization, revenue, and demand trends (Last 30 days)
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <>
            <View style={styles.actionRow}>
              <Button
                label="Download CSV Report"
                variant="secondary"
                onPress={handleDownloadCsv}
                style={styles.csvBtn}
              />
            </View>

            {/* Summary Cards */}
            <View style={styles.grid}>
              <Card elevation="e1" style={styles.gridCard}>
                <Text variant="micro" color={colors.ink3}>TOTAL REVENUE (30D)</Text>
                <Text variant="h2" color={colors.ink}>₹{totalRevenue.toLocaleString()}</Text>
              </Card>
              <Card elevation="e1" style={styles.gridCard}>
                <Text variant="micro" color={colors.ink3}>SESSIONS (30D)</Text>
                <Text variant="h2" color={colors.ink}>{totalUtilization}</Text>
              </Card>
            </View>

            <Card elevation="e1" style={styles.fullCard}>
                <Text variant="micro" color={colors.ink3}>MAX PEAK DEMAND (30D)</Text>
                <Text variant="h2" color={colors.danger}>{maxDemand} kW</Text>
                <Text variant="caption" color={colors.ink2}>Across all managed stations</Text>
            </Card>

            {/* Daily Trends (Simple visualization list) */}
            <Text variant="h2" style={styles.sectionTitle}>Daily Performance</Text>
            <View style={styles.listContainer}>
              {trends.length === 0 && (
                <Text variant="body" color={colors.ink2}>No data available for the last 30 days.</Text>
              )}
              {trends.map((day, i) => (
                <Card key={i} elevation="e0" style={styles.trendRow}>
                  <View style={styles.trendHeader}>
                    <Text variant="title" color={colors.ink}>{day.date}</Text>
                    <Text variant="title" color={colors.brand}>₹{day.revenue.toFixed(2)}</Text>
                  </View>
                  <View style={styles.trendDetails}>
                    <View style={styles.metric}>
                      <Text variant="micro" color={colors.ink3}>SESSIONS</Text>
                      <Text variant="bodyMedium" color={colors.ink}>{day.utilization}</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text variant="micro" color={colors.ink3}>RENEWABLE</Text>
                      <Text variant="bodyMedium" color={colors.volt}>{day.renewableShare}%</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text variant="micro" color={colors.ink3}>PEAK LOAD</Text>
                      <Text variant="bodyMedium" color={day.demandPeakKw > 120 ? colors.danger : colors.ink}>{day.demandPeakKw}kW</Text>
                    </View>
                  </View>
                  {/* Fake sparkline/progress for renewable share */}
                  <View style={styles.barWrap}>
                     <LinearProgress 
                        progress={day.renewableShare / 100}
                        color={colors.volt}
                        backgroundColor={colors.surfaceSunken}
                        height={6}
                     />
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
  },
  header: {
    marginBottom: spacing.base,
  },
  screenTitle: {
    color: colors.ink,
    marginBottom: 2,
  },
  skeletonContainer: {
    gap: spacing.base,
  },
  actionRow: {
    marginBottom: spacing.base,
  },
  csvBtn: {
    height: 40,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gridCard: {
    flex: 1,
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  fullCard: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  listContainer: {
    gap: spacing.xs,
  },
  trendRow: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  trendDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  metric: {
    alignItems: 'flex-start',
  },
  barWrap: {
    borderRadius: radii.pill,
    overflow: 'hidden',
  }
});
