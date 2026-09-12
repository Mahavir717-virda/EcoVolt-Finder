import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonCard } from './Skeleton';
import { spacing } from '@/styles/spacing';

export const ReservationDetailSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Status Banner */}
      <Skeleton width="100%" height={68} borderRadius={spacing.radius.lg} style={{ marginBottom: spacing.md }} />

      {/* Station Overview Card */}
      <SkeletonCard style={styles.card}>
        <View style={styles.stationRow}>
          <Skeleton width={70} height={70} borderRadius={spacing.radius.md} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonText width="80%" height={18} />
            <SkeletonText width="95%" height={13} style={{ marginTop: 6 }} />
            <SkeletonText width="50%" height={13} style={{ marginTop: 4 }} />
          </View>
        </View>
      </SkeletonCard>

      {/* Booking Details Card */}
      <SkeletonCard style={styles.card}>
        <SkeletonText width={140} height={16} style={{ marginBottom: 12 }} />
        {[1, 2, 3].map((i) => (
          <View key={`res-detail-line-${i}`} style={styles.lineItem}>
            <SkeletonText width={90} height={14} />
            <SkeletonText width={120} height={14} />
          </View>
        ))}
      </SkeletonCard>

      {/* Price Card */}
      <SkeletonCard style={styles.card}>
        <View style={styles.lineItem}>
          <SkeletonText width={100} height={16} />
          <SkeletonText width={80} height={20} />
        </View>
      </SkeletonCard>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Skeleton width="48%" height={48} borderRadius={spacing.radius.lg} />
        <Skeleton width="48%" height={48} borderRadius={spacing.radius.lg} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.screenPadding,
  },
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
});
