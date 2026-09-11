import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DataQuality } from '@contracts/enums';
import {
  colors,
  greennessColor,
  greennessBandLabel,
  radii,
  shadows,
  spacing,
} from '../../theme/tokens';
import { Text } from '../primitives/Text';
import { Chip } from '../primitives/Chip';

export interface GreennessGaugeProps {
  renewablePct: number;
  carbonFreePct?: number;
  carbonIntensity?: number;
  quality?: DataQuality;
  band?: string;
  style?: ViewStyle;
}

// Helpers for SVG Arc Path
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ');
}

export const GreennessGauge: React.FC<GreennessGaugeProps> = ({
  renewablePct,
  carbonFreePct = renewablePct + 2,
  carbonIntensity = 410,
  quality = DataQuality.MOCK,
  style,
}) => {
  const gaugeColor = greennessColor(renewablePct);
  const bandLabel = greennessBandLabel(renewablePct);

  // Arc spans 240 degrees (from 150° to 390° where 270° is top)
  const START_ANGLE = 150;
  const TOTAL_SWEEP = 240;
  const progressSweep = (Math.min(Math.max(renewablePct, 0), 100) / 100) * TOTAL_SWEEP;
  const currentEndAngle = START_ANGLE + progressSweep;

  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  const bgPath = describeArc(center, center, radius, START_ANGLE, START_ANGLE + TOTAL_SWEEP);
  const progressPath = describeArc(center, center, radius, START_ANGLE, currentEndAngle);

  return (
    <View style={[styles.container, style]}>
      {/* Header with Quality Tag */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithDot}>
          <View style={[styles.statusDot, { backgroundColor: gaugeColor }]} />
          <Text variant="title" style={styles.sectionTitle}>
            Live Grid Greenness
          </Text>
        </View>

        <Chip
          label={quality.toUpperCase()}
          variant="subtle"
          color={quality === 'live' ? colors.brand : colors.ink2}
          backgroundColor={quality === 'live' ? colors.brandTint : colors.surfaceSunken}
        />
      </View>

      {/* SVG Radial Arc */}
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size * 0.82} viewBox={`0 0 ${size} ${size}`}>
          {/* Background Arc */}
          <Path
            d={bgPath}
            fill="none"
            stroke={colors.surfaceSunken}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active Colored Arc */}
          {progressSweep > 0 && (
            <Path
              d={progressPath}
              fill="none"
              stroke={gaugeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          )}
        </Svg>

        {/* Center Numbers */}
        <View style={styles.centerTextOverlay}>
          <Text variant="display" color={gaugeColor} style={styles.percentText}>
            {renewablePct}%
          </Text>
          <Text variant="caption" color={colors.ink2} style={styles.bandText}>
            {bandLabel}
          </Text>
        </View>
      </View>

      {/* Edge Case #4: Renewable vs Carbon-Free Separation */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text variant="micro" color={colors.ink3}>
            Renewable Mix (Solar+Wind+Hydro)
          </Text>
          <Text variant="bodyMedium" color={gaugeColor} style={styles.metricVal}>
            {renewablePct}%
          </Text>
        </View>

        <View style={styles.metricCard}>
          <Text variant="micro" color={colors.ink3}>
            Carbon-Free (+Nuclear)
          </Text>
          <Text variant="bodyMedium" color={colors.ink} style={styles.metricVal}>
            {carbonFreePct}%
          </Text>
        </View>
      </View>

      {/* Edge Case #5: Indian Grid Standard Disclaimer */}
      <View style={styles.footerNote}>
        <Text variant="micro" color={colors.ink3} align="center">
          ⚡ {carbonIntensity} gCO₂eq/kWh · Hydro included per Indian CEA dispatch standard
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing.sm,
    ...shadows.e1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontFamily: 'SpaceGrotesk_600SemiBold',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: spacing.xs,
  },
  centerTextOverlay: {
    position: 'absolute',
    top: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 38,
    lineHeight: 44,
  },
  bandText: {
    fontFamily: 'Manrope_600SemiBold',
    marginTop: -2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceSunken,
    padding: spacing.sm,
    borderRadius: radii.md,
    gap: 2,
  },
  metricVal: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
  },
  footerNote: {
    paddingTop: 4,
  },
});
