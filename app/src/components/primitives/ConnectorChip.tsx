import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii } from '../../theme/tokens';
import { Text } from './Text';

export interface ConnectorChipProps {
  /** Icon or emoji representing the connector type */
  icon: React.ReactNode | string;
  size?: number;
  style?: ViewStyle;
}

/**
 * ConnectorChip — 40dp circle, surface-sunken bg, small icon/emoji centered.
 * Used in connector-type icon rows on StationCard and StationDetailScreen.
 */
export const ConnectorChip: React.FC<ConnectorChipProps> = ({
  icon,
  size = 40,
  style,
}) => {
  return (
    <View
      style={[
        styles.chip,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {typeof icon === 'string' ? (
        <Text style={styles.emoji}>{icon}</Text>
      ) : (
        icon
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 18,
    lineHeight: 22,
    color: colors.ink2,
  },
});
