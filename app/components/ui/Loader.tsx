/**
 * Loader Component
 * Various loading indicators for different use cases
 */

import { colors } from '@/constants/colors';
import { spacing } from '@/styles/spacing';
import React from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface LoaderProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}

interface FullScreenLoaderProps {
  text?: string;
  transparent?: boolean;
}

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

/**
 * Simple activity indicator
 */
export function Loader({
  size = 'large',
  color = colors.primary[500],
  text,
}: LoaderProps) {
  return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.loaderText}>{text}</Text>}
    </View>
  );
}

/**
 * Full screen loading overlay
 */
export function FullScreenLoader({
  text = 'Loading...',
  transparent = false,
}: FullScreenLoaderProps) {
  return (
    <View style={[styles.fullScreen, transparent && styles.transparent]}>
      <View style={styles.fullScreenContent}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
        <Text style={styles.fullScreenText}>{text}</Text>
      </View>
    </View>
  );
}

/**
 * Skeleton loading placeholder
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = spacing.radius.sm,
  style,
}: SkeletonProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
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
}

/**
 * Card skeleton for station/charger cards
 */
export function CardSkeleton() {
  return (
    <View style={styles.cardSkeleton}>
      <View style={styles.cardSkeletonHeader}>
        <Skeleton width={48} height={48} borderRadius={spacing.radius.md} />
        <View style={styles.cardSkeletonHeaderText}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Skeleton width="100%" height={14} style={{ marginTop: 12 }} />
      <Skeleton width="70%" height={14} style={{ marginTop: 8 }} />
    </View>
  );
}

/**
 * List skeleton - renders multiple card skeletons
 */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.listSkeleton}>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loaderText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.neutral[600],
  },

  // Full screen
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  transparent: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  fullScreenContent: {
    alignItems: 'center',
  },
  fullScreenText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.neutral[700],
    fontWeight: '500',
  },

  // Skeleton
  skeleton: {
    backgroundColor: colors.neutral[200],
  },

  // Card skeleton
  cardSkeleton: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardSkeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSkeletonHeaderText: {
    flex: 1,
    marginLeft: spacing.md,
  },

  // List skeleton
  listSkeleton: {
    padding: spacing.md,
  },
});
