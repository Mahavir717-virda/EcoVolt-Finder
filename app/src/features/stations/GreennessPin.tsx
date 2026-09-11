import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { StationWithMeta } from './types';
import { colors, greennessColor, radii, shadows } from '../../theme/tokens';
import { Text } from '../../components';

interface GreennessPinProps {
  station: StationWithMeta;
  isSelected?: boolean;
  onPress?: () => void;
}

export const GreennessPin: React.FC<GreennessPinProps> = ({
  station,
  isSelected = false,
  onPress,
}) => {
  const isReachable = station.reachable;
  const pinColor = isReachable
    ? greennessColor(station.greenness.renewablePct)
    : colors.ink3;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.touchTarget}
    >
      <View
        style={[
          styles.container,
          isSelected && styles.containerSelected,
          !isReachable && styles.containerUnreachable,
        ]}
      >
        {/* Pin Bubble */}
        <View
          style={[
            styles.bubble,
            { backgroundColor: pinColor },
            isSelected && styles.bubbleSelected,
          ]}
        >
          <Text variant="micro" color="#FFFFFF" style={styles.pinText}>
            {station.greenness.renewablePct}%
          </Text>

          {!isReachable && (
            <View style={styles.unreachableDot}>
              <Text variant="micro" color="#FFFFFF" style={styles.alertSymbol}>
                !
              </Text>
            </View>
          )}
        </View>

        {/* Pin Stem Arrow */}
        <View
          style={[
            styles.stem,
            { borderTopColor: pinColor },
            isSelected && styles.stemSelected,
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerSelected: {
    transform: [{ scale: 1.15 }],
  },
  containerUnreachable: {
    opacity: 0.85,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    gap: 3,
    ...shadows.e1,
  },
  bubbleSelected: {
    borderColor: colors.volt,
    borderWidth: 2.5,
    ...shadows.e2,
  },
  pinText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    lineHeight: 14,
    color: '#FFFFFF',
  },
  unreachableDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  alertSymbol: {
    fontSize: 9,
    lineHeight: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  stem: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  stemSelected: {
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
  },
});
