import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { Text } from './Text';

export interface StatColumnProps {
  label: string;
  value: string;
  /** Optional icon above the label */
  icon?: React.ReactNode;
  /** Override value color (e.g. brand for cost) */
  valueColor?: string;
  style?: ViewStyle;
}

/**
 * StatColumn — icon/label (micro, ink3) above, bold value (ink) below.
 * Use in 3-per-row grid for Charging screen stats, Booking card stats.
 */
export const StatColumn: React.FC<StatColumnProps> = ({
  label,
  value,
  icon,
  valueColor = colors.ink,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {icon != null && <View style={styles.iconSlot}>{icon}</View>}
      <Text variant="micro" color={colors.ink3} align="center" numberOfLines={1}>
        {label}
      </Text>
      <Text
        variant="cardTitle"
        color={valueColor}
        align="center"
        tabularNums
        numberOfLines={1}
        style={styles.value}
      >
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
  },
  iconSlot: {
    marginBottom: 2,
  },
  value: {
    fontWeight: '700',
  },
});
