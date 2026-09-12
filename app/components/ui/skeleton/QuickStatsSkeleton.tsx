import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonCard } from './Skeleton';
import { spacing } from '@/styles/spacing';
import { useTheme } from '@/hooks/useTheme';

export const QuickStatsSkeleton: React.FC = () => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        {[1, 2, 3].map((i) => (
          <View
            key={`quick-stat-${i}`}
            style={[
              styles.statCard,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
          >
            <SkeletonCircle size={20} />
            <SkeletonText width={40} height={18} style={{ marginTop: 6 }} />
            <SkeletonText width={55} height={12} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: spacing.radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
});
