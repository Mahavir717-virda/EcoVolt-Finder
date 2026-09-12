import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme/tokens';
import { Text } from '../primitives/Text';

export interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  /** Optional element on the right (icon button, text, etc.) */
  rightSlot?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * ScreenHeader — back chevron (ink, 24dp) + Screen Title, optional right slot.
 * Matches reference: white bg, screen title centered or left-aligned.
 */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onBack,
  rightSlot,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Back button */}
      <View style={styles.leftSlot}>
        {onBack != null && (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={0.7}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.chevron}>‹</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Title */}
      <Text variant="screenTitle" align="center" style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right slot */}
      <View style={styles.rightSlot}>
        {rightSlot}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leftSlot: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 28,
    lineHeight: 32,
    color: colors.ink,
    fontWeight: '400',
    marginTop: -2,
  },
  title: {
    flex: 1,
    fontFamily: 'Manrope_700Bold',
  },
  rightSlot: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
