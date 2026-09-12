/**
 * Badge Component
 * Display status, counts, or labels with different styles
 */

import { CHARGER_STATUS_CONFIG } from '@/constants/chargerTypes';
import { colors } from '@/constants/colors';
import { spacing } from '@/styles/spacing';
import { ChargerStatus } from '@/types/database.types';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  label?: string;
  children?: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

interface StatusBadgeProps {
  status: ChargerStatus;
  size?: BadgeSize;
  style?: ViewStyle;
}

export function Badge({
  label,
  children,
  variant = 'default',
  size = 'md',
  style,
}: BadgeProps) {
  const displayText = label || (typeof children === 'string' ? children : null);
  
  return (
    <View style={[styles.base, styles[`variant_${variant}`], styles[`size_${size}`], style]}>
      {displayText ? (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
          {displayText}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

export function StatusBadge({ status, size = 'md', style }: StatusBadgeProps) {
  const config = CHARGER_STATUS_CONFIG[status];

  return (
    <View
      style={[
        styles.base,
        styles[`size_${size}`],
        { backgroundColor: config.backgroundColor },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, styles[`textSize_${size}`], { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: spacing.radius.full,
    gap: spacing.xs,
  },

  // Sizes
  size_sm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  size_md: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 4,
  },

  // Variants
  variant_default: {
    backgroundColor: colors.neutral[200],
  },
  variant_success: {
    backgroundColor: colors.primary[100],
  },
  variant_warning: {
    backgroundColor: '#FFF3E0',
  },
  variant_error: {
    backgroundColor: '#FFEBEE',
  },
  variant_info: {
    backgroundColor: colors.accent[100],
  },

  // Text
  text: {
    fontWeight: '600',
  },
  text_default: {
    color: colors.neutral[700],
  },
  text_success: {
    color: colors.primary[700],
  },
  text_warning: {
    color: '#E65100',
  },
  text_error: {
    color: '#C62828',
  },
  text_info: {
    color: colors.accent[700],
  },

  // Text sizes
  textSize_sm: {
    fontSize: 11,
  },
  textSize_md: {
    fontSize: 12,
  },

  // Status dot
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
