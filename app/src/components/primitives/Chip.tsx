import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';

export type ChipVariant = 'subtle' | 'solid' | 'outline';

export interface ChipProps {
  label: string;
  variant?: ChipVariant;
  color?: string;
  backgroundColor?: string;
  dotColor?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'subtle',
  color = colors.ink,
  backgroundColor,
  dotColor,
  icon,
  onPress,
  style,
}) => {
  const getBackgroundColor = (): string => {
    if (backgroundColor) return backgroundColor;
    switch (variant) {
      case 'solid':
        return color;
      case 'outline':
        return 'transparent';
      case 'subtle':
      default:
        return colors.brandTint;
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'solid':
        return '#FFFFFF';
      case 'outline':
      case 'subtle':
      default:
        return color;
    }
  };

  const containerStyle: ViewStyle = {
    ...styles.base,
    backgroundColor: getBackgroundColor(),
    ...(variant === 'outline' ? { borderWidth: 1, borderColor: color } : {}),
    ...(style || {}),
  };

  const content = (
    <View style={styles.row}>
      {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text variant="micro" color={getTextColor()} style={styles.label}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={containerStyle}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{content}</View>;
};

export const Badge = Chip;

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
    fontFamily: 'Manrope_700Bold',
  },
});
