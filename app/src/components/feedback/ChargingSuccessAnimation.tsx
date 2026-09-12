import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '../../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface ChargingSuccessAnimationProps {
  /** Size of the circular badge in dp (default: 72) */
  size?: number;
  /** Primary circle fill color (default: colors.brand = #1C9B4A) */
  color?: string;
  /** Checkmark stroke color (default: #FFFFFF) */
  checkColor?: string;
  /** Stroke width of the checkmark relative to 64px grid (default: 4.5) */
  strokeWidth?: number;
  /** Whether the animation is visible/active (default: true) */
  visible?: boolean;
  /** Skip animation and immediately render final state if true */
  reduceMotion?: boolean;
  /** Optional callback fired when the animation sequence finishes */
  onAnimationComplete?: () => void;
  /** Optional container style */
  style?: StyleProp<ViewStyle>;
}

// Path length for SVG checkmark path in 64x64 viewport
// Start: (19, 33) -> Vertex: (28, 42) -> End: (45, 24)
// Total Euclidean path length ≈ 37.5. Stroke dash array 42 ensures complete invisibility at offset 42.
const CHECK_PATH_LENGTH = 42;
const CHECK_PATH_DATA = 'M 19 33 L 28 42 L 45 24';

export const ChargingSuccessAnimation: React.FC<ChargingSuccessAnimationProps> = ({
  size = 72,
  color = colors.brand,
  checkColor = '#FFFFFF',
  strokeWidth = 4.5,
  visible = true,
  reduceMotion = false,
  onAnimationComplete,
  style,
}) => {
  // Shared animation values
  const circleScale = useSharedValue(reduceMotion ? 1 : 0);
  const circleOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const checkProgress = useSharedValue(reduceMotion ? 1 : 0);
  const glowScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {
        // Fallback silently if haptics unavailable
      }
    }
  };

  const handleAnimationEnd = () => {
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  };

  useEffect(() => {
    if (!visible) {
      circleScale.value = 0;
      circleOpacity.value = 0;
      checkProgress.value = 0;
      glowOpacity.value = 0;
      glowScale.value = 0.8;
      return;
    }

    if (reduceMotion) {
      circleScale.value = 1;
      circleOpacity.value = 1;
      checkProgress.value = 1;
      glowOpacity.value = 0;
      if (onAnimationComplete) {
        onAnimationComplete();
      }
      return;
    }

    // Reset values before starting sequence
    circleScale.value = 0;
    circleOpacity.value = 0;
    checkProgress.value = 0;
    glowOpacity.value = 0;
    glowScale.value = 0.8;

    // STEP 1: Circle scale & pop (0ms -> ~300ms)
    circleOpacity.value = withTiming(1, { duration: 120 });
    circleScale.value = withSpring(1, {
      damping: 12,
      stiffness: 180,
      mass: 0.8,
    });

    // STEP 1b: Subtle outer ripple glow
    glowOpacity.value = withSequence(
      withTiming(0.4, { duration: 200 }),
      withTiming(0, { duration: 400 })
    );
    glowScale.value = withTiming(1.4, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });

    // STEP 2: Checkmark progressive draw (starts at 180ms, duration 360ms)
    checkProgress.value = withDelay(
      180,
      withTiming(
        1,
        {
          duration: 360,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(triggerHaptic)();
            if (onAnimationComplete) {
              runOnJS(handleAnimationEnd)();
            }
          }
        }
      )
    );

    // STEP 3: Micro-bounce finishing settle (540ms)
    circleScale.value = withDelay(
      540,
      withSequence(
        withTiming(1.06, { duration: 110, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 14, stiffness: 220 })
      )
    );
  }, [visible, reduceMotion]);

  // Animated styles
  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
    opacity: circleOpacity.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const animatedCheckProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - checkProgress.value) * CHECK_PATH_LENGTH,
  }));

  const halfSize = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Expanding Ripple Glow Layer */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            backgroundColor: color,
          },
          glowAnimatedStyle,
        ]}
      />

      {/* Main Success Circle Badge */}
      <Animated.View
        style={[
          styles.mainCircle,
          {
            width: size,
            height: size,
            borderRadius: halfSize,
            backgroundColor: color,
            shadowColor: color,
          },
          circleAnimatedStyle,
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <AnimatedPath
            d={CHECK_PATH_DATA}
            fill="none"
            stroke={checkColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[CHECK_PATH_LENGTH, CHECK_PATH_LENGTH]}
            animatedProps={animatedCheckProps}
          />
        </Svg>
      </Animated.View>
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
    zIndex: 0,
  },
  mainCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
