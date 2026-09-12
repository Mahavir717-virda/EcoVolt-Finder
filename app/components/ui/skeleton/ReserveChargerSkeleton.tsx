import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonCard } from './Skeleton';
import { spacing } from '@/styles/spacing';

export const ReserveChargerSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Charger Info Card */}
      <SkeletonCard style={styles.card}>
        <View style={styles.chargerHeader}>
          <SkeletonCircle size={48} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonText width="80%" height={18} />
            <SkeletonText width="55%" height={14} style={{ marginTop: 6 }} />
          </View>
        </View>
        <Skeleton width="100%" height={32} borderRadius={spacing.radius.sm} style={{ marginTop: 12 }} />
      </SkeletonCard>

      {/* Select Vehicle */}
      <View style={styles.section}>
        <SkeletonText width={120} height={16} style={{ marginBottom: 8 }} />
        <SkeletonCard style={{ padding: spacing.sm + 2, marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SkeletonCircle size={36} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <SkeletonText width="60%" height={15} />
              <SkeletonText width="40%" height={12} style={{ marginTop: 4 }} />
            </View>
          </View>
        </SkeletonCard>
      </View>

      {/* Date Selector */}
      <View style={styles.section}>
        <SkeletonText width={100} height={16} style={{ marginBottom: 8 }} />
        <View style={styles.dateRow}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={`date-chip-${i}`}
              width="22%"
              height={56}
              borderRadius={spacing.radius.md}
            />
          ))}
        </View>
      </View>

      {/* Time Slots Grid */}
      <View style={styles.section}>
        <SkeletonText width={130} height={16} style={{ marginBottom: 8 }} />
        <View style={styles.slotsGrid}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <Skeleton
              key={`slot-${i}`}
              width="31%"
              height={40}
              borderRadius={spacing.radius.md}
              style={{ marginBottom: 8 }}
            />
          ))}
        </View>
      </View>

      {/* Cost Summary Box */}
      <SkeletonCard style={styles.costBox}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonText width={110} height={15} />
          <SkeletonText width={70} height={18} />
        </View>
      </SkeletonCard>

      {/* Submit Button */}
      <Skeleton width="100%" height={50} borderRadius={spacing.radius.lg} style={{ marginTop: 16 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.screenPadding,
  },
  card: {
    marginBottom: spacing.md,
  },
  chargerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.md,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  costBox: {
    marginTop: spacing.xs,
    padding: spacing.md,
  },
});
