import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { Text } from './Text';

export interface RatingRowProps {
  rating: number;   // e.g. 3.4
  reviewCount?: number;
  style?: ViewStyle;
}

/**
 * RatingRow — star icon (amber) + score (ink) + review count (ink2).
 */
export const RatingRow: React.FC<RatingRowProps> = ({
  rating,
  reviewCount,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Star icon (Unicode fallback — use SVG icon in production) */}
      <Text style={styles.star}>★</Text>
      <Text variant="caption" color={colors.ink} style={styles.score} tabularNums>
        {rating.toFixed(1)}
      </Text>
      {reviewCount != null && (
        <Text variant="caption" color={colors.ink2}>
          ({reviewCount} Reviews)
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  star: {
    color: colors.warningAmber,
    fontSize: 14,
    lineHeight: 18,
  },
  score: {
    fontFamily: 'Manrope_700Bold',
    fontWeight: '700',
  },
});
