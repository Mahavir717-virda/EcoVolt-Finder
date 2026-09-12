/**
 * PulseAnimation Component
 * Creates a pulsing effect (useful for loading states, notifications)
 */

import React, { useEffect } from 'react';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface PulseAnimationProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  duration?: number;
  style?: any;
}

export function PulseAnimation({ 
  children, 
  minScale = 0.95,
  maxScale = 1.05,
  duration = 1000,
  style 
}: PulseAnimationProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(maxScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(minScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repeat
      true // Reverse
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
