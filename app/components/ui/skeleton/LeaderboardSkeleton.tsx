import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonCard } from './Skeleton';
import { spacing } from '@/styles/spacing';

export const LeaderboardSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Hero Standing Card */}
      <SkeletonCard style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <Skeleton width={80} height={24} borderRadius={spacing.radius.full} />
          <Skeleton width={70} height={24} borderRadius={spacing.radius.sm} />
        </View>
        <View style={styles.scoreRow}>
          <SkeletonCircle size={56} />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <SkeletonText width={120} height={26} />
            <SkeletonText width={90} height={14} style={{ marginTop: 6 }} />
          </View>
        </View>
        <View style={styles.statsStrip}>
          <Skeleton width="48%" height={32} borderRadius={spacing.radius.sm} />
          <Skeleton width="48%" height={32} borderRadius={spacing.radius.sm} />
        </View>
      </SkeletonCard>

      {/* Podium (Top 3) */}
      <View style={styles.podiumContainer}>
        <View style={[styles.podiumCol, { height: 130 }]}>
          <SkeletonCircle size={44} />
          <SkeletonText width={50} height={13} style={{ marginTop: 6 }} />
          <Skeleton width="100%" height={50} borderRadius={spacing.radius.sm} style={{ marginTop: 6 }} />
        </View>
        <View style={[styles.podiumCol, { height: 160 }]}>
          <SkeletonCircle size={52} />
          <SkeletonText width={60} height={14} style={{ marginTop: 6 }} />
          <Skeleton width="100%" height={80} borderRadius={spacing.radius.sm} style={{ marginTop: 6 }} />
        </View>
        <View style={[styles.podiumCol, { height: 110 }]}>
          <SkeletonCircle size={40} />
          <SkeletonText width={45} height={12} style={{ marginTop: 6 }} />
          <Skeleton width="100%" height={40} borderRadius={spacing.radius.sm} style={{ marginTop: 6 }} />
        </View>
      </View>

      {/* Driver List Rows */}
      <View style={styles.listSection}>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={`lb-row-${i}`} style={styles.rowCard}>
            <View style={styles.rowContent}>
              <Skeleton width={24} height={20} borderRadius={4} />
              <SkeletonCircle size={36} style={{ marginLeft: 12 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <SkeletonText width="60%" height={15} />
                <SkeletonText width="40%" height={12} style={{ marginTop: 4 }} />
              </View>
              <Skeleton width={60} height={18} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.screenPadding,
  },
  heroCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginVertical: spacing.md,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 4,
  },
  listSection: {
    marginTop: spacing.md,
  },
  rowCard: {
    padding: spacing.sm + 2,
    marginBottom: spacing.xs + 2,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
