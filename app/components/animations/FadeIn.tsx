/**
 * FadeIn Animation Component
 * Animates children with a fade-in effect
 */

import React, { useEffect, useState } from 'react';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: any;
}

export function FadeIn({ 
  children, 
  delay = 0, 
  duration = 400,
  style 
}: FadeInProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  // Block touches while the view is animating/offset to prevent hit-test mismatches
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationDone(true), delay + duration + 50);
    opacity.value = withDelay(
      delay,
      withTiming(1, { 
        duration, 
        easing: Easing.out(Easing.cubic) 
      })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { 
        duration, 
        easing: Easing.out(Easing.cubic) 
      })
    );
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[animatedStyle, style]}
      pointerEvents={animationDone ? 'box-none' : 'none'}
    >
      {children}
    </Animated.View>
  );
}
