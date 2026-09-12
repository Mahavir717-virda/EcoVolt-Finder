import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface GridMixBreakdown {
  solar: number;
  wind: number;
  hydro: number;
  nuclear: number;
  coal: number;
  gas: number;
  biomass?: number;
  unknown?: number;
}

interface GridMixBarProps {
  breakdown: GridMixBreakdown;
  title?: string;
  t?: (key: string, fallback: string) => string;
}

export const GridMixBar: React.FC<GridMixBarProps> = ({
  breakdown,
  title = 'Grid Mix Right Now',
  t = (_, fallback) => fallback,
}) => {
  const total =
    (breakdown.solar || 0) +
    (breakdown.wind || 0) +
    (breakdown.hydro || 0) +
    (breakdown.nuclear || 0) +
    (breakdown.coal || 0) +
    (breakdown.gas || 0) +
    (breakdown.biomass || 0) +
    (breakdown.unknown || 0);

  const solarPct = total > 0 ? Math.round(((breakdown.solar || 0) / total) * 100) : 0;
  const windPct = total > 0 ? Math.round(((breakdown.wind || 0) / total) * 100) : 0;
  const hydroPct = total > 0 ? Math.round(((breakdown.hydro || 0) / total) * 100) : 0;
  const nuclearPct = total > 0 ? Math.round(((breakdown.nuclear || 0) / total) * 100) : 0;
  const coalGasPct =
    total > 0
      ? Math.round((((breakdown.coal || 0) + (breakdown.gas || 0)) / total) * 100)
      : 0;

  const segments = [
    { key: 'solar', label: t('profile.solar', 'Solar'), pct: solarPct, color: '#F59E0B' },
    { key: 'wind', label: t('profile.wind', 'Wind'), pct: windPct, color: '#06B6D4' },
    { key: 'hydro', label: t('profile.hydro', 'Hydro'), pct: hydroPct, color: '#3B82F6' },
    { key: 'nuclear', label: 'Nuclear', pct: nuclearPct, color: '#8B5CF6' },
    { key: 'coal_gas', label: t('profile.coal_gas', 'Coal+Gas'), pct: coalGasPct, color: '#64748B' },
  ];

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {/* Sleek Segmented Bar */}
      <View style={styles.barTrack}>
        {segments.map((seg) => {
          if (seg.pct <= 0) return null;
          return (
            <View
              key={seg.key}
              style={[
                styles.segment,
                {
                  flex: seg.pct,
                  backgroundColor: seg.color,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Responsive Inline Dot Legend */}
      <View style={styles.legendRow}>
        {segments.map((seg) => (
          <View key={seg.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {seg.label}{' '}
              <Text style={styles.legendPct}>
                {seg.pct}%
              </Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Manrope_700Bold',
  },
  barTrack: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  segment: {
    height: '100%',
    minWidth: 3,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 10,
    rowGap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: 'Manrope_500Medium',
  },
  legendPct: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Manrope_700Bold',
  },
});
