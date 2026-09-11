import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

export type CardElevation = 'e0' | 'e1' | 'e2';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  children: React.ReactNode;
  elevation?: CardElevation;
  padding?: CardPadding;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export const Card: React.FC<CardProps> = ({
  children,
  elevation = 'e1',
  padding = 'md',
  onPress,
  style,
}) => {
  const getPadding = (): number => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return spacing.sm;
      case 'lg':
        return spacing.lg;
      case 'md':
      default:
        return spacing.base;
    }
  };

  const cardStyle: ViewStyle[] = [
    styles.base,
    shadows[elevation],
    { padding: getPadding() },
    style as ViewStyle,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  },
});
