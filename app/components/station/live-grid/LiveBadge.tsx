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

interface LiveBadgeProps {
  label?: string;
  dotColor?: string;
}

export const LiveBadge: React.FC<LiveBadgeProps> = ({
  label = 'LIVE',
  dotColor = '#10B981',
}) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.85);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reducedMotion) => {
      if (!mounted || reducedMotion) return;
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.35, { duration: 1300, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 1300, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1300, easing: Easing.out(Easing.ease) }),
          withTiming(0.85, { duration: 1300, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
    });

    return () => {
      mounted = false;
    };
  }, []);

  const animatedHaloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  return (
    <View style={styles.badgeContainer}>
      <View style={styles.dotWrapper}>
        <Animated.View
          style={[
            styles.dotHalo,
            { backgroundColor: dotColor },
            animatedHaloStyle,
          ]}
        />
        <View style={[styles.dotCore, { backgroundColor: dotColor }]} />
      </View>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 5,
    flexShrink: 0,
  },
  dotWrapper: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dotHalo: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotCore: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    color: '#34D399',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
