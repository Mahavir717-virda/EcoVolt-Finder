import React from 'react';
import {
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';
import { ScalePressable } from './Pressable';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'secondary';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  leftIcon,
  rightIcon,
  style,
  labelStyle,
}) => {
  const isDisabled = disabled || busy;

  const containerStyle = (): ViewStyle => {
    if (disabled) return styles.disabledContainer;
    switch (variant) {
      case 'outline':
      case 'secondary':
        return styles.outlineContainer;
      case 'ghost':
        return styles.ghostContainer;
      case 'danger':
        return styles.dangerContainer;
      case 'primary':
      default:
        return styles.primaryContainer;
    }
  };

  const labelColor = (): string => {
    if (disabled) return colors.ink3;
    switch (variant) {
      case 'outline':
      case 'secondary':
        return colors.brand;
      case 'ghost':
        return colors.brand;
      case 'danger':
        return '#FFFFFF';
      case 'primary':
      default:
        return '#FFFFFF';
    }
  };

  const spinnerColor = (): string => {
    switch (variant) {
      case 'outline':
      case 'secondary':
      case 'ghost':
        return colors.brand;
      default:
        return '#FFFFFF';
    }
  };

  return (
    <ScalePressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, containerStyle(), style ?? {}]}
    >
      <React.Fragment>
        {/* Busy spinner replaces icon slot only — label always visible */}
        {busy ? (
          <ActivityIndicator
            size="small"
            color={spinnerColor()}
            style={styles.spinner}
          />
        ) : (
          leftIcon != null && leftIcon
        )}
        <Text
          variant="sectionLabel"
          color={labelColor()}
          style={[styles.labelText, labelStyle]}
        >
          {label}
        </Text>
        {!busy && rightIcon != null && rightIcon}
      </React.Fragment>
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radii.button, // 14 — rectangular-rounded, NOT pill
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    // No shadow on buttons (per spec)
  },
  primaryContainer: {
    backgroundColor: colors.brand,
  },
  outlineContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.brand,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  dangerContainer: {
    backgroundColor: colors.danger,
  },
  disabledContainer: {
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  spinner: {
    marginRight: 4,
  },
  labelText: {
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    lineHeight: 20,
  },
});
