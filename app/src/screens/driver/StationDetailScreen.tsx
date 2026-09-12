import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
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
import { DataQuality, GreennessBand, PowerProvider, VehicleClass } from '@contracts/enums';
import {
  Text,
  Button,
  Chip,
  Skeleton,
  SkeletonCard,
  GreennessGauge,
  ForecastStrip,
  PriceBreakdown,
  TrueCostCard,
  LocationLine,
} from '../../components';
import {
  formatProviderName,
  formatConnectorName,
  calculateHaversineDistanceKm,
  estimateTravelMinutes,
} from '../../features/stations/utils';
import { useDriverLocation } from '../../features/stations/useDriverLocation';
import { colors, radii, shadows, spacing } from '../../theme/tokens';
import { getStationImageSource } from '../../constants/stationImages';

type StationDetailRouteProp = RouteProp<DriverStackParamList, 'StationDetail'>;

interface PortDetail {
  portNumber: number;
  status: 'available' | 'booked' | 'maintenance' | 'offline';
}

interface ConnectorSlot {
  connectorId: string;
  type: string;
  powerKw: number;
  status: string;
  totalCount: number;
  availableCount: number;
  bookedCount: number;
  ports?: PortDetail[];
}

interface SlotMatrixResponse {
  stationId: string;
  windowStart: string;
  windowEnd: string;
  connectors: ConnectorSlot[];
  totalFree: number;
  totalOccupied: number;
  totalCapacity: number;
}

interface FullStationDetail extends StationSummary {
  address?: string;
  operatorPhone?: string;
  zoneId?: string;
  pricing?: PriceQuote[];
  amenities?: string[];
  openHours?: string;
  distanceKm?: number;
}

