import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { Text } from './Text';

export interface SegmentOption<T> {
  label: string;
  value: T;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>): React.ReactElement {
  return (
    <View style={[styles.container, style]}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <TouchableOpacity
            key={String(opt.value)}
            activeOpacity={0.8}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              isActive ? styles.activeSegment : undefined,
            ]}
          >
            {opt.icon && <View style={styles.icon}>{opt.icon}</View>}
            <Text
              variant="caption"
              color={isActive ? colors.ink : colors.ink2}
              style={isActive ? [styles.label, styles.activeLabel] : styles.label}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    gap: 6,
  },
  activeSegment: {
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Manrope_500Medium',
  },
  activeLabel: {
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
});
