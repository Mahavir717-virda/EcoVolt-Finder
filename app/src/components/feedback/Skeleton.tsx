import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  reduceMotion?: boolean;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  reduceMotion = false,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.6);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC<{ reduceMotion?: boolean; style?: ViewStyle }> = ({
  reduceMotion,
  style,
}) => {
  return (
    <View style={[styles.cardContainer, style]}>
      {/* thumb + header row */}
      <View style={styles.cardTopRow}>
        <Skeleton width={72} height={72} borderRadius={radii.thumbnail} reduceMotion={reduceMotion} />
        <View style={styles.cardHeaderLines}>
          <Skeleton width="70%" height={16} borderRadius={radii.sm} reduceMotion={reduceMotion} />
          <Skeleton width="90%" height={12} borderRadius={radii.sm} reduceMotion={reduceMotion} />
          <Skeleton width="50%" height={12} borderRadius={radii.sm} reduceMotion={reduceMotion} />
        </View>
      </View>
      {/* connector row */}
      <View style={styles.cardFooter}>
        <Skeleton width={40} height={40} borderRadius={radii.pill} reduceMotion={reduceMotion} />
        <Skeleton width={40} height={40} borderRadius={radii.pill} reduceMotion={reduceMotion} />
        <Skeleton width="30%" height={40} borderRadius={radii.input} reduceMotion={reduceMotion} />
      </View>
    </View>
  );
};

export const SkeletonRow: React.FC<{ reduceMotion?: boolean; style?: ViewStyle }> = ({
  reduceMotion,
  style,
}) => {
  return (
    <View style={[styles.rowContainer, style]}>
      <Skeleton width={40} height={40} borderRadius={radii.pill} reduceMotion={reduceMotion} />
      <View style={styles.rowCenter}>
        <Skeleton width="70%" height={16} borderRadius={radii.sm} reduceMotion={reduceMotion} />
        <Skeleton width="45%" height={12} borderRadius={radii.sm} reduceMotion={reduceMotion} />
      </View>
      <Skeleton width={32} height={16} borderRadius={radii.sm} reduceMotion={reduceMotion} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: colors.surfaceSunken,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    gap: spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  cardHeaderLines: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowCenter: {
    flex: 1,
    gap: 6,
  },
});
