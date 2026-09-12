import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ForecastPoint } from '@/lib/gridData';
import { greennessColor } from '@/lib/gridData';

interface RenewableForecastChartProps {
  forecast: ForecastPoint[];
  currentISTHour: number;
  t?: (key: string, fallback: string) => string;
}

export const RenewableForecastChart: React.FC<RenewableForecastChartProps> = ({
  forecast,
  currentISTHour,
  t = (_, fallback) => fallback,
}) => {
  return (
    <View style={styles.container}>
      {/* 24-Hour Scrollable Timeline Bars */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {forecast.map((point) => {
          const isCurrent = point.hourIST === currentISTHour;
          const isBest = point.isRecommended && !isCurrent;
          const renPct = Math.min(100, Math.max(0, point.renewablePct));
          const barHeight = Math.max(10, Math.round((renPct / 100) * 48));
          const naturalColor = greennessColor(renPct);

          return (
            <View
              key={point.hourIST}
              style={[
                styles.barColumn,
                isCurrent && styles.barColumnCurrent,
              ]}
            >
              {/* Minimal Top Indicator: Only show NOW or Best dot */}
              <View style={styles.topIndicatorWrap}>
                {isCurrent ? (
                  <View style={styles.nowBadge}>
                    <Text style={styles.nowBadgeText}>NOW</Text>
                  </View>
                ) : isBest ? (
                  <View style={styles.bestDot} />
                ) : null}
              </View>

              {/* Bar Track & Fill */}
              <View
                style={[
                  styles.barOuter,
                  isCurrent && styles.barOuterCurrent,
                  isBest && styles.barOuterBest,
                ]}
              >
                <View
                  style={[
                    styles.barInner,
                    {
                      height: barHeight,
                      backgroundColor: isCurrent
                        ? '#06B6D4'
                        : isBest
                        ? '#10B981'
                        : naturalColor,
                      opacity: isCurrent || isBest ? 1 : 0.65,
                    },
                  ]}
                />
              </View>

              {/* Minimal Hour Label */}
              <Text
                style={[
                  styles.hourLabel,
                  isCurrent
                    ? styles.hourLabelCurrent
                    : isBest
                    ? styles.hourLabelBest
                    : styles.hourLabelMuted,
                ]}
              >
                {point.label.split(' ')[0]}
                <Text style={styles.hourAmpm}>
                  {point.label.includes(' ') ? point.label.split(' ')[1] : ''}
                </Text>
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Clean 2-Item Minimal Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#06B6D4' }]} />
          <Text style={styles.legendText}>
            {t('station.forecast_now', 'Current hour')}
          </Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>
            {t('station.best_window', 'Best window')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  scrollContent: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 6,
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
    width: 28,
    gap: 3,
  },
  barColumnCurrent: {},
  topIndicatorWrap: {
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowBadge: {
    backgroundColor: '#06B6D4',
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  nowBadgeText: {
    color: '#041B26',
    fontSize: 7,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
  },
  bestDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  barOuter: {
    width: 10,
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 5,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barOuterCurrent: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    width: 12,
  },
  barOuterBest: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  barInner: {
    width: '100%',
    borderRadius: 5,
  },
  hourLabel: {
    fontSize: 9,
    textAlign: 'center',
    fontFamily: 'Manrope_600SemiBold',
  },
  hourAmpm: {
    fontSize: 7.5,
    opacity: 0.75,
  },
  hourLabelCurrent: {
    color: '#38BDF8',
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
  },
  hourLabelBest: {
    color: '#34D399',
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  hourLabelMuted: {
    color: 'rgba(255, 255, 255, 0.45)',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
  },
  legendBox: {
    width: 6,
    height: 6,
    borderRadius: 2,
  },
  legendDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Manrope_500Medium',
  },
});
