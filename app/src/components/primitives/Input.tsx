import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../../theme/tokens';
import { Text } from './Text';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftElement,
  rightElement,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="caption" color={colors.ink2} style={styles.label}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.focusedWrapper,
          !!error && styles.errorWrapper,
        ]}
      >
        {leftElement && <View style={styles.elementLeft}>{leftElement}</View>}

        <TextInput
          style={[
            styles.input,
            typography.body,
            { color: colors.ink },
            style,
          ]}
          placeholderTextColor={colors.ink3}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {rightElement && <View style={styles.elementRight}>{rightElement}</View>}
      </View>

      {error ? (
        <Text variant="micro" color={colors.danger} style={styles.helper}>
          {error}
        </Text>
      ) : helperText ? (
        <Text variant="micro" color={colors.ink3} style={styles.helper}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  focusedWrapper: {
    borderColor: colors.brand,
    backgroundColor: colors.surface,
  },
  errorWrapper: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
  },
  elementLeft: {
    marginRight: spacing.sm,
  },
  elementRight: {
    marginLeft: spacing.sm,
  },
  helper: {
    marginTop: 2,
  },
});