export const StationDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<StationDetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();
  const stationId = route.params?.stationId || 'station-001';
  const [isHeroLoading, setIsHeroLoading] = useState(true);
  const [selectedConnectorType, setSelectedConnectorType] = useState<string>('');

  // 1. Fetch Station Details
  const stationQuery = useQuery<FullStationDetail>({
    queryKey: ['station', stationId],
    queryFn: async () => {
      const res = await http.get<FullStationDetail>(`/stations/${stationId}`);
      return res;
    },
    staleTime: 10000,
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

  // 4. Fetch live slot matrix for current window (next 1 hour)
  const nowIso = new Date().toISOString();
  const oneHourIso = new Date(Date.now() + 3600 * 1000).toISOString();
  const slotQuery = useQuery<SlotMatrixResponse>({
    queryKey: ['slots', stationId, 'current'],
    queryFn: async () => {
      return http.get<SlotMatrixResponse>(`/bookings/station/${stationId}/slots`, {
        params: { windowStart: nowIso, windowEnd: oneHourIso },
      });
    },
    enabled: !!stationId,
    staleTime: 10000,
    refetchInterval: 15000,
  });

  const { coords: driverCoords } = useDriverLocation();

  const isLoading = stationQuery.isLoading;
  const station = stationQuery.data;
  const forecast = forecastQuery.data || [];
  const recommendations = recQuery.data || [];

  // Live slot counts from the slot matrix API
  const liveSlotData = slotQuery.data;
  const liveFreeSlots = liveSlotData?.totalFree ?? station?.connectors.reduce((a, c) => a + (c.available ?? c.total ?? 0), 0) ?? 0;
  const liveTotalSlots = liveSlotData?.totalCapacity ?? station?.connectors.reduce((a, c) => a + (c.total ?? 0), 0) ?? 0;

  const effectiveConnectorType =
    selectedConnectorType || (station?.connectors && station.connectors[0]?.type) || 'ccs2';

  // Live dynamic Haversine distance and travel metrics
  const liveDistKm = station?.location
    ? calculateHaversineDistanceKm(driverCoords, station.location)
    : (station?.distanceKm ?? 2.4);
  const liveTravelMinutes = estimateTravelMinutes(liveDistKm, VehicleClass.CAR);
  const liveTravelCost = Number((liveDistKm * 0.14 * 6.5).toFixed(1));
  const liveChargingCost = Number((18.0 * (station?.priceFrom || 6.2)).toFixed(1));
  const liveTrueTotal = Number((liveChargingCost + liveTravelCost).toFixed(1));

  // Find matching recommendation for this station or construct dynamic live recommendation
  const matchedRec = recommendations.find(
    (r) => r.station?.id === stationId || r.stationId === stationId
  );

  const activeRec: Partial<StationRecommendation> = matchedRec || {
    station: station,
    stationId: station?.id || stationId,
    distanceKm: liveDistKm,
    travelMinutes: liveTravelMinutes,
    energyNeededKwh: 18.0,
    chargingCost: liveChargingCost,
    travelCost: liveTravelCost,
    trueTotalCost: liveTrueTotal,
    vsCheapestSticker: -9.0,
    reachable: true,
    connectorCompatible: true,
    recommendedWindow: {
      startLocal: '2026-09-12T12:00:00+05:30',
      endLocal: '2026-09-12T13:30:00+05:30',
      renewablePct: 85,
      confidence: 0.74,
    },
    reason: `Optimal route (${liveDistKm} km · ${liveTravelMinutes}m) with live grid solar pricing.`,
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

  const handleChargeNow = (connector?: string) => {
    navigation.navigate('BookingConfirm', {
      stationId,
      connectorType: connector || effectiveConnectorType,
    });
  };

  const handleSmartCharge = () => {
    navigation.navigate('DriverTabs', {
      screen: 'SmartCharge',
    });
  };

  const handleCheckSlots = (connector?: string) => {
    navigation.navigate('SlotAvailability', {
      stationId,
      connectorType: connector,
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
          <View style={styles.skeletonGroup}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <>
            {/* Hero Station Image */}
            <View style={styles.heroImageContainer}>
              {isHeroLoading && (
                <Skeleton
                  width="100%"
                  height={190}
                  borderRadius={radii.xl}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Image
                source={getStationImageSource(station.id || station.name)}
                style={styles.heroImage}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
                priority="high"
                onLoadStart={() => setIsHeroLoading(true)}
                onLoad={() => setIsHeroLoading(false)}
                onError={() => setIsHeroLoading(false)}
              />
              <View style={styles.heroBadge}>
                <Chip
                  label={station.openHours || '24/7 OPEN'}
                  variant="solid"
                  color="#FFFFFF"
                  backgroundColor="rgba(0,0,0,0.65)"
                />
              </View>
            </View>

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
              </View>

              {station.address && (
                <LocationLine address={station.address} style={styles.addressText} />
              )}

              {/* Quick Summary Row */}
              <View style={styles.summaryBar}>
                <View style={styles.summaryItem}>
                  <Text variant="micro" color={colors.ink3}>
                    Available Now
                  </Text>
                  <Text
                    variant="body"
                    color={liveFreeSlots > 0 ? colors.brand : '#EF4444'}
                    style={styles.summaryVal}
                  >
                    {liveFreeSlots}/{liveTotalSlots} Free
                  </Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryItem}>
                  <Text variant="micro" color={colors.ink3}>
                    Distance
                  </Text>
                  <Text variant="body" style={styles.summaryVal}>
                    {activeRec.distanceKm ?? liveDistKm} km ({activeRec.travelMinutes ?? liveTravelMinutes}m)
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

              {/* Check Slots CTA */}
              <TouchableOpacity onPress={() => handleCheckSlots()} style={styles.checkSlotsBtn}>
                <Text variant="micro" color={colors.brand} style={styles.checkSlotsBtnText}>
                  🗓 View Hourly Slot Availability Schedule →
                </Text>
              </TouchableOpacity>

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

            {/* 2. Live Connectors & Port Status Breakdown Card */}
            <View style={styles.connectorsCard}>
              <View style={styles.connectorsCardHeader}>
                <View>
                  <Text variant="cardTitle" style={styles.connectorsHeading}>
                    ⚡ Chargers & Live Port Availability
                  </Text>
                  <Text variant="micro" color={colors.ink2}>
                    Total {liveFreeSlots} of {liveTotalSlots} ports free right now
                  </Text>
                </View>
              </View>

              <View style={styles.connectorsList}>
                {station.connectors.map((c) => {
                  const cSlot = liveSlotData?.connectors.find((item) => item.type === c.type);
                  const freeCount = cSlot ? cSlot.availableCount : (c.available ?? c.total ?? 1);
                  const totCount = cSlot ? cSlot.totalCount : (c.total ?? 1);
                  const isSelected = effectiveConnectorType === c.type;
                  const isFull = freeCount === 0;

                  return (
                    <TouchableOpacity
                      key={c.type}
                      activeOpacity={0.88}
                      onPress={() => setSelectedConnectorType(c.type)}
                      style={[
                        styles.connectorItemBox,
                        isSelected && styles.connectorItemSelected,
                      ]}
                    >
                      {/* Connector Row Header */}
                      <View style={styles.connectorItemTop}>
                        <View style={styles.connectorTypeInfo}>
                          <Text variant="bodyMedium" style={styles.connectorNameText}>
                            {formatConnectorName(c.type as any)}
                          </Text>
                          <Text variant="micro" color={colors.ink2}>
                            {c.powerKw} kW Fast Charging
                          </Text>
                        </View>

                        <Chip
                          label={isFull ? '🔴 FULL' : `🟢 ${freeCount} of ${totCount} Free`}
                          variant="subtle"
                          color={isFull ? '#EF4444' : colors.brand}
                          backgroundColor={isFull ? '#FEF2F2' : '#EDF7F0'}
                        />
                      </View>

                      {/* Visual Port Badges */}
                      <View style={styles.portPillsRow}>
                        {cSlot?.ports && cSlot.ports.length > 0 ? (
                          cSlot.ports.map((p) => (
                            <View
                              key={p.portNumber}
                              style={[
                                styles.portPill,
                                p.status === 'available'
                                  ? styles.portPillAvailable
                                  : styles.portPillBooked,
                              ]}
                            >
                              <Text style={styles.portPillIcon}>
                                {p.status === 'available' ? '⚡' : '🔒'}
                              </Text>
                              <Text variant="micro" style={styles.portPillText}>
                                Port {p.portNumber}: {p.status === 'available' ? 'Free' : 'Booked'}
                              </Text>
                            </View>
                          ))
                        ) : (
                          Array.from({ length: totCount }).map((_, idx) => {
                            const isAvail = idx < freeCount;
                            return (
                              <View
                                key={idx}
                                style={[
                                  styles.portPill,
                                  isAvail ? styles.portPillAvailable : styles.portPillBooked,
                                ]}
                              >
                                <Text style={styles.portPillIcon}>{isAvail ? '⚡' : '🔒'}</Text>
                                <Text variant="micro" style={styles.portPillText}>
                                  Port {idx + 1}: {isAvail ? 'Free' : 'Booked'}
                                </Text>
                              </View>
                            );
                          })
                        )}
                      </View>

                      {/* Quick CTA inside connector box */}
                      <View style={styles.connectorActionRow}>
                        <Button
                          label={isFull ? 'View Next Slots' : `Book ${formatConnectorName(c.type as any)}`}
                          variant={isSelected ? 'primary' : 'secondary'}
                          onPress={() => isFull ? handleCheckSlots(c.type) : handleChargeNow(c.type)}
                          style={styles.bookConnectorBtn}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. GreennessGauge */}
            <GreennessGauge
              renewablePct={station.greenness?.renewablePct ?? 75}
              carbonFreePct={(station.greenness?.renewablePct ?? 75) + 2}
              carbonIntensity={410}
              quality={station.greenness?.quality ?? DataQuality.MOCK}
              band={station.greenness?.band ?? GreennessBand.VERY_HIGH}
            />

            {/* 4. ForecastStrip */}
            <ForecastStrip
              forecast={forecast}
              recommendedWindow={activeRec.recommendedWindow}
            />

            {/* 5. PriceBreakdown */}
            <PriceBreakdown pricing={pricingQuotes} />

            {/* 6. TrueCostCard */}
            <TrueCostCard recommendation={activeRec} />
          </>
        )}
      </ScrollView>

      {/* Sticky Floating Bottom Action Bar */}
      <View
        style={[
          styles.bottomActionBar,
          { paddingBottom: Math.max(insets.bottom, spacing.base) },
        ]}
      >
        <Button
          label={`⚡ Reserve ${formatConnectorName(effectiveConnectorType as any)}`}
          variant="secondary"
          onPress={() => handleChargeNow(effectiveConnectorType)}
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
  heroImageContainer: {
    height: 190,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.e1,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
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
  checkSlotsBtn: {
    backgroundColor: colors.brandTint,
    borderRadius: radii.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brand + '40',
  },
  checkSlotsBtnText: {
    fontFamily: 'Manrope_600SemiBold',
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
  connectorsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.e1,
  },
  connectorsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectorsHeading: {
    fontFamily: 'Manrope_700Bold',
  },
  connectorsList: {
    gap: spacing.sm,
  },
  connectorItemBox: {
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.lg,
    padding: spacing.sm + 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  connectorItemSelected: {
    borderColor: colors.brand,
    backgroundColor: '#F3FBF6',
  },
  connectorItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectorTypeInfo: {
    gap: 2,
  },
  connectorNameText: {
    fontFamily: 'Manrope_700Bold',
    color: colors.ink,
  },
  portPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  portPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 4,
  },
  portPillAvailable: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.brand + '60',
  },
  portPillBooked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  portPillIcon: {
    fontSize: 10,
  },
  portPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.ink,
  },
  connectorActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  bookConnectorBtn: {
    alignSelf: 'flex-end',
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
    flex: 1.2,
    height: 50,
  },
  smartChargeBtn: {
    flex: 1,
    height: 50,
  },
});
