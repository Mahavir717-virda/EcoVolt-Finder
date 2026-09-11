import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  fixAction?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to complete request',
  message,
  fixAction = 'Try again',
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.badge}>
        <Text variant="micro" color={colors.danger} style={styles.badgeText}>
          System Notice
        </Text>
      </View>
      <Text variant="title" align="center" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color={colors.ink2} align="center" style={styles.message}>
        {message}
      </Text>
      {onRetry && (
        <Button
          label={fixAction}
          onPress={onRetry}
          variant="primary"
          style={styles.retryBtn}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  badge: {
    backgroundColor: '#FDECEC',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  badgeText: {
    fontWeight: '700',
  },
  title: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  message: {
    maxWidth: 320,
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: spacing.sm,
    minWidth: 140,
  },
});
