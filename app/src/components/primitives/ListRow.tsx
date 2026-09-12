import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
  style?: ViewStyle;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  leftElement,
  rightElement,
  onPress,
  showDivider = true,
  style,
}) => {
  const content = (
    <View style={[styles.container, showDivider && styles.divider, style]}>
      {leftElement && <View style={styles.left}>{leftElement}</View>}
      <View style={styles.center}>
        <Text variant="cardTitle" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color={colors.ink2} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement && <View style={styles.right}>{rightElement}</View>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
  },
  right: {
    marginLeft: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
