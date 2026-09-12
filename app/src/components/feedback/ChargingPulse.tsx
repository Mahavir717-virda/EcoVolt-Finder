import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/tokens';

export interface ChargingPulseProps {
  size?: number;
  reduceMotion?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const ChargingPulse: React.FC<ChargingPulseProps> = ({
  size = 72,
  reduceMotion = false,
  children,
  style,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reduceMotion) {
      scale.setValue(1);
      opacity.setValue(0.4);
      return;
    }

    // ChargingPulse animation: opacity 0.4↔0.8, 2.5s ease-in-out loop
    const pulseAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [opacity, scale, reduceMotion]);

  const ringRadius = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Outer pulsing volt ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size,
            height: size,
            borderRadius: ringRadius,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />

      {/* Core volt badge / child container */}
      <View
        style={[
          styles.core,
          {
            width: size * 0.75,
            height: size * 0.75,
            borderRadius: (size * 0.75) / 2,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: colors.brandTint,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  core: {
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
});
