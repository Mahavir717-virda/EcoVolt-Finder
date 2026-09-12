import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonText, SkeletonCard } from './Skeleton';
import { spacing } from '@/styles/spacing';
import { useTheme } from '@/hooks/useTheme';

export const ProfileStatsSkeleton: React.FC = () => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.statsContainer,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          borderWidth: isDark ? 1 : 0,
        },
      ]}
    >
      <View style={styles.statItem}>
        <SkeletonText width={50} height={20} />
        <SkeletonText width={70} height={12} style={{ marginTop: 6 }} />
      </View>
      <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
      <View style={styles.statItem}>
        <SkeletonText width={60} height={20} />
        <SkeletonText width={65} height={12} style={{ marginTop: 6 }} />
      </View>
      <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
      <View style={styles.statItem}>
        <SkeletonText width={55} height={20} />
        <SkeletonText width={60} height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: spacing.screenPadding,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 36,
  },
});
