import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';

export interface RadioCircleProps {
  selected: boolean;
  /** Disable the scale-in animation (reduceMotion) */
  reduceMotion?: boolean;
}

/**
 * RadioCircle — 20dp outline circle (ink3 when unselected).
 * Selected: brand outline + brand filled 10dp inner dot.
 * Animates dot scale-in 150ms ease-out on selection.
 */
export const RadioCircle: React.FC<RadioCircleProps> = ({
  selected,
  reduceMotion = false,
}) => {
  const dotScale = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      dotScale.setValue(selected ? 1 : 0);
      return;
    }
    Animated.timing(dotScale, {
      toValue: selected ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [selected, dotScale, reduceMotion]);

  return (
    <View
      style={[
        styles.outerRing,
        selected ? styles.outerRingSelected : styles.outerRingUnselected,
      ]}
    >
      <Animated.View
        style={[
          styles.innerDot,
          { transform: [{ scale: dotScale }] },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRingUnselected: {
    borderColor: colors.ink3,
  },
  outerRingSelected: {
    borderColor: colors.brand,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
});
