import React from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';

export interface FieldInputProps extends TextInputProps {
  label?: string;
  /** Icon displayed at the trailing end (e.g. clock or chevron-down) */
  trailingIcon?: React.ReactNode;
  /** If true, renders as non-editable display field */
  readonly?: boolean;
  /** Tap handler for readonly fields (e.g. open a picker) */
  onTap?: () => void;
  containerStyle?: ViewStyle;
}

/**
 * FieldInput — surface-sunken bg, radius 12, ink3 placeholder, trailing icon slot.
 * Used for Arrive Time (clock icon), Charging Duration (chevron-down picker),
 * and SmartCharge price-lock countdown (readonly + clock icon).
 */
export const FieldInput: React.FC<FieldInputProps> = ({
  label,
  trailingIcon,
  readonly = false,
  onTap,
  containerStyle,
  style,
  ...rest
}) => {
  const innerContent = (
    <View style={styles.inputRow}>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.ink3}
        editable={!readonly}
        pointerEvents={readonly ? 'none' : 'auto'}
        {...rest}
      />
      {trailingIcon != null && (
        <View style={styles.trailingIcon}>{trailingIcon}</View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label != null && (
        <Text variant="micro" color={colors.ink2} style={styles.label}>
          {label}
        </Text>
      )}
      {readonly && onTap != null ? (
        <TouchableOpacity activeOpacity={0.7} onPress={onTap} style={styles.wrapper}>
          {innerContent}
        </TouchableOpacity>
      ) : (
        <View style={styles.wrapper}>{innerContent}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontWeight: '600',
    fontFamily: 'Manrope_700Bold',
  },
  wrapper: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.input,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 48,
  },
  input: {
    flex: 1,
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    padding: 0,
  },
  trailingIcon: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
