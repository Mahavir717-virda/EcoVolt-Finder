import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radii } from '../../theme/tokens';

export interface LinearProgressProps {
  progress?: number; // 0 to 1 for determinate mode
  indeterminate?: boolean;
  color?: string;
  backgroundColor?: string;
  height?: number;
  reduceMotion?: boolean;
  style?: ViewStyle;
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
  progress = 0,
  indeterminate = false,
  color = colors.brand,
  backgroundColor = colors.surfaceSunken,
  height = 4,
  reduceMotion = false,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (indeterminate && !reduceMotion) {
      const animation = Animated.loop(
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        })
      );
      animation.start();
      return () => animation.stop();
    }
  }, [animatedValue, indeterminate, reduceMotion]);

  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  const leftInterpolation = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['-30%', '100%'],
  });

  return (
    <View
      style={[
        styles.track,
        {
          height,
          backgroundColor,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      {indeterminate ? (
        <Animated.View
          style={[
            styles.indeterminateBar,
            {
              backgroundColor: color,
              borderRadius: height / 2,
              left: reduceMotion ? '25%' : leftInterpolation,
              width: '35%',
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.determinateBar,
            {
              backgroundColor: color,
              width: `${clampedProgress * 100}%`,
              borderRadius: height / 2,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  determinateBar: {
    height: '100%',
  },
  indeterminateBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
});
