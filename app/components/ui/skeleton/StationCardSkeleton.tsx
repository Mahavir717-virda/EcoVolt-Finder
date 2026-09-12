import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonCard } from './Skeleton';
import { spacing } from '@/styles/spacing';
import { useTheme } from '@/hooks/useTheme';

export interface StationCardSkeletonProps {
  variant?: 'default' | 'compact';
}

export const StationCardSkeleton: React.FC<StationCardSkeletonProps> = ({
  variant = 'default',
}) => {
  const { colors: themeColors, isDark } = useTheme();

  if (variant === 'compact') {
    return (
      <View
        style={[
          styles.compactCard,
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
            borderWidth: isDark ? 1 : 0,
          },
        ]}
      >
        <SkeletonCircle size={10} style={{ marginRight: spacing.sm }} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonText width="65%" height={16} />
          <SkeletonText width="85%" height={12} />
        </View>
        <Skeleton width={48} height={20} borderRadius={spacing.radius.full} />
      </View>
    );
  }

  return (
    <View style={styles.cardWrapper}>
      <SkeletonCard style={styles.card}>
        {/* Top Row: Thumbnail + Info + Bookmark */}
        <View style={styles.topRow}>
          {/* Thumbnail Skeleton */}
          <Skeleton
            width={100}
            height={100}
            borderRadius={spacing.radius.md}
            style={styles.thumbnail}
          />

          {/* Info Container */}
          <View style={styles.infoContainer}>
            {/* Title & Bookmark */}
            <View style={styles.nameRow}>
              <SkeletonText width="80%" height={18} />
              <SkeletonCircle size={24} />
            </View>

            {/* Address Row */}
            <View style={styles.addressRow}>
              <SkeletonText width="95%" height={13} style={{ marginTop: 6 }} />
              <SkeletonText width="60%" height={13} style={{ marginTop: 4 }} />
            </View>

            {/* Rating Row */}
            <View style={styles.ratingRow}>
              <Skeleton width={16} height={16} borderRadius={4} />
              <SkeletonText width={90} height={14} style={{ marginLeft: 6 }} />
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

        {/* Mid Row: Distance · Time · Availability */}
        <View style={styles.midRow}>
          <Skeleton width={64} height={24} borderRadius={spacing.radius.full} />
          <Skeleton width={56} height={24} borderRadius={spacing.radius.full} style={{ marginLeft: 6 }} />
          <View style={{ flex: 1 }} />
          <Skeleton width={90} height={24} borderRadius={spacing.radius.full} />
        </View>

        {/* Bottom Row: Connectors + Navigate CTA */}
        <View style={styles.bottomRow}>
          <View style={styles.connectorsGroup}>
            <Skeleton width={54} height={24} borderRadius={spacing.radius.full} />
            <Skeleton width={62} height={24} borderRadius={spacing.radius.full} style={{ marginLeft: 6 }} />
          </View>
          <Skeleton width={92} height={32} borderRadius={spacing.radius.full} />
        </View>
      </SkeletonCard>
    </View>
  );
};

export const StationListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <StationCardSkeleton key={`station-skel-${index}`} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    width: '100%',
  },
  cardWrapper: {
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.md,
    marginBottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  thumbnail: {
    marginRight: spacing.md,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  addressRow: {
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm + 2,
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: 2,
  },
  connectorsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 2,
    borderRadius: spacing.radius.md,
    marginBottom: spacing.xs,
  },
});
