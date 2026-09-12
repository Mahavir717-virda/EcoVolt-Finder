import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { ScalePressable } from './Pressable';

export type CardElevation = 'e0' | 'e1' | 'e2' | 'card' | 'sheet';
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
      case 'none': return 0;
      case 'sm': return spacing.sm;
      case 'lg': return spacing.lg;
      case 'md':
      default: return spacing.base;
    }
  };

  const getElevationStyle = () => {
    switch (elevation) {
      case 'e0': return shadows.e0;
      case 'card':
      case 'e1': return shadows.card;
      case 'sheet':
      case 'e2': return shadows.sheet;
      default: return shadows.card;
    }
  };

  const cardStyle: ViewStyle[] = [
    styles.base,
    getElevationStyle() as ViewStyle,
    { padding: getPadding() },
    style as ViewStyle,
  ];

  if (onPress) {
    return (
      <ScalePressable onPress={onPress} style={cardStyle}>
        {children}
      </ScalePressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.card, // 16
    borderWidth: 1,
    borderColor: colors.border,
  },
});
