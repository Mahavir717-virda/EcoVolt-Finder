import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../../theme/tokens';

export interface IconTileProps {
  children: React.ReactNode;
  /** Background color — defaults to brand green */
  backgroundColor?: string;
  /** Tile size in dp — defaults to 48 */
  size?: number;
  style?: ViewStyle;
}

/**
 * IconTile — 48dp rounded-12 square, brand bg, white icon centered.
 * Used in Review Summary for station icon, payment method icon tiles.
 */
export const IconTile: React.FC<IconTileProps> = ({
  children,
  backgroundColor = colors.brand,
  size = 48,
  style,
}) => {
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor,
          borderRadius: radii.thumbnail,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
