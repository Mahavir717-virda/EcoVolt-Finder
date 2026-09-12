import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { DataQuality } from '@contracts/enums';
import {
  LiveEnergyGauge,
  EnergyFlowBackground,
  CarbonMetricsRow,
  LiveBadge,
  getInterpolatedGridTheme,
} from '../../../components/station/live-grid';
import { greennessBandLabel } from '../../theme/tokens';
import { Text } from '../primitives/Text';

export interface GreennessGaugeProps {
  renewablePct: number;
  carbonFreePct?: number;
  carbonIntensity?: number;
  quality?: DataQuality;
  band?: string;
  style?: ViewStyle;
}

export const GreennessGauge: React.FC<GreennessGaugeProps> = ({
  renewablePct,
  carbonFreePct = renewablePct + 2,
  carbonIntensity = 410,
  quality = DataQuality.MOCK,
  band,
  style,
}) => {
  const theme = getInterpolatedGridTheme(renewablePct);
  const bandLabel = band ? greennessBandLabel(renewablePct) : 'Optimal';

  return (
    <View
      style={[
        styles.heroCard,
        {
          borderColor: theme.borderColor,
          shadowColor: theme.ambientGlow,
        },
        style,
      ]}
    >
      {/* Dynamic Atmospheric Energy Flow Background */}
      <EnergyFlowBackground renewablePct={renewablePct} />

      {/* Hero Card Content */}
      <View style={styles.heroContent}>
        {/* Top Header Row */}
        <View style={styles.heroHeaderRow}>
          <View style={styles.titleCol}>
            <Text style={styles.heroTitle}>Live Grid Greenness</Text>
            <Text style={styles.heroSubtitle}>West India · Gujarat</Text>
          </View>

          {/* Glowing LIVE Badge */}
          <LiveBadge
            label={quality.toUpperCase()}
            dotColor={theme.accentColor}
          />
        </View>

        {/* Core Energy Gauge & Carbon Metrics Row */}
        <View style={styles.gaugeMetricsRow}>
          <LiveEnergyGauge
            renewablePct={renewablePct}
            label="renewable"
            size={124}
            strokeWidth={8}
          />

          <CarbonMetricsRow
            renewablePct={renewablePct}
            carbonFreePct={carbonFreePct}
            carbonIntensity={carbonIntensity}
            bandLabel={bandLabel}
            renewableNote="Renewable ≠ Carbon-free (nuclear excluded)"
            carbonFreeLabel="Carbon-free"
            carbonIntensityLabel="Carbon intensity"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.2,
    backgroundColor: '#051322',
    position: 'relative',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: {
    padding: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleCol: {
    flex: 1,
    gap: 2,
    marginRight: 8,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    fontFamily: 'Manrope_700Bold',
  },
  heroSubtitle: {
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: 'Manrope_500Medium',
  },
  gaugeMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
