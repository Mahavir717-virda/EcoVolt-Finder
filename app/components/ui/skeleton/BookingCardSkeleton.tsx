import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonCard } from './Skeleton';
import { spacing } from '@/styles/spacing';
import { useTheme } from '@/hooks/useTheme';

export const BookingCardSkeleton: React.FC = () => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View style={styles.cardWrapper}>
      <SkeletonCard style={styles.card}>
        {/* Header Row: Station Name + Status Badge */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <SkeletonText width="75%" height={18} />
            <SkeletonText width="90%" height={13} style={{ marginTop: 6 }} />
          </View>
          <Skeleton width={80} height={26} borderRadius={spacing.radius.full} />
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

        {/* Info Grid: Date/Time + Charger Type */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <SkeletonCircle size={16} />
            <SkeletonText width={90} height={14} style={{ marginLeft: 6 }} />
          </View>
          <View style={styles.detailItem}>
            <SkeletonCircle size={16} />
            <SkeletonText width={80} height={14} style={{ marginLeft: 6 }} />
          </View>
        </View>

        {/* Charger Specs + Price Row */}
        <View style={[styles.specsBox, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SkeletonCircle size={28} />
            <View style={{ marginLeft: 8 }}>
              <SkeletonText width={100} height={14} />
              <SkeletonText width={60} height={12} style={{ marginTop: 4 }} />
            </View>
          </View>
          <Skeleton width={70} height={22} borderRadius={spacing.radius.sm} />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <Skeleton width="48%" height={40} borderRadius={spacing.radius.md} />
          <Skeleton width="48%" height={40} borderRadius={spacing.radius.md} />
        </View>
      </SkeletonCard>
    </View>
  );
};

export const BookingListSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <BookingCardSkeleton key={`booking-skel-${index}`} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    width: '100%',
    paddingTop: spacing.xs,
  },
  cardWrapper: {
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.md,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm + 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: spacing.radius.md,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
