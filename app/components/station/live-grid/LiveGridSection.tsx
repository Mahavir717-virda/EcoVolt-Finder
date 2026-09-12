import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GridSnapshot, ForecastPoint, greennessBandLabel } from '@/lib/gridData';
import { EnergyFlowBackground } from './EnergyFlowBackground';
import { LiveEnergyGauge } from './LiveEnergyGauge';
import { LiveBadge } from './LiveBadge';
import { MLLiveBadge } from './MLLiveBadge';
import { CarbonMetricsRow } from './CarbonMetricsRow';
import { GridMixBar } from './GridMixBar';
import { BestChargingWindowCard } from './BestChargingWindowCard';
import { RenewableForecastChart } from './RenewableForecastChart';
import { getInterpolatedGridTheme } from './gridGradients';

export interface LiveGridSectionProps {
  liveGrid: GridSnapshot;
  forecast: ForecastPoint[];
  bestWindow: {
    label: string;
    renewablePct: number;
    savingsRs: number;
  };
  isLive?: boolean;
  t?: (key: string, fallback: string) => string;
  style?: ViewStyle;
}

export const LiveGridSection: React.FC<LiveGridSectionProps> = ({
  liveGrid,
  forecast,
  bestWindow,
  isLive = true,
  t = (_, fallback) => fallback,
  style,
}) => {
  const renewablePct = liveGrid.renewablePct ?? 0;
  const carbonFreePct = liveGrid.carbonFreePct ?? renewablePct + 4;
  const carbonIntensity = liveGrid.carbonIntensity ?? 450;
  const bandLabel = greennessBandLabel(liveGrid.band);
  const theme = getInterpolatedGridTheme(renewablePct);

  // Current IST hour for forecast highlighting
  const currentISTHour = Math.floor((new Date().getUTCHours() + 5.5) % 24);

  return (
    <View style={[styles.wrapper, style]}>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. LIVE ENERGY HERO CARD (Minimal, Atmospheric, Clean)        */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.heroCard,
          {
            borderColor: theme.borderColor,
            shadowColor: theme.ambientGlow,
          },
        ]}
      >
        {/* Dynamic Atmospheric Energy Flow Background */}
        <EnergyFlowBackground renewablePct={renewablePct} />

        {/* Hero Card Content */}
        <View style={styles.heroContent}>
          {/* Header Row */}
          <View style={styles.heroHeaderRow}>
            <View style={styles.titleCol}>
              <Text style={styles.heroTitle}>
                {t('station.live_greenness', 'Live Grid Greenness')}
              </Text>
              <Text style={styles.heroSubtitle}>
                {liveGrid.zoneName || 'West India · Gujarat'}
              </Text>
            </View>

            {/* Glowing LIVE Badge */}
            <LiveBadge
              label={isLive ? 'LIVE' : liveGrid.quality?.toUpperCase() || 'LIVE'}
              dotColor={theme.accentColor}
            />
          </View>

          {/* Core Energy Gauge & Telemetry Block */}
          <View style={styles.gaugeMetricsRow}>
            {/* Animated Circular Gauge */}
            <LiveEnergyGauge
              renewablePct={renewablePct}
              label={t('station.renewable', 'renewable')}
              size={104}
              strokeWidth={7}
            />

            {/* Telemetry rows */}
            <CarbonMetricsRow
              renewablePct={renewablePct}
              carbonFreePct={carbonFreePct}
              carbonIntensity={carbonIntensity}
              bandLabel={bandLabel}
              carbonFreeLabel={t('station.carbon_free', 'Carbon-free')}
              carbonIntensityLabel={t('station.carbon_intensity', 'Carbon intensity')}
            />
          </View>

          {/* Grid Mix Right Now */}
          <GridMixBar
            breakdown={liveGrid.breakdown}
            title={t('station.grid_mix', 'Grid Mix Right Now')}
            t={t}
          />

          {/* Explanatory Footnote */}
          <View style={styles.footnoteRow}>
            <Ionicons name="information-circle-outline" size={11} color="rgba(255, 255, 255, 0.4)" />
            <Text style={styles.footnoteText}>
              {t('station.renewable_note', 'Renewable ≠ Carbon-free (nuclear excluded)')}
            </Text>
          </View>
        </View>
      </View>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. 24H RENEWABLE FORECAST CARD (Minimal & Structured)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <View style={styles.forecastCard}>
        {/* Header */}
        <View style={styles.forecastHeaderRow}>
          <View style={styles.titleCol}>
            <Text style={styles.forecastTitle}>
              {t('station.forecast_24h', '24h Renewable Forecast')}
            </Text>
          </View>

          {/* ML LIVE Shimmer Badge */}
          <MLLiveBadge label={isLive ? 'ML LIVE' : 'ESTIMATE'} />
        </View>

        {/* Minimal 1-Row Best Window Callout */}
        <BestChargingWindowCard
          label={bestWindow.label}
          renewablePct={bestWindow.renewablePct}
          savingsRs={bestWindow.savingsRs}
          t={t}
        />

        {/* Airy 24h Hourly Forecast Chart */}
        <RenewableForecastChart
          forecast={forecast}
          currentISTHour={currentISTHour}
          t={t}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },

  // ── Hero Card ──────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: '#051322',
    position: 'relative',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  heroContent: {
    padding: 14,
    gap: 10,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 1,
    marginRight: 8,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    fontFamily: 'Manrope_800ExtraBold',
  },
  heroSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Manrope_500Medium',
  },
  gaugeMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  footnoteText: {
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Manrope_400Regular',
    flexShrink: 1,
  },

  // ── Forecast Card ──────────────────────────────────────────────────
  forecastCard: {
    backgroundColor: '#081422',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  forecastHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  forecastTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    fontFamily: 'Manrope_700Bold',
  },
});
