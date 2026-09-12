import React from 'react';
import {
  Animated,
  Pressable as RNPressable,
  PressableProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';

export interface ScalePressableProps extends PressableProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Disable the press animation (e.g. when reduceMotion is enabled) */
  reduceMotion?: boolean;
}

/**
 * Global interaction wrapper — PressScale animation.
 * Every tappable element in the app routes through this component.
 * On press-in: scales to 0.97 + dims by 8% brightness.
 * On press-out: springs back.
 */
export const ScalePressable: React.FC<ScalePressableProps> = ({
  children,
  style,
  reduceMotion = false,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    if (!reduceMotion) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 0.97,
          useNativeDriver: true,
          speed: 60,
          bounciness: 0,
        }),
        Animated.timing(opacity, {
          toValue: 0.92,
          duration: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
    if (!reduceMotion) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 40,
          bounciness: 6,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
    onPressOut?.(e);
  };

  return (
    <RNPressable onPressIn={handlePressIn} onPressOut={handlePressOut} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
        {children}
      </Animated.View>
    </RNPressable>
  );
};

const styles = StyleSheet.create({});
