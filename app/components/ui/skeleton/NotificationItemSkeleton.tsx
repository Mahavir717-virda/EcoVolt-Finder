import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText, SkeletonCard } from './Skeleton';
import { spacing } from '@/styles/spacing';

export const NotificationItemSkeleton: React.FC = () => {
  return (
    <SkeletonCard style={styles.card}>
      <View style={styles.container}>
        <SkeletonCircle size={40} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonText width="70%" height={16} />
          <SkeletonText width="95%" height={13} style={{ marginTop: 6 }} />
          <SkeletonText width="35%" height={11} style={{ marginTop: 6 }} />
        </View>
      </View>
    </SkeletonCard>
  );
};

export const NotificationListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <NotificationItemSkeleton key={`notif-skel-${index}`} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: spacing.screenPadding,
  },
  card: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
