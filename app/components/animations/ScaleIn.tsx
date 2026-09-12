/**
 * ScaleIn Animation Component
 * Animates children with a scale-in effect (zoom)
 */

import React, { useEffect } from 'react';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  initialScale?: number;
  useSpring?: boolean;
  style?: any;
}

export function ScaleIn({ 
  children, 
  delay = 0, 
  duration = 400,
  initialScale = 0.8,
  useSpring: useSpringAnimation = true,
  style 
}: ScaleInProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(initialScale);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: duration * 0.6 })
    );
    
    if (useSpringAnimation) {
      scale.value = withDelay(
        delay,
        withSpring(1, { damping: 12, stiffness: 120 })
      );
    } else {
      scale.value = withDelay(
        delay,
        withTiming(1, { duration, easing: Easing.out(Easing.back(1.5)) })
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
