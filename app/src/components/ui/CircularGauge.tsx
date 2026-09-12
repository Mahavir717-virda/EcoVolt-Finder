import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, spacing } from '../../theme/tokens';
import { Text } from '../primitives/Text';

export interface CircularGaugeProps {
  /** Main value displayed in the center (e.g. "24.5" for kWh) */
  value: string;
  /** Unit label below the value (e.g. "kWh") */
  unit?: string;
  /** Descriptive label at bottom (e.g. "Energy Delivered") */
  label?: string;
  /** Icon element above the value (e.g. amber lightning bolt) */
  icon?: React.ReactNode;
  /** Progress 0..1 for the ring fill */
  progress?: number;
  /** Ring color — driven by token (brand, warningAmber, danger for greenness) */
  ringColor?: string;
  /** Gauge size in dp — defaults to 200 */
  size?: number;
  /** Ring stroke width — defaults to 10 */
  strokeWidth?: number;
  /** Enable ChargingPulse glow animation (used on Active Charging screen only) */
  glowPulse?: boolean;
  reduceMotion?: boolean;
  style?: ViewStyle;
}

/**
 * CircularGauge — SVG ring (stroke 10), color-driven via ringColor prop.
 * Soft outer glow (blurred duplicate ring, opacity 0.4↔0.8, 2.5s loop if glowPulse=true).
 * Centered: icon + BigNumeral value + unit caption + label caption below.
 * 
 * Used on ActiveSessionScreen (ChargingPulse animation enabled),
 * AND on StationDetailScreen greenness section (ring color from greennessColor()).
 * Admin/Impact hero stats also reuse this gauge.
 */
export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  unit,
  label,
  icon,
  progress = 0.75,
  ringColor = colors.brand,
  size = 200,
  strokeWidth = 10,
  glowPulse = false,
  reduceMotion = false,
  style,
}) => {
  const glowOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!glowPulse || reduceMotion) {
      glowOpacity.setValue(glowPulse ? 0.4 : 0);
      return;
    }
    // ChargingPulse: opacity 0.4↔0.8, 2.5s ease-in-out loop
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.8,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.4,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [glowPulse, reduceMotion, glowOpacity]);

  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const radius = (size - strokeWidth * 2) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedProgress);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Glow ring (blurred duplicate, ChargingPulse animation) */}
      {glowPulse && (
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
              borderColor: ringColor,
              opacity: glowOpacity,
            },
          ]}
        />
      )}

      {/* SVG ring */}
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.surfaceSunken}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {icon != null && <View style={styles.iconSlot}>{icon}</View>}
        <Text
          variant="bigNumeral"
          color={ringColor}
          tabularNums
          align="center"
          style={styles.value}
        >
          {value}
        </Text>
        {unit != null && (
          <Text variant="micro" color={colors.ink2} align="center">
            {unit}
          </Text>
        )}
      </View>

      {/* Label below gauge */}
      {label != null && (
        <View style={styles.labelBelow}>
          <Text variant="caption" color={colors.ink2} align="center">
            {label}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 8,
    zIndex: 0,
  },
  svg: {
    position: 'absolute',
    zIndex: 1,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    zIndex: 2,
  },
  iconSlot: {
    marginBottom: 4,
  },
  value: {
    fontFamily: 'Manrope_700Bold',
  },
  labelBelow: {
    position: 'absolute',
    bottom: -spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
