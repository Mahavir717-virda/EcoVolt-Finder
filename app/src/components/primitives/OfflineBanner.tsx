import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';

export interface OfflineBannerProps {
  visible?: boolean;
  message?: string;
  onRefresh?: () => void;
  style?: ViewStyle;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  visible = true,
  message = 'Offline mode · showing cached grid data',
  onRefresh,
  style,
}) => {
  if (!visible) return null;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.dot} />
      <Text variant="micro" color={colors.ink} style={styles.text}>
        {message}
      </Text>
      {onRefresh && (
        <TouchableOpacity activeOpacity={0.7} onPress={onRefresh} style={styles.btn}>
          <Text variant="micro" color={colors.brand} style={styles.btnText}>
            Refresh
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderWidth: 1,
    borderColor: '#F1DC9B',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },
  text: {
    flex: 1,
    fontWeight: '600',
  },
  btn: {
    paddingHorizontal: 4,
  },
  btnText: {
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
