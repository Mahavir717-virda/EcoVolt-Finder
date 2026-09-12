import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/tokens';
import { Text } from './Text';

export interface LocationLineProps {
  address: string;
  numberOfLines?: number;
  style?: ViewStyle;
}

/**
 * LocationLine — pin icon (ink3, 14dp) + address text (ink2).
 * 1–2 line clamp.
 */
export const LocationLine: React.FC<LocationLineProps> = ({
  address,
  numberOfLines = 2,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Pin icon — Unicode fallback, replace with SVG in production */}
      <Text style={styles.pin}>📍</Text>
      <Text
        variant="caption"
        color={colors.ink2}
        numberOfLines={numberOfLines}
        style={styles.address}
      >
        {address}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  pin: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink3,
    marginTop: 1,
  },
  address: {
    flex: 1,
  },
});
