import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GridSnapshot, ForecastPoint, greennessBandLabel } from '@/lib/gridData';
import { EnergyFlowBackground } from './EnergyFlowBackground';
import { LiveEnergyGauge } from './LiveEnergyGauge';
import { LiveBadge } from './LiveBadge';
import { CarbonMetricsRow } from './CarbonMetricsRow';
import { GridMixBar } from './GridMixBar';
import { BestChargingWindowCard } from './BestChargingWindowCard';
import { getInterpolatedGridTheme } from './gridGradients';

export interface HomeLiveGridCardProps {
  liveGrid: GridSnapshot;
  forecast?: ForecastPoint[];
  isLive?: boolean;
  onPress?: () => void;
  t?: (key: string, fallback: string) => string;
  style?: ViewStyle;
}

export const HomeLiveGridCard: React.FC<HomeLiveGridCardProps> = ({
  liveGrid,
  forecast,
  isLive = true,
  onPress,
  t = (_, fallback) => fallback,
  style,
}) => {
  const renewablePct = liveGrid.renewablePct ?? 0;
  const carbonFreePct = liveGrid.carbonFreePct ?? Math.min(100, renewablePct + 4);
  const carbonIntensity = liveGrid.carbonIntensity ?? 450;
  const bandLabel = greennessBandLabel(liveGrid.band);
  const theme = getInterpolatedGridTheme(renewablePct);

  // Compute best window from forecast if available
  const bestWindow = useMemo(() => {
    if (!forecast || forecast.length === 0) return null;
    let maxPt = forecast[0];
    let maxIdx = 0;
    forecast.forEach((pt, idx) => {
      if (pt.renewablePct > maxPt.renewablePct) {
        maxPt = pt;
        maxIdx = idx;
      }
    });

    const nextPt = forecast[(maxIdx + 1) % forecast.length];
    const label = `${maxPt.label} – ${nextPt ? nextPt.label : 'Later'}`;
    const savingsRs = Math.max(35, Math.round((maxPt.renewablePct - 25) * 2.2));

    return {
      label,
      renewablePct: maxPt.renewablePct,
      savingsRs,
    };
  }, [forecast]);

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.9 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.cardContainer,
        {
          borderColor: theme.borderColor,
          shadowColor: theme.ambientGlow,
        },
        style,
      ]}
    >
      {/* Atmospheric Energy Flow Gradient Background */}
      <EnergyFlowBackground renewablePct={renewablePct} />

      {/* Content Container */}
      <View style={styles.cardContent}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.titleCol}>
            <View style={styles.titleBadgeRow}>
              <Ionicons name="leaf" size={13} color={theme.accentColor} />
              <Text style={styles.headerTitle}>
                {t('station.live_greenness', 'Live Grid Greenness')}
              </Text>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {liveGrid.zoneName || 'West India · Gujarat'}
            </Text>
          </View>

          <View style={styles.rightActions}>
            <LiveBadge
              label={isLive ? 'LIVE' : liveGrid.quality?.toUpperCase() || 'LIVE'}
              dotColor={theme.accentColor}
            />
            {onPress && (
              <Ionicons
                name="chevron-forward"
                size={16}
                color="rgba(255, 255, 255, 0.6)"
              />
            )}
          </View>
        </View>

        {/* Central Gauge & Telemetry Block */}
        <View style={styles.middleRow}>
          <LiveEnergyGauge
            renewablePct={renewablePct}
            label={t('station.renewable', 'renewable')}
            size={96}
            strokeWidth={6.5}
          />

          <CarbonMetricsRow
            renewablePct={renewablePct}
            carbonFreePct={carbonFreePct}
            carbonIntensity={carbonIntensity}
            bandLabel={bandLabel}
            carbonFreeLabel={t('station.carbon_free', 'Carbon-free')}
            carbonIntensityLabel={t('station.carbon_intensity', 'Intensity')}
          />
        </View>

        {/* Grid Mix Right Now */}
        <GridMixBar
          breakdown={liveGrid.breakdown}
          title={t('station.grid_mix', 'Grid Mix Right Now')}
          t={t}
        />

        {/* Best Charging Window Mini Banner if forecast available */}
        {bestWindow && (
          <BestChargingWindowCard
            label={bestWindow.label}
            renewablePct={bestWindow.renewablePct}
            savingsRs={bestWindow.savingsRs}
            t={t}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#051322',
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  cardContent: {
    padding: 14,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 1,
    marginRight: 8,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    fontFamily: 'Manrope_800ExtraBold',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: 'Manrope_500Medium',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
