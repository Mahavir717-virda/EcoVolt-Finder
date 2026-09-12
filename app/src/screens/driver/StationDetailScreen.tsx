import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import {
  ForecastPoint,
  PriceQuote,
  StationRecommendation,
  StationSummary,
} from '@contracts/types';
import { DataQuality, GreennessBand, PowerProvider } from '@contracts/enums';
import {
  Text,
  Button,
  Chip,
  SkeletonCard,
  GreennessGauge,
  ForecastStrip,
  PriceBreakdown,
  TrueCostCard,
  LocationLine,
} from '../../components';
import { formatProviderName } from '../../features/stations/utils';
import { colors, radii, shadows, spacing } from '../../theme/tokens';

type StationDetailRouteProp = RouteProp<DriverStackParamList, 'StationDetail'>;

interface FullStationDetail extends StationSummary {
  address?: string;
  operatorPhone?: string;
  zoneId?: string;
  pricing?: PriceQuote[];
  amenities?: string[];
  openHours?: string;
}

export const StationDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<StationDetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const stationId = route.params?.stationId || 'station-001';

  // 1. Fetch Station Details
  const stationQuery = useQuery<FullStationDetail>({
    queryKey: ['station', stationId],
    queryFn: async () => {
      const res = await http.get<FullStationDetail>(`/stations/${stationId}`);
      return res;
    },
    staleTime: 30000,
  });

  // 2. Fetch 24h Grid Forecast
  const forecastQuery = useQuery<ForecastPoint[]>({
    queryKey: ['grid', 'forecast'],
    queryFn: async () => {
      const res = await http.get<ForecastPoint[]>('/grid/forecast');
      return res;
    },
    staleTime: 60000,
  });

  // 3. Fetch Recommendations
  const recQuery = useQuery<StationRecommendation[]>({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const res = await http.get<StationRecommendation[]>('/recommendations');
      return res;
    },
    staleTime: 30000,
  });

  const isLoading = stationQuery.isLoading;
  const station = stationQuery.data;
  const forecast = forecastQuery.data || [];
  const recommendations = recQuery.data || [];

  // Find matching recommendation for this station
  const activeRec: Partial<StationRecommendation> =
    recommendations.find(
      (r) => r.station?.id === stationId || r.stationId === stationId
    ) ||
    recommendations[0] || {
      station: station,
      stationId: station?.id || stationId,
      distanceKm: 2.4,
      travelMinutes: 8,
      energyNeededKwh: 18.0,
      chargingCost: 111.6,
      travelCost: 14.4,
      trueTotalCost: 126.0,
      vsCheapestSticker: -9.0,
      reachable: true,
      connectorCompatible: true,
      recommendedWindow: {
        startLocal: '2026-09-12T12:00:00+05:30',
        endLocal: '2026-09-12T13:30:00+05:30',
        renewablePct: 85,
        confidence: 0.74,
      },
      reason:
        'Closest station with 85% renewable solar window at noon — ₹9 cheaper than far station once travel is added.',
    };

  // Fallback pricing if not embedded in station response
  const pricingQuotes: PriceQuote[] =
    station?.pricing ||
    (station?.connectors.map((c) => ({
      stationId: station.id,
      connectorType: c.type,
      baseTariff: 5.5,
      providerMarkup: 0.5,
      touAdjustment: 0.2,
      finalPrice: station.priceFrom || 6.2,
      isEstimate: true,
      currency: 'INR' as const,
      validUntil: new Date(Date.now() + 3600000).toISOString(),
    })) ?? []);

  // Available connectors count
  const availableConnectors = station?.connectors.reduce(
    (acc, c) => acc + c.available,
    0
  ) ?? 0;
  const totalConnectors = station?.connectors.reduce(
    (acc, c) => acc + c.total,
    0
  ) ?? 0;

  const handleChargeNow = () => {
    navigation.navigate('BookingConfirm', {
      stationId,
      connectorType: station?.connectors[0]?.type,
    });
  };

  const handleSmartCharge = () => {
    navigation.navigate('DriverTabs', {
      screen: 'SmartCharge',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {isLoading || !station ? (
          /* Skeletons while fetching */
          <View style={styles.skeletonGroup}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <>
            {/* 1. Header Information Card */}
            <View style={styles.headerCard}>
              <View style={styles.headerTop}>
                <View style={styles.titleArea}>
                  <Text variant="sectionLabel" style={styles.stationTitle}>
                    {station.name}
                  </Text>
                  <Text variant="caption" color={colors.ink2}>
                    {formatProviderName(station.provider)} · {station.operatorName}
                  </Text>
                </View>

                <Chip
                  label={station.openHours || '24/7 OPEN'}
                  variant="subtle"
                  color={colors.brand}
                  backgroundColor={colors.brandTint}
                />
              </View>

              {station.address && (
                <LocationLine address={station.address} style={styles.addressText} />
              )}

              {/* Quick Summary Row */}
              <View style={styles.summaryBar}>
                <View style={styles.summaryItem}>
                  <Text variant="micro" color={colors.ink3}>
                    Available Plugs
                  </Text>
                  <Text variant="body" color={colors.brand} style={styles.summaryVal}>
                    {availableConnectors}/{totalConnectors} Free
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text variant="micro" color={colors.ink3}>
                    Distance
                  </Text>
                  <Text variant="body" style={styles.summaryVal}>
                    {activeRec.distanceKm ?? 2.4} km ({activeRec.travelMinutes ?? 8}m)
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text variant="micro" color={colors.ink3}>
                    Tariff From
                  </Text>
                  <Text variant="body" style={styles.summaryVal}>
                    ₹{(station.priceFrom ?? pricingQuotes[0]?.finalPrice ?? 6.2).toFixed(1)}/kWh
                  </Text>
                </View>
              </View>

              {/* Amenities */}
              {station.amenities && station.amenities.length > 0 && (
                <View style={styles.amenitiesRow}>
                  {station.amenities.map((item, idx) => (
                    <View key={idx} style={styles.amenityTag}>
                      <Text variant="micro" color={colors.ink2}>
                        ✓ {item.charAt(0).toUpperCase() + item.slice(1)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 2. Signature Component: GreennessGauge */}
            <GreennessGauge
              renewablePct={station.greenness?.renewablePct ?? 75}
              carbonFreePct={(station.greenness?.renewablePct ?? 75) + 2}
              carbonIntensity={410}
              quality={station.greenness?.quality ?? DataQuality.MOCK}
              band={station.greenness?.band ?? GreennessBand.VERY_HIGH}
            />

            {/* 3. Signature Component: ForecastStrip */}
            <ForecastStrip
              forecast={forecast}
              recommendedWindow={activeRec.recommendedWindow}
            />

            {/* 4. Signature Component: PriceBreakdown */}
            <PriceBreakdown pricing={pricingQuotes} />

            {/* 5. Signature Component: TrueCostCard */}
            <TrueCostCard recommendation={activeRec} />
          </>
        )}
      </ScrollView>

      {/* 6. Sticky Floating Bottom Action Bar (Two CTAs) */}
      <View
        style={[
          styles.bottomActionBar,
          { paddingBottom: Math.max(insets.bottom, spacing.base) },
        ]}
      >
        <Button
          label="⚡ Charge Now"
          variant="secondary"
          onPress={handleChargeNow}
          style={styles.chargeNowBtn}
        />
        <Button
          label="🌱 Smart Charge"
          variant="primary"
          onPress={handleSmartCharge}
          style={styles.smartChargeBtn}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.base,
  },
  skeletonGroup: {
    gap: spacing.base,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.e1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleArea: {
    flex: 1,
    gap: 2,
  },
  stationTitle: {
    fontFamily: 'Manrope_700Bold',
  },
  addressText: {
    marginTop: -2,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: 4,
  },
  summaryItem: {
    flex: 1,
    gap: 2,
  },
  summaryVal: {
    fontFamily: 'Manrope_600SemiBold',
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 4,
  },
  amenityTag: {
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    gap: spacing.sm,
    ...shadows.e2,
  },
  chargeNowBtn: {
    flex: 1,
    height: 50,
  },
  smartChargeBtn: {
    flex: 1.2,
    height: 50,
  },
});
