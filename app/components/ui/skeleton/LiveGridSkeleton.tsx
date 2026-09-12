import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonCard } from './Skeleton';
import { spacing } from '@/styles/spacing';
import { useTheme } from '@/hooks/useTheme';

export const LiveGridSkeleton: React.FC = () => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.gridBanner,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          borderWidth: isDark ? 1 : 0,
        },
      ]}
    >
      {/* Top row: Live indicator + zone & Band badge */}
      <View style={styles.topRow}>
        <View style={styles.zoneLeft}>
          <SkeletonCircle size={8} style={{ marginRight: 6 }} />
          <SkeletonText width={130} height={14} />
        </View>
        <Skeleton width={88} height={24} borderRadius={spacing.radius.full} />
      </View>

      {/* Main row: Big renewable % and carbon stats */}
      <View style={styles.mainRow}>
        <View style={{ gap: 4 }}>
          <SkeletonText width={76} height={36} />
          <SkeletonText width={96} height={12} />
        </View>
        <View style={styles.statsRight}>
          <SkeletonText width={130} height={14} />
          <SkeletonText width={110} height={14} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Stacked Grid Mix Bar */}
      <Skeleton
        width="100%"
        height={10}
        borderRadius={5}
        style={styles.gridBar}
      />

      {/* Legend Row */}
      <View style={styles.legendRow}>
        {[1, 2, 3, 4].map((i) => (
          <View key={`grid-legend-${i}`} style={styles.legendItem}>
            <SkeletonCircle size={6} style={{ marginRight: 4 }} />
            <SkeletonText width={44} height={11} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridBanner: {
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  zoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  statsRight: {
    alignItems: 'flex-end',
  },
  gridBar: {
    marginBottom: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
