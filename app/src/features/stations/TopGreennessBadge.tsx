import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { GridSnapshot } from '@contracts/types';
import { colors, greennessColor, greennessBandLabel, radii, shadows, spacing } from '../../theme/tokens';
import { Text, Chip } from '../../components';

interface TopGreennessBadgeProps {
  grid: GridSnapshot;
  isFetching?: boolean;
  style?: ViewStyle;
}

export const TopGreennessBadge: React.FC<TopGreennessBadgeProps> = ({
  grid,
  isFetching = false,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFetching) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isFetching, pulseAnim]);

  const renewableColor = greennessColor(grid.renewablePct);
  const bandLabel = greennessBandLabel(grid.renewablePct);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.badgeContent}>
        {/* Color Indicator */}
        <View style={[styles.indicatorPill, { backgroundColor: renewableColor }]} />

        {/* Text Details */}
        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text variant="caption" style={styles.mainText}>
              Grid now:{' '}
              <Text variant="caption" color={renewableColor} style={styles.boldPct}>
                {grid.renewablePct}% renewable
              </Text>{' '}
              · {bandLabel.toLowerCase()}
            </Text>

            {isFetching && (
              <View style={styles.fetchingWrapper}>
                <Animated.View
                  style={[styles.fetchingDot, { opacity: pulseAnim }]}
                />
                <Text variant="micro" color={colors.volt} style={styles.fetchingText}>
                  updating
                </Text>
              </View>
            )}
          </View>

          <Text variant="micro" color={colors.ink3}>
            {grid.zoneId} · {grid.carbonIntensity} gCO₂/kWh
          </Text>
        </View>

        {/* Quality Tag */}
        <Chip
          label={grid.quality.toUpperCase()}
          variant="subtle"
          color={grid.quality === 'live' ? colors.brand : colors.ink2}
          backgroundColor={
            grid.quality === 'live' ? colors.brandTint : colors.surfaceSunken
          }
          style={styles.qualityChip}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.e1,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  indicatorPill: {
    width: 6,
    height: 32,
    borderRadius: radii.pill,
  },
  textColumn: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  mainText: {
    fontFamily: 'Manrope_600SemiBold',
    color: colors.ink,
  },
  boldPct: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  fetchingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fetchingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.volt,
  },
  fetchingText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 10,
  },
  qualityChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
