import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../primitives/Text';

export interface BatteryPillProps {
  /** Battery percentage 0..100 */
  percentage: number;
  /** Width of the pill — defaults to 28 */
  width?: number;
  /** Height of the pill — defaults to 56 */
  height?: number;
  style?: ViewStyle;
}

/**
 * BatteryPill — vertical rounded-rect outline (brand color),
 * inner fill proportional to %, percentage numeral displayed below.
 * Used on the ActiveSessionScreen alongside vehicle image.
 */
export const BatteryPill: React.FC<BatteryPillProps> = ({
  percentage,
  width = 28,
  height = 56,
  style,
}) => {
  const clampedPct = Math.min(Math.max(percentage, 0), 100);
  const fillHeight = (clampedPct / 100) * (height - 8); // 4px padding top+bottom

  // Color based on charge level
  const fillColor =
    clampedPct >= 40 ? colors.brand :
    clampedPct >= 20 ? colors.warningAmber :
    colors.danger;

  return (
    <View style={[styles.wrapper, style]}>
      {/* Battery tip */}
      <View style={[styles.tip, { width: width * 0.5 }]} />

      {/* Battery body */}
      <View style={[styles.body, { width, height, borderRadius: radii.thumbnail }]}>
        {/* Fill (grows from bottom) */}
        <View
          style={[
            styles.fill,
            {
              width: width - 8,
              height: fillHeight,
              backgroundColor: fillColor,
              borderRadius: radii.sm,
            },
          ]}
        />
      </View>

      {/* Percentage text below */}
      <Text
        variant="micro"
        color={fillColor}
        align="center"
        tabularNums
        style={styles.pct}
      >
        {clampedPct}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 4,
  },
  tip: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brand,
    marginBottom: -2,
  },
  body: {
    borderWidth: 2,
    borderColor: colors.brand,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 4,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    bottom: 4,
    left: 4,
  },
  pct: {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
  },
});
