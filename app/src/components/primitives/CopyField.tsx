import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Clipboard,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';

export interface CopyFieldProps {
  value: string;
  label?: string;
  onCopy?: (value: string) => void;
  style?: ViewStyle;
}

/**
 * CopyField — brand-tint bg, radius 12, ink text, trailing copy icon (brand).
 * Copies value to clipboard on press. Used for Booking ID display.
 */
export const CopyField: React.FC<CopyFieldProps> = ({
  value,
  label,
  onCopy,
  style,
}) => {
  const handleCopy = () => {
    // Note: Clipboard API deprecated in newer RN, use @react-native-clipboard/clipboard if available
    try {
      (Clipboard as any).setString(value);
    } catch {
      // silent fail if clipboard unavailable
    }
    onCopy?.(value);
  };

  return (
    <View style={style}>
      {label != null && (
        <Text variant="micro" color={colors.ink2} style={styles.label}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleCopy}
        style={styles.container}
      >
        <Text variant="caption" color={colors.ink} style={styles.value} tabularNums numberOfLines={1}>
          {value}
        </Text>
        {/* Copy icon — Unicode fallback */}
        <Text style={styles.copyIcon} color={colors.brand}>⎘</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontWeight: '600',
    fontFamily: 'Manrope_700Bold',
    marginBottom: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brandTint,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.sm,
  },
  value: {
    flex: 1,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  copyIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
});
