/**
 * ScaleIn Animation Component
 * Animates children with a scale-in effect (zoom)
 */

import React, { useEffect, useState } from 'react';
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

  // Block touches while the view is animating to prevent hit-test mismatches
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    const totalDuration = useSpringAnimation ? delay + 600 : delay + duration;
    const timer = setTimeout(() => setAnimationDone(true), totalDuration + 50);

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

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
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
