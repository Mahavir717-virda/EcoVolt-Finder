import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { ForecastPoint } from '@contracts/types';
import {
  colors,
  greennessColor,
  radii,
  shadows,
  spacing,
} from '../../theme/tokens';
import { Text } from '../primitives/Text';
import { Chip } from '../primitives/Chip';

export interface ForecastStripProps {
  forecast: ForecastPoint[];
  recommendedWindow?: {
    startLocal: string;
    endLocal: string;
    renewablePct: number;
    confidence: number;
  };
  style?: ViewStyle;
}

export const ForecastStrip: React.FC<ForecastStripProps> = ({
  forecast,
  recommendedWindow,
  style,
}) => {
  // Format ISO time to readable local hour e.g. "12 PM"
  const formatHour = (iso: string) => {
    try {
      const date = new Date(iso);
      const hours = date.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
      return `${formattedHours} ${ampm}`;
    } catch {
      return iso.slice(11, 16);
    }
  };

  // Check if a point is within the recommended window
  const isPointInRecommended = (iso: string) => {
    if (!recommendedWindow) return false;
    const ptTime = new Date(iso).getTime();
    const startTime = new Date(recommendedWindow.startLocal).getTime();
    const endTime = new Date(recommendedWindow.endLocal).getTime();
    return ptTime >= startTime && ptTime <= endTime;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <Text variant="title" style={styles.sectionTitle}>
            24-Hour Renewable Forecast
          </Text>
          <Text variant="micro" color={colors.ink3}>
            Machine-learning solar & wind grid availability
          </Text>
        </View>

        {recommendedWindow && (
          <Chip
            label="OPTIMAL WINDOW"
            variant="solid"
            color="#FFFFFF"
            backgroundColor={colors.brand}
          />
        )}
      </View>

      {/* Recommended Highlight Banner */}
      {recommendedWindow && (
        <View style={styles.recommendBanner}>
          <View style={styles.recommendBannerTop}>
            <Text variant="bodyMedium" color={colors.brand} style={styles.windowTimeText}>
              🌟 Peak Window: {formatHour(recommendedWindow.startLocal)} – {formatHour(recommendedWindow.endLocal)}
            </Text>
            <Chip
              label={`${Math.round(recommendedWindow.confidence * 100)}% conf`}
              variant="subtle"
              color={colors.brand}
              backgroundColor={colors.brandTint}
            />
          </View>
          <Text variant="micro" color={colors.ink2}>
            Expected ~{recommendedWindow.renewablePct}% renewable generation · Lowest dynamic ToU tariff
          </Text>
        </View>
      )}

      {/* Horizontal Sparkline Bars */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineScroll}
      >
        {forecast.map((point, index) => {
          const isHighConf = point.confidence >= 0.6;
          const isOptimal = isPointInRecommended(point.hourStartLocal);
          const barColor = isHighConf
            ? greennessColor(point.renewablePct)
            : colors.ink3;
          const barHeight = Math.max((point.renewablePct / 100) * 54, 8);

          return (
            <View
              key={index}
              style={[
                styles.barColumn,
                isOptimal && styles.barColumnOptimal,
                !isHighConf && styles.barColumnLowConf,
              ]}
            >
              {/* Renewable % Label */}
              <Text
                variant="micro"
                color={isOptimal ? colors.brand : isHighConf ? colors.ink : colors.ink3}
                style={[styles.pctLabel, isOptimal && styles.pctLabelBold]}
              >
                {point.renewablePct}%
              </Text>

              {/* Bar Container */}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: barHeight,
                      backgroundColor: isOptimal ? colors.brand : barColor,
                    },
                  ]}
                />
              </View>

              {/* Hour Label */}
              <Text variant="micro" color={colors.ink2} style={styles.hourLabel}>
                {formatHour(point.hourStartLocal)}
              </Text>

              {/* Confidence Tag (Edge Case #13) */}
              <Text
                variant="micro"
                color={isHighConf ? colors.ink3 : colors.danger}
                style={styles.confText}
              >
                {Math.round(point.confidence * 100)}%
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Confidence Legend (Edge Case #13) */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.brand }]} />
          <Text variant="micro" color={colors.ink3}>
            High confidence (≥60%)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.ink3 }]} />
          <Text variant="micro" color={colors.ink3}>
            Low confidence / Greyed
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  recommendBanner: {
    backgroundColor: colors.brandTint,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
    gap: 4,
  },
  recommendBannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  windowTimeText: {
    fontFamily: 'Manrope_700Bold',
  },
  timelineScroll: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  barColumn: {
    alignItems: 'center',
    width: 44,
    paddingVertical: 4,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSunken,
    gap: 4,
  },
  barColumnOptimal: {
    backgroundColor: '#D7F1E0',
    borderWidth: 1,
    borderColor: colors.brand,
  },
  barColumnLowConf: {
    opacity: 0.65,
  },
  pctLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
  },
  pctLabelBold: {
    fontFamily: 'Manrope_700Bold',
  },
  barTrack: {
    height: 58,
    width: 14,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radii.pill,
  },
  hourLabel: {
    fontSize: 9,
    fontFamily: 'Manrope_600SemiBold',
  },
  confText: {
    fontSize: 8,
    fontFamily: 'Manrope_500Medium',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
