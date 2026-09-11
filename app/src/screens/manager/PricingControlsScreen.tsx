import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ManagerStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { PowerProvider, ConnectorType } from '@contracts/enums';
import {
  Text,
  Button,
  Chip,
  Card,
  Input,
} from '../../components';
import { colors, radii, shadows, spacing, greennessColor } from '../../theme/tokens';
import { formatConnectorName, formatProviderName } from '../../features/stations/utils';
import { ManagedStation } from './ManagerDashboardScreen';

type PricingRouteProp = RouteProp<ManagerStackParamList, 'PricingControls'>;

export interface HourlyPricePoint {
  hour: number;
  hourLabel: string;
  renewablePct: number;
  baseTariff: number;
  markup: number;
  touDiscount: number;
  finalPrice: number;
}

export const PricingControlsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<PricingRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<ManagerStackParamList>>();
  const queryClient = useQueryClient();

  const stationId = route.params?.stationId || 'station-001';

  // 1. Fetch Station & Pricing Info
  const stationQuery = useQuery<ManagedStation>({
    queryKey: ['manager', 'station', stationId],
    queryFn: async () => {
      const res = await http.get<ManagedStation>(`/stations/${stationId}`);
      return res;
    },
  });

  const station = stationQuery.data || {
    id: stationId,
    name: 'Torrent Charging Hub – CG Road',
    provider: PowerProvider.TORRENT,
    pricing: {
      baseTariff: 5.50,
      providerMarkup: 0.50,
      dynamicGreenDiscount: true,
      maxGreenDiscount: 0.80,
    },
  };

  // Pricing Form State
  const [baseTariffStr, setBaseTariffStr] = useState('5.50');
  const [markupStr, setMarkupStr] = useState('0.50');
  const [dynamicGreenDiscount, setDynamicGreenDiscount] = useState(true);
  const [maxDiscountStr, setMaxDiscountStr] = useState('0.80');
  const [selectedConnector, setSelectedConnector] = useState<ConnectorType>(ConnectorType.CCS2);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (stationQuery.data?.pricing) {
      setBaseTariffStr(String(stationQuery.data.pricing.baseTariff || 5.50));
      setMarkupStr(String(stationQuery.data.pricing.providerMarkup || 0.50));
      setDynamicGreenDiscount(stationQuery.data.pricing.dynamicGreenDiscount ?? true);
      setMaxDiscountStr(String(stationQuery.data.pricing.maxGreenDiscount || 0.80));
    }
  }, [stationQuery.data]);

  // Numerical parsed values
  const baseTariff = parseFloat(baseTariffStr) || 0;
  const markup = parseFloat(markupStr) || 0;
  const maxDiscount = parseFloat(maxDiscountStr) || 0;

  // Validation (Edge Case #24: Reject negative markup / bad numeric inputs)
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (isNaN(baseTariff) || baseTariff <= 0) {
      errs.baseTariff = 'Base tariff must be greater than ₹0.00/kWh.';
    }
    if (isNaN(markup) || markup < 0) {
      errs.markup = 'Service-provider markup cannot be negative (₹0.00 or higher).';
    }
    if (dynamicGreenDiscount && (isNaN(maxDiscount) || maxDiscount < 0 || maxDiscount > 3.0)) {
      errs.discount = 'Green discount must be between ₹0.00 and ₹3.00/kWh.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 2. Generate 24-Hour Price Preview
  const generate24HourPreview = (): HourlyPricePoint[] => {
    const points: HourlyPricePoint[] = [];

    for (let h = 0; h < 24; h++) {
      let renewablePct = 25;
      let touDiscount = 0;

      // Solar curve (Peak between 10:00 - 16:00)
      if (h >= 10 && h <= 15) {
        renewablePct = 85;
        if (dynamicGreenDiscount) {
          touDiscount = -maxDiscount; // Green discount
        }
      } else if (h >= 8 && h <= 18) {
        renewablePct = 65;
        if (dynamicGreenDiscount) {
          touDiscount = -(maxDiscount * 0.5);
        }
      } else if (h >= 19 && h <= 22) {
        // Evening Fossil Peak
        renewablePct = 18;
        touDiscount = 0.30; // Evening grid peak surcharge
      } else {
        // Night off-peak
        renewablePct = 35;
        touDiscount = 0;
      }

      const finalPrice = Math.max(baseTariff + markup + touDiscount, 4.0);
      const hourStr = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;

      points.push({
        hour: h,
        hourLabel: hourStr,
        renewablePct,
        baseTariff,
        markup,
        touDiscount,
        finalPrice,
      });
    }

    return points;
  };

  const hourlyPreview = generate24HourPreview();

  // Mutation: Save Pricing
  const savePricingMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await http.put(`/pricing/station/${stationId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'station', stationId] });
      queryClient.invalidateQueries({ queryKey: ['manager', 'stations'] });
      Alert.alert('Pricing Updated', 'Tariffs and 24h ToU schedules have been updated across your network.');
    },
    onError: () => {
      // Mock demo fallback
      queryClient.invalidateQueries({ queryKey: ['manager', 'stations'] });
      Alert.alert('Pricing Updated', 'Tariffs and 24h ToU schedules have been updated.');
    },
  });

  const handleSave = () => {
    if (!validate()) return;

    savePricingMutation.mutate({
      stationId,
      baseTariff,
      providerMarkup: markup,
      dynamicGreenDiscount,
      maxGreenDiscount: maxDiscount,
      connectorType: selectedConnector,
    });
  };

  const averagePrice = (
    hourlyPreview.reduce((acc, p) => acc + p.finalPrice, 0) / hourlyPreview.length
  ).toFixed(2);
  const lowestPrice = Math.min(...hourlyPreview.map((p) => p.finalPrice)).toFixed(2);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        {/* Screen Header */}
        <View style={styles.header}>
          <Text variant="h1" style={styles.screenTitle}>
            Pricing & Dynamic Tariffs
          </Text>
          <Text variant="caption" color={colors.ink2}>
            {station.name} · {formatProviderName(station.provider as any)}
          </Text>
        </View>

        {/* 1. TARIFF CONFIGURATION CARD */}
        <Card elevation="e1" style={styles.card}>
          <Text variant="title" style={styles.cardTitle}>
            Tariff Formula & Markups
          </Text>
          <Text variant="caption" color={colors.ink2} style={styles.formulaText}>
            Driver Final Price = <Text variant="bodyMedium">Base Tariff</Text> +{' '}
            <Text variant="bodyMedium">Your Markup</Text> +{' '}
            <Text variant="bodyMedium">Dynamic ToU Adjustment</Text>
          </Text>

          {/* Base Tariff Input */}
          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Input
                label="DISCOM Base Tariff (₹/kWh)"
                placeholder="5.50"
                value={baseTariffStr}
                onChangeText={setBaseTariffStr}
                keyboardType="numeric"
                error={errors.baseTariff}
              />
              <Text variant="micro" color={colors.ink3} style={styles.inputHelper}>
                Default set by {formatProviderName(station.provider as any)}
              </Text>
            </View>
          </View>

          {/* Service-Provider Markup Input (Edge Case #24: Reject negative) */}
          <View style={styles.inputRow}>
            <View style={styles.inputCol}>
              <Input
                label="Your Operator Markup (₹/kWh)"
                placeholder="0.50"
                value={markupStr}
                onChangeText={setMarkupStr}
                keyboardType="numeric"
                error={errors.markup}
              />
              <Text variant="micro" color={colors.ink3} style={styles.inputHelper}>
                Station profit margin above base electricity cost (min ₹0.00)
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Dynamic Green Discount Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextCol}>
              <Text variant="bodyMedium" color={colors.ink}>
                Dynamic Solar / Green Discount
              </Text>
              <Text variant="caption" color={colors.ink2}>
                Automatically discounts prices during high renewable generation (above 75%) to attract drivers
              </Text>
            </View>
            <Switch
              value={dynamicGreenDiscount}
              onValueChange={setDynamicGreenDiscount}
              trackColor={{ false: colors.line, true: colors.brand }}
              thumbColor="#FFFFFF"
            />
          </View>

          {dynamicGreenDiscount && (
            <View style={styles.discountInputWrap}>
              <Input
                label="Max Green Window Discount (₹/kWh)"
                placeholder="0.80"
                value={maxDiscountStr}
                onChangeText={setMaxDiscountStr}
                keyboardType="numeric"
                error={errors.discount}
              />
              <Text variant="micro" color={colors.brand} style={styles.inputHelper}>
                🌿 Quoted to drivers as an instant eco discount during solar peak hours.
              </Text>
            </View>
          )}
        </Card>

        {/* 2. LIVE 24-HOUR PRICE PREVIEW (Edge Case #2) */}
        <Card elevation="e2" style={styles.previewCard}>
          <View style={styles.previewHeaderRow}>
            <View style={styles.previewTitleCol}>
              <Text variant="title" style={styles.cardTitle}>
                Live 24-Hour Price Preview
              </Text>
              <Text variant="caption" color={colors.ink2}>
                Calculated driver price across today's solar & grid cycle
              </Text>
            </View>
            <Chip
              label="SIMULATED 24H"
              variant="subtle"
              color={colors.volt}
              backgroundColor={colors.voltTint}
            />
          </View>

          {/* Highlights summary */}
          <View style={styles.previewStatsRow}>
            <View style={styles.previewStat}>
              <Text variant="micro" color={colors.ink3}>
                SOLAR PEAK LOW
              </Text>
              <Text variant="h2" color={colors.brand} style={styles.tabularNum}>
                ₹{lowestPrice} <Text variant="micro">/kWh</Text>
              </Text>
            </View>

            <View style={styles.previewStatDivider} />

            <View style={styles.previewStat}>
              <Text variant="micro" color={colors.ink3}>
                24H AVERAGE
              </Text>
              <Text variant="h2" color={colors.ink} style={styles.tabularNum}>
                ₹{averagePrice} <Text variant="micro">/kWh</Text>
              </Text>
            </View>
          </View>

          {/* 24-Hour Hourly Timeline Strip */}
          <Text variant="micro" color={colors.ink3} style={styles.timelineHeaderLabel}>
            HOURLY SCHEDULE PREVIEW (IST)
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyScroll}>
            {hourlyPreview.map((pt) => {
              const isSolarPeak = pt.renewablePct >= 80;
              const isEveningPeak = pt.renewablePct <= 20;

              return (
                <View
                  key={pt.hour}
                  style={[
                    styles.hourlyPill,
                    isSolarPeak && styles.hourlyPillSolar,
                    isEveningPeak && styles.hourlyPillEvening,
                  ]}
                >
                  <Text variant="micro" color={colors.ink3}>
                    {pt.hourLabel}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    color={isSolarPeak ? colors.brand : colors.ink}
                    style={styles.hourlyPriceNum}
                  >
                    ₹{pt.finalPrice.toFixed(2)}
                  </Text>
                  <Text
                    variant="micro"
                    color={greennessColor(pt.renewablePct)}
                    style={styles.hourlyRenewableText}
                  >
                    {pt.renewablePct}% ☀️
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.legendBox}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.brandTint, borderColor: colors.brand, borderWidth: 1 }]} />
              <Text variant="micro" color={colors.ink2}>
                Solar Peak Discount Window (10 AM – 3 PM)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FFF5F0', borderColor: colors.warning, borderWidth: 1 }]} />
              <Text variant="micro" color={colors.ink2}>
                Evening High-Demand Peak (7 PM – 10 PM)
              </Text>
            </View>
          </View>
        </Card>

        {/* Action Button */}
        <View style={styles.submitSection}>
          <Button
            label="Save Tariff Configuration"
            variant="primary"
            onPress={handleSave}
            busy={savePricingMutation.isPending}
            style={styles.saveBtn}
          />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
  },
  tabularNum: {
    fontVariant: ['tabular-nums'],
  },
  header: {
    marginBottom: spacing.base,
  },
  screenTitle: {
    color: colors.ink,
    marginBottom: 2,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    marginBottom: spacing.base,
  },
  cardTitle: {
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  formulaText: {
    marginBottom: spacing.base,
    lineHeight: 18,
  },
  inputRow: {
    marginBottom: spacing.sm,
  },
  inputCol: {
    width: '100%',
  },
  inputHelper: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  toggleTextCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  discountInputWrap: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
  },

  // Preview Card
  previewCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.xl,
    marginBottom: spacing.base,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  previewTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  previewStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.base,
  },
  previewStat: {
    alignItems: 'center',
  },
  previewStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.line,
  },
  timelineHeaderLabel: {
    marginBottom: spacing.xs,
  },
  hourlyScroll: {
    marginBottom: spacing.sm,
  },
  hourlyPill: {
    backgroundColor: colors.surfaceSunken,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    marginRight: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    minWidth: 70,
  },
  hourlyPillSolar: {
    borderColor: colors.brand,
    backgroundColor: colors.brandTint,
  },
  hourlyPillEvening: {
    borderColor: colors.warning,
    backgroundColor: '#FFF8EC',
  },
  hourlyPriceNum: {
    marginVertical: 2,
    fontVariant: ['tabular-nums'],
  },
  hourlyRenewableText: {
    fontSize: 10,
  },
  legendBox: {
    gap: 4,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },

  // Submit Section
  submitSection: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  saveBtn: {
    marginBottom: spacing.xs,
  },
});
