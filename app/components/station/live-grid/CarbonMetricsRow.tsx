import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getInterpolatedGridTheme } from './gridGradients';

interface CarbonMetricsRowProps {
  renewablePct: number;
  carbonFreePct: number;
  carbonIntensity: number;
  bandLabel: string;
  renewableNote?: string;
  carbonFreeLabel?: string;
  carbonIntensityLabel?: string;
}

export const CarbonMetricsRow: React.FC<CarbonMetricsRowProps> = ({
  renewablePct,
  carbonFreePct,
  carbonIntensity,
  bandLabel,
  carbonFreeLabel = 'Carbon-free',
  carbonIntensityLabel = 'Intensity',
}) => {
  const theme = getInterpolatedGridTheme(renewablePct);

  return (
    <View style={styles.container}>
      {/* Top Band Status Tag */}
      <View
        style={[
          styles.bandPill,
          {
            backgroundColor: theme.pillBg,
            borderColor: theme.borderColor,
          },
        ]}
      >
        <Ionicons name="shield-checkmark" size={10} color={theme.accentLight} />
        <Text style={[styles.bandPillText, { color: theme.accentLight }]} numberOfLines={1}>
          {bandLabel} Greenness
        </Text>
      </View>

      {/* Structured 2-Column Telemetry Box (Prevents any horizontal text stacking) */}
      <View style={styles.metricsBox}>
        {/* Metric 1: Carbon-free */}
        <View style={styles.metricCol}>
          <Text style={styles.metricKey} numberOfLines={1}>
            {carbonFreeLabel}
          </Text>
          <Text style={styles.metricVal} numberOfLines={1}>
            {carbonFreePct.toFixed(0)}%
          </Text>
        </View>

        <View style={styles.vDivider} />

        {/* Metric 2: Carbon Intensity */}
        <View style={styles.metricCol}>
          <Text style={styles.metricKey} numberOfLines={1}>
            {carbonIntensityLabel}
          </Text>
          <Text style={styles.metricVal} numberOfLines={1}>
            {carbonIntensity}
            <Text style={styles.metricUnit}> gCO₂</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
    minWidth: 0,
  },
  bandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: '100%',
  },
  bandPillText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  metricsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 1,
    minWidth: 0,
  },
  vDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 8,
  },
  metricKey: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Manrope_500Medium',
  },
  metricVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
  },
  metricUnit: {
    fontSize: 9.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.55)',
  },
});
