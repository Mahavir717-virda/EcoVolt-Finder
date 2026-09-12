import React, { useEffect } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { getInterpolatedGridTheme, GridThemeColors } from './gridGradients';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LiveEnergyGaugeProps {
  renewablePct: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export const LiveEnergyGauge: React.FC<LiveEnergyGaugeProps> = ({
  renewablePct,
  size = 104,
  strokeWidth = 7,
  label = 'renewable',
}) => {
  const theme: GridThemeColors = getInterpolatedGridTheme(renewablePct);
  const radius = (size - strokeWidth - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Reanimated progress (0 to 1)
  const progress = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((isReduced) => {
      if (!mounted) return;
      const target = Math.max(0, Math.min(100, renewablePct)) / 100;
      if (isReduced) {
        progress.value = target;
      } else {
        progress.value = withTiming(target, {
          duration: 900,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

    return () => {
      mounted = false;
    };
  }, [renewablePct]);

  // Main progress arc strokeDashoffset
  const animatedArcProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          {/* Radial Center Backlight */}
          <RadialGradient
            id="gaugeCenterGlow"
            cx="50%"
            cy="50%"
            rx="50%"
            ry="50%"
          >
            <Stop offset="0%" stopColor={theme.ambientGlow} stopOpacity="0.2" />
            <Stop offset="80%" stopColor={theme.accentColor} stopOpacity="0.03" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>

          {/* Progress Stroke Gradient */}
          <LinearGradient id="gaugeStrokeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={theme.ambientGlow} />
            <Stop offset="50%" stopColor={theme.accentColor} />
            <Stop offset="100%" stopColor={theme.accentLight} />
          </LinearGradient>
        </Defs>

        {/* Center Backlight Disc */}
        <Circle
          cx={center}
          cy={center}
          r={radius - 2}
          fill="url(#gaugeCenterGlow)"
        />

        {/* Outer Inactive Track Ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Active Progress Ring (Crisp Gradient Stroke) */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#gaugeStrokeGrad)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedArcProps}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>

      {/* Typography Overlay */}
      <View style={styles.centerTextContainer}>
        <View style={styles.percentRow}>
          <Text style={styles.percentNumber}>
            {renewablePct.toFixed(0)}
          </Text>
          <Text style={[styles.percentSign, { color: theme.accentLight }]}>%</Text>
        </View>
        <Text style={styles.label}>{label}</Text>
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
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  percentNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontFamily: 'Manrope_800ExtraBold',
    includeFontPadding: false,
  },
  percentSign: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 1,
    marginTop: 2,
    fontFamily: 'Manrope_700Bold',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
    letterSpacing: 0.2,
    marginTop: -2,
    fontFamily: 'Manrope_500Medium',
  },
});
