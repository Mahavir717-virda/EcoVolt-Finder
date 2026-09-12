import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';
import { ScalePressable } from './Pressable';

export interface PillTagProps {
  label: string;
  /** Override the text+bg color. Defaults to brand green scheme. */
  color?: string;
  tintColor?: string;
  style?: ViewStyle;
}

/**
 * PillTag — brand-tint bg, brand text, radius 999.
 * Use for "Available" badge, "Add New Card", booking status chips.
 */
export const PillTag: React.FC<PillTagProps> = ({
  label,
  color = colors.brand,
  tintColor = colors.brandTint,
  style,
}) => {
  return (
    <View style={[styles.base, { backgroundColor: tintColor }, style]}>
      <Text
        variant="micro"
        color={color}
        style={styles.label}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
  },
});
