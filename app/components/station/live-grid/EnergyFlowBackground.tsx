import React, { useEffect, useState } from 'react';
import { View, StyleSheet, AccessibilityInfo } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Path,
  G,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { getInterpolatedGridTheme, GridThemeColors } from './gridGradients';

interface EnergyFlowBackgroundProps {
  renewablePct: number;
}

export const EnergyFlowBackground: React.FC<EnergyFlowBackgroundProps> = ({
  renewablePct,
}) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const theme: GridThemeColors = getInterpolatedGridTheme(renewablePct);

  // Subtle continuous energy-flow animation values (60fps GPU translated)
  const flow1 = useSharedValue(0);
  const flow2 = useSharedValue(0);
  const ambientPulse = useSharedValue(0.7);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((isReduced) => {
      if (!mounted) return;
      setReducedMotion(isReduced);
      if (!isReduced) {
        flow1.value = withRepeat(
          withTiming(1, { duration: 11000, easing: Easing.linear }),
          -1,
          false
        );
        flow2.value = withRepeat(
          withTiming(1, { duration: 16000, easing: Easing.linear }),
          -1,
          false
        );
        ambientPulse.value = withRepeat(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        );
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const flow1Style = useAnimatedStyle(() => {
    if (reducedMotion) return { transform: [{ translateX: 0 }] };
    return {
      transform: [{ translateX: (flow1.value - 0.5) * 60 }],
      opacity: 0.16 * ambientPulse.value,
    };
  });

  const flow2Style = useAnimatedStyle(() => {
    if (reducedMotion) return { transform: [{ translateX: 0 }] };
    return {
      transform: [{ translateX: (0.5 - flow2.value) * 80 }],
      opacity: 0.12 * (1.7 - ambientPulse.value),
    };
  });

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Base Layer: Atmospheric Mesh Gradient */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFillObject}>
        <Defs>
          {/* Main Diagonal Linear Base */}
          <LinearGradient id="heroBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.gradientTop} stopOpacity="1" />
            <Stop offset="45%" stopColor={theme.gradientMid} stopOpacity="1" />
            <Stop offset="100%" stopColor={theme.gradientBottom} stopOpacity="1" />
          </LinearGradient>

          {/* Radial Atmospheric Glow 1 (Top Right) */}
          <RadialGradient
            id="radialGlowTop"
            cx="80%"
            cy="15%"
            rx="60%"
            ry="60%"
            fx="80%"
            fy="15%"
          >
            <Stop offset="0%" stopColor={theme.accentColor} stopOpacity="0.28" />
            <Stop offset="50%" stopColor={theme.ambientGlow} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={theme.gradientMid} stopOpacity="0" />
          </RadialGradient>

          {/* Radial Atmospheric Glow 2 (Bottom Left) */}
          <RadialGradient
            id="radialGlowBottom"
            cx="15%"
            cy="85%"
            rx="55%"
            ry="55%"
            fx="15%"
            fy="85%"
          >
            <Stop offset="0%" stopColor={theme.ambientGlow} stopOpacity="0.22" />
            <Stop offset="60%" stopColor={theme.gradientBottom} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={theme.gradientTop} stopOpacity="0" />
          </RadialGradient>

          {/* Energy Streak Glow Gradient */}
          <LinearGradient id="streakGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={theme.accentLight} stopOpacity="0" />
            <Stop offset="40%" stopColor={theme.accentLight} stopOpacity="0.7" />
            <Stop offset="60%" stopColor={theme.accentColor} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={theme.ambientGlow} stopOpacity="0" />
          </LinearGradient>

          <LinearGradient id="streakGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={theme.accentColor} stopOpacity="0" />
            <Stop offset="50%" stopColor={theme.accentLight} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={theme.accentColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Base Background */}
        <Rect width="100%" height="100%" fill="url(#heroBaseGrad)" />

        {/* Atmospheric Radial Blends */}
        <Rect width="100%" height="100%" fill="url(#radialGlowTop)" />
        <Rect width="100%" height="100%" fill="url(#radialGlowBottom)" />
      </Svg>

      {/* Layer 2: Animated Energy Flow Streaks (Subtle, non-distracting 60fps) */}
      <Animated.View style={[StyleSheet.absoluteFillObject, flow1Style]}>
        <Svg width="120%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="none">
          <G fill="none" strokeWidth="1.5">
            <Path
              d="M-20,70 C80,50 180,110 320,80 C370,70 420,95 450,90"
              stroke="url(#streakGrad1)"
            />
            <Path
              d="M-40,180 C60,150 160,220 280,175 C340,150 400,190 440,185"
              stroke="url(#streakGrad1)"
              strokeWidth="2"
            />
          </G>
        </Svg>
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFillObject, flow2Style]}>
        <Svg width="120%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="none">
          <G fill="none" strokeWidth="1.2">
            <Path
              d="M-10,130 C90,110 200,160 310,135 C360,120 410,140 440,130"
              stroke="url(#streakGrad2)"
            />
            <Path
              d="M-30,240 C70,220 190,260 290,230 C350,210 400,245 440,240"
              stroke="url(#streakGrad2)"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};
