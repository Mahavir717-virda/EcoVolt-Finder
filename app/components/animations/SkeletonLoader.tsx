/**
 * SkeletonLoader Animation Component
 * Animated skeleton placeholder for loading states
 */

import { colors } from '@/constants/colors';
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ 
  width = '100%',
  height = 20,
  borderRadius = 4,
  style 
}: SkeletonLoaderProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { 
        duration: 1500, 
        easing: Easing.inOut(Easing.ease) 
      }),
      -1, // Infinite repeat
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      shimmer.value,
      [0, 0.5, 1],
      [0.3, 0.6, 0.3]
    );

    return {
      opacity,
    };
  });

  return (
    <View style={[
      styles.container,
      { width: width as any, height, borderRadius },
      style
    ]}>
      <Animated.View style={[styles.shimmer, animatedStyle, { borderRadius }]} />
    </View>
  );
}

// Skeleton variants for common use cases
export function SkeletonText({ lines = 3, lastLineWidth = '60%' }: { lines?: number; lastLineWidth?: string }) {
  return (
    <View style={styles.textContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader 
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={14}
          style={{ marginBottom: index < lines - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonLoader height={150} borderRadius={12} />
      <View style={styles.cardContent}>
        <SkeletonLoader width="70%" height={18} />
        <SkeletonLoader width="50%" height={14} style={{ marginTop: 8 }} />
        <View style={styles.cardRow}>
          <SkeletonLoader width={80} height={24} borderRadius={12} />
          <SkeletonLoader width={60} height={24} borderRadius={12} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return <SkeletonLoader width={size} height={size} borderRadius={size / 2} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    backgroundColor: colors.neutral[300],
  },
  textContainer: {
    width: '100%',
  },
  card: {
    backgroundColor: colors.background.light,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
});
