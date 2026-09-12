/**
 * FadeIn Animation Component
 * Animates children with a fade-in effect
 */

import React, { useEffect } from 'react';
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

  useEffect(() => {
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
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
