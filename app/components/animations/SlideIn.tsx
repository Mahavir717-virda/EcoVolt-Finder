/**
 * SlideIn Animation Component
 * Animates children with a slide-in effect from different directions
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

type Direction = 'left' | 'right' | 'top' | 'bottom';

interface SlideInProps {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  distance?: number;
  useSpring?: boolean;
  style?: any;
}

export function SlideIn({ 
  children, 
  direction = 'bottom',
  delay = 0, 
  duration = 500,
  distance = 100,
  useSpring: useSpringAnimation = false,
  style 
}: SlideInProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(
    direction === 'left' ? -distance : direction === 'right' ? distance : 0
  );
  const translateY = useSharedValue(
    direction === 'top' ? -distance : direction === 'bottom' ? distance : 0
  );

  useEffect(() => {
    const animation = useSpringAnimation 
      ? withSpring(0, { damping: 15, stiffness: 100 })
      : withTiming(0, { duration, easing: Easing.out(Easing.cubic) });

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: duration * 0.6 })
    );
    
    if (direction === 'left' || direction === 'right') {
      translateX.value = withDelay(delay, animation);
    } else {
      translateY.value = withDelay(delay, animation);
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
