import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../../theme/tokens';

export interface ProgressThinProps {
  /** Progress value 0..1 */
  progress: number;
  /** Fill color — defaults to brand. Pass warningAmber or danger for risk meters. */
  color?: string;
  height?: number;
  reduceMotion?: boolean;
  style?: ViewStyle;
}

/**
 * ProgressThin — 6dp height track (surface-sunken), brand fill, radius full.
 * ProgressFill animation: 300ms ease on value change.
 * Used for booking progress, risk meters (Manager screen), "N Min Remaining".
 */
export const ProgressThin: React.FC<ProgressThinProps> = ({
  progress,
  color = colors.brand,
  height = 6,
  reduceMotion = false,
  style,
}) => {
  const animatedWidth = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    const clampedProgress = Math.min(Math.max(progress, 0), 1);
    if (reduceMotion) {
      animatedWidth.setValue(clampedProgress);
      return;
    }
    Animated.timing(animatedWidth, {
      toValue: clampedProgress,
      duration: 300,
      useNativeDriver: false, // width cannot use native driver
    }).start();
  }, [progress, animatedWidth, reduceMotion]);

  const widthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width: widthInterpolated,
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
