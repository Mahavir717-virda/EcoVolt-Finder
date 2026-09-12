import React, { useEffect } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface MLLiveBadgeProps {
  label?: string;
}

export const MLLiveBadge: React.FC<MLLiveBadgeProps> = ({
  label = 'ML LIVE',
}) => {
  const shimmerOpacity = useSharedValue(0.75);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reducedMotion) => {
      if (!mounted || reducedMotion) return;
      shimmerOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.65, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    });

    return () => {
      mounted = false;
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.badgeContainer, animatedStyle]}>
      <Text style={styles.sparkleIcon}>✦</Text>
      <Text style={styles.badgeText}>{label}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
    flexShrink: 0,
  },
  sparkleIcon: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeText: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
