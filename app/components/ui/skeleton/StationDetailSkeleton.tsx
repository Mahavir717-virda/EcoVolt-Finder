import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonCard } from './Skeleton';
import { spacing } from '@/styles/spacing';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const StationDetailSkeleton: React.FC = () => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* Hero Image Skeleton */}
      <Skeleton
        width={SCREEN_WIDTH}
        height={220}
        borderRadius={0}
      />

      <View style={styles.contentContainer}>
        {/* Title + Save Row */}
        <View style={styles.headerInfoRow}>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <SkeletonText width="85%" height={24} />
            <SkeletonText width="60%" height={16} style={{ marginTop: 6 }} />
          </View>
          <SkeletonCircle size={44} />
        </View>

        {/* Rating & Distance Badges */}
        <View style={styles.badgeRow}>
          <Skeleton width={68} height={26} borderRadius={spacing.radius.full} />
          <Skeleton width={74} height={26} borderRadius={spacing.radius.full} style={{ marginLeft: 8 }} />
          <Skeleton width={88} height={26} borderRadius={spacing.radius.full} style={{ marginLeft: 8 }} />
        </View>

        {/* Action Buttons Row (Directions, Share, Call) */}
        <View style={styles.actionsRow}>
          <Skeleton width="48%" height={44} borderRadius={spacing.radius.md} />
          <Skeleton width="48%" height={44} borderRadius={spacing.radius.md} />
        </View>

        {/* Live Grid Banner Skeleton */}
        <SkeletonCard style={styles.gridCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <SkeletonText width="45%" height={16} />
            <Skeleton width={60} height={20} borderRadius={spacing.radius.full} />
          </View>
          <Skeleton width="100%" height={32} borderRadius={spacing.radius.sm} />
          <SkeletonText width="70%" height={12} style={{ marginTop: 10 }} />
        </SkeletonCard>

        {/* Chargers Section Title */}
        <View style={styles.sectionHeader}>
          <SkeletonText width={160} height={20} />
          <SkeletonText width={80} height={14} />
        </View>

        {/* Charger Item Skeletons */}
        {[1, 2].map((i) => (
          <SkeletonCard key={`detail-charger-${i}`} style={styles.chargerCard}>
            <View style={styles.chargerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonCircle size={44} />
                <View style={{ marginLeft: 12 }}>
                  <SkeletonText width={140} height={16} />
                  <SkeletonText width={80} height={14} style={{ marginTop: 6 }} />
                </View>
              </View>
              <Skeleton width={70} height={24} borderRadius={spacing.radius.full} />
            </View>
            <Skeleton
              width="100%"
              height={50}
              borderRadius={spacing.radius.md}
              style={{ marginTop: 12 }}
            />
            <Skeleton
              width="100%"
              height={40}
              borderRadius={spacing.radius.md}
              style={{ marginTop: 12 }}
            />
          </SkeletonCard>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.screenPadding,
  },
  headerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm + 2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  gridCard: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chargerCard: {
    marginBottom: spacing.md,
  },
  chargerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
