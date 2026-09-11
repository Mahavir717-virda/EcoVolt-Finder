import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';
import { Spinner } from '../feedback/Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

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

  const getContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryContainer;
      case 'ghost':
        return styles.ghostContainer;
      case 'danger':
        return styles.dangerContainer;
      case 'primary':
      default:
        return styles.primaryContainer;
    }
  };

  const getLabelColor = (): string => {
    if (disabled) return colors.ink3;
    switch (variant) {
      case 'secondary':
        return colors.ink;
      case 'ghost':
        return colors.brand;
      case 'danger':
        return '#FFFFFF';
      case 'primary':
      default:
        return '#FFFFFF';
    }
  };

  const getSpinnerColor = (): string => {
    switch (variant) {
      case 'secondary':
        return colors.ink;
      case 'ghost':
        return colors.brand;
      default:
        return '#FFFFFF';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        getContainerStyle(),
        disabled ? styles.disabledContainer : undefined,
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {busy ? (
          <Spinner size="small" color={getSpinnerColor()} style={styles.spinner} />
        ) : (
          leftIcon && <View style={styles.icon}>{leftIcon}</View>
        )}
        <Text
          variant="bodyMedium"
          color={getLabelColor()}
          style={labelStyle ? [styles.labelText, labelStyle] : styles.labelText}
        >
          {label}
        </Text>
        {!busy && rightIcon && <View style={styles.icon}>{rightIcon}</View>}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryContainer: {
    backgroundColor: colors.brand,
  },
  secondaryContainer: {
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  dangerContainer: {
    backgroundColor: colors.danger,
  },
  disabledContainer: {
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.line,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  spinner: {
    marginRight: 4,
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelText: {
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
});
