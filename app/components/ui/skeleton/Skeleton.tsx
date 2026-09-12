import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { colors } from '@/constants/colors';
import { spacing } from '@/styles/spacing';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
  highlightColor?: string;
  baseColor?: string;
}

/**
 * Base animated Skeleton primitive
 * Adapts to active light/dark theme and runs continuous smooth shimmer pulse
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = spacing.radius.sm,
  style,
  baseColor,
}) => {
  const { isDark } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: isDark ? [0.35, 0.75] : [0.45, 0.85],
  });

  const defaultBaseColor = baseColor || (isDark ? '#374151' : '#E5E7EB');

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
          backgroundColor: defaultBaseColor,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * SkeletonText: Pre-sized text placeholder
 */
export const SkeletonText: React.FC<{
  width?: DimensionValue;
  height?: number;
  style?: ViewStyle | ViewStyle[];
}> = ({ width = '100%', height = 14, style }) => (
  <Skeleton width={width} height={height} borderRadius={spacing.radius.xs} style={style} />
);

/**
 * SkeletonCircle: Circular placeholder for avatars, indicators, buttons
 */
export const SkeletonCircle: React.FC<{
  size?: number;
  style?: ViewStyle | ViewStyle[];
}> = ({ size = 40, style }) => (
  <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />
);

/**
 * SkeletonCard: Card surface wrapper that matches the active theme surface styling
 */
export const SkeletonCard: React.FC<{
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}> = ({ children, style }) => {
  const { colors: themeColors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
          borderWidth: isDark ? 1 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  skeletonBase: {
    overflow: 'hidden',
  },
  cardContainer: {
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
});
