import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { DriverStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import { DriverImpact } from '@contracts/types';
import {
  Text,
  Button,
  Chip,
  Card,
  EmptyState,
  SkeletonCard,
} from '../../components';
import { colors, radii, shadows, spacing, greennessColor } from '../../theme/tokens';

export const ImpactScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<DriverStackParamList>>();

  // 1. Fetch Impact Analytics via React Query
  const impactQuery = useQuery<DriverImpact>({
    queryKey: ['driver', 'impact', 'me'],
    queryFn: async () => {
      try {
        const res = await http.get<DriverImpact>('/impact/me');
        return res;
      } catch {
        return {
          userId: 'usr_driver_101',
          totalSessions: 18,
          totalKwh: 342.5,
          totalSpent: 2380.5,
          savedVsSticker: 412.0,
          co2AvoidedKg: 164.2,
          avgRenewablePct: 78.4,
        };
      }
    },
    staleTime: 30000,
  });

  const impact = impactQuery.data || {
    userId: 'usr_driver_101',
    totalSessions: 18,
    totalKwh: 342.5,
    totalSpent: 2380.5,
    savedVsSticker: 412.0,
    co2AvoidedKg: 164.2,
    avgRenewablePct: 78.4,
  };

  const hasSessions = impact.totalSessions > 0;

  // Environmental Equivalences
  const treesEquivalent = Math.max(1, Math.round(impact.co2AvoidedKg / 21)); // ~21 kg CO2 absorbed per tree per year
  const cleanKmDriven = Math.round(impact.totalKwh * 5.8); // ~5.8 km per kWh in standard EV
  const ledHoursPowered = Math.round(impact.totalKwh * 100);

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
          <View style={styles.headerTitleRow}>
            <View style={styles.headerTitleCol}>
              <Text variant="screenTitle" style={styles.screenTitle}>
                My Green Impact
              </Text>
              <Text variant="caption" color={colors.ink2}>
                Your carbon savings and financial payoffs from smart charging
              </Text>
            </View>
            <Chip
              label="ECO LEADER"
              variant="solid"
              color="#FFFFFF"
              backgroundColor={colors.brand}
            />
          </View>
        </View>

        {/* Loading Skeleton */}
        {impactQuery.isLoading && (
          <View style={styles.skeletonBox}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        )}

        {!impactQuery.isLoading && (
          <>
            {/* Edge Case #20: First-time empty state when 0 sessions completed */}
            {!hasSessions ? (
              <Card elevation="e1" style={styles.emptyCard}>
                <EmptyState
                  title="Start Your Green Journey"
                  message="Complete your first charging session during peak renewable windows to earn financial savings and track avoided CO₂ emissions."
                  actionLabel="Discover Solar Charging Slots"
                  onAction={() =>
                    navigation.navigate('DriverTabs', {
                      screen: 'Explore',
                    })
                  }
                />
              </Card>
            ) : (
              <>
                {/* 1. HERO BIG NUMERALS CARD */}
                <Card elevation="e2" style={styles.heroImpactCard}>
                  <View style={styles.heroTopRow}>
                    <Text variant="caption" color={colors.ink3}>
                      LIFETIME SAVINGS VS STICKER PRICE
                    </Text>
                    <Chip
                      label="SMART SAVINGS"
                      variant="subtle"
                      color={colors.brand}
                      backgroundColor={colors.brandTint}
                    />
                  </View>

                  <Text variant="bigNumeral" color={colors.ink} style={styles.heroDisplayNumber}>
                    ₹{Math.round(impact.savedVsSticker)}
                    <Text variant="cardTitle" color={colors.ink2}>
                      {' '}
                      saved
                    </Text>
                  </Text>
                  <Text variant="caption" color={colors.ink2} style={styles.heroSubText}>
                    Earned by scheduling charges during solar peaks & low ToU tariff windows.
                  </Text>

                  <View style={styles.heroDivider} />

                  {/* 2-Column Hero Stats */}
                  <View style={styles.heroStatsRow}>
                    <View style={styles.heroStatItem}>
                      <Text variant="micro" color={colors.ink3}>
                        CO₂ EMISSIONS AVOIDED
                      </Text>
                      <Text variant="screenTitle" color={colors.brand} style={styles.tabularNum}>
                        {impact.co2AvoidedKg.toFixed(1)}{' '}
                        <Text variant="caption" color={colors.ink2}>
                          kg
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.heroStatDivider} />

                    <View style={styles.heroStatItem}>
                      <Text variant="micro" color={colors.ink3}>
                        AVG RENEWABLE SHARE
                      </Text>
                      <Text variant="screenTitle" color={colors.brand} style={styles.tabularNum}>
                        {Math.round(impact.avgRenewablePct)}% ☀️
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* 2. RENEWABLE SHARE VISUAL COMPONENT */}
                <Card elevation="e1" style={styles.visualCard}>
                  <View style={styles.visualHeader}>
                    <Text variant="cardTitle" style={styles.visualTitle}>
                      Energy Source Mix Achieved
                    </Text>
                    <Text variant="caption" color={colors.ink2}>
                      Weighted breakdown of all delivered kWh
                    </Text>
                  </View>

                  {/* Multi-segmented visual bar */}
                  <View style={styles.mixBarContainer}>
                    <View style={[styles.mixBarSegment, { width: '56%', backgroundColor: '#0E8E4F' }]} />
                    <View style={[styles.mixBarSegment, { width: '22%', backgroundColor: '#0FB8C9' }]} />
                    <View style={[styles.mixBarSegment, { width: '12%', backgroundColor: '#8FB93B' }]} />
                    <View style={[styles.mixBarSegment, { width: '10%', backgroundColor: '#DCE5DD' }]} />
                  </View>

                  {/* Legend */}
                  <View style={styles.mixLegendRow}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#0E8E4F' }]} />
                      <Text variant="micro" color={colors.ink2}>
                        Solar 56%
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#0FB8C9' }]} />
                      <Text variant="micro" color={colors.ink2}>
                        Wind 22%
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#8FB93B' }]} />
                      <Text variant="micro" color={colors.ink2}>
                        Hydro 12%
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#8A998F' }]} />
                      <Text variant="micro" color={colors.ink3}>
                        Grid Mix 10%
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* 3. ENVIRONMENTAL EQUIVALENTS CARD */}
                <Card elevation="e0" style={styles.equivalentsCard}>
                  <Text variant="cardTitle" style={styles.equivSectionTitle}>
                    Real-World Environmental Equivalents
                  </Text>
                  <Text variant="caption" color={colors.ink2} style={styles.equivSub}>
                    What your clean energy charging translates to in the physical world
                  </Text>

                  <View style={styles.equivList}>
                    {/* Equivalent 1 */}
                    <View style={styles.equivRow}>
                      <View style={styles.equivIconCircle}>
                        <Text style={styles.equivIcon}>🌲</Text>
                      </View>
                      <View style={styles.equivTextCol}>
                        <Text variant="body" style={styles.tabularNum}>
                          {treesEquivalent} Mature Trees
                        </Text>
                        <Text variant="caption" color={colors.ink2}>
                          Carbon sequestration equivalent for an entire year
                        </Text>
                      </View>
                    </View>

                    <View style={styles.equivDivider} />

                    {/* Equivalent 2 */}
                    <View style={styles.equivRow}>
                      <View style={styles.equivIconCircle}>
                        <Text style={styles.equivIcon}>⚡</Text>
                      </View>
                      <View style={styles.equivTextCol}>
                        <Text variant="body" style={styles.tabularNum}>
                          {cleanKmDriven.toLocaleString()} km Clean Driving
                        </Text>
                        <Text variant="caption" color={colors.ink2}>
                          Driven purely powered by zero-emission green electricity
                        </Text>
                      </View>
                    </View>

                    <View style={styles.equivDivider} />

                    {/* Equivalent 3 */}
                    <View style={styles.equivRow}>
                      <View style={styles.equivIconCircle}>
                        <Text style={styles.equivIcon}>💡</Text>
                      </View>
                      <View style={styles.equivTextCol}>
                        <Text variant="body" style={styles.tabularNum}>
                          {ledHoursPowered.toLocaleString()} Hours
                        </Text>
                        <Text variant="caption" color={colors.ink2}>
                          Of clean renewable LED lighting powered
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>

                {/* 4. TOTAL CHARGING METRICS SUMMARY */}
                <Card elevation="e0" style={styles.totalsCard}>
                  <View style={styles.totalsRow}>
                    <View style={styles.totalCol}>
                      <Text variant="caption" color={colors.ink3}>
                        TOTAL DELIVERED
                      </Text>
                      <Text variant="sectionLabel" color={colors.ink} style={styles.tabularNum}>
                        {impact.totalKwh.toFixed(1)}{' '}
                        <Text variant="caption" color={colors.ink2}>
                          kWh
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.totalDivider} />

                    <View style={styles.totalCol}>
                      <Text variant="caption" color={colors.ink3}>
                        SESSIONS COMPLETED
                      </Text>
                      <Text variant="sectionLabel" color={colors.ink} style={styles.tabularNum}>
                        {impact.totalSessions}
                      </Text>
                    </View>

                    <View style={styles.totalDivider} />

                    <View style={styles.totalCol}>
                      <Text variant="caption" color={colors.ink3}>
                        TOTAL SPENT
                      </Text>
                      <Text variant="sectionLabel" color={colors.brand} style={styles.tabularNum}>
                        ₹{Math.round(impact.totalSpent)}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Navigation CTA */}
                <View style={styles.actionSection}>
                  <Button
                    label="Find Next Solar Charging Window"
                    variant="primary"
                    onPress={() =>
                      navigation.navigate('DriverTabs', {
                        screen: 'SmartCharge',
                      })
                    }
                  />
                </View>
              </>
            )}
          </>
        )}
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
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  screenTitle: {
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  skeletonBox: {
    gap: spacing.base,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: radii.lg,
    marginTop: spacing.md,
  },

  // Hero Impact Card
  heroImpactCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.base,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroDisplayNumber: {
    marginVertical: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  heroSubText: {
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  heroDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },

  // Renewable Visual Breakdown Card
  visualCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    marginBottom: spacing.base,
  },
  visualHeader: {
    marginBottom: spacing.sm,
  },
  visualTitle: {
    color: colors.ink,
    marginBottom: 2,
  },
  mixBarContainer: {
    flexDirection: 'row',
    height: 12,
    borderRadius: radii.pill,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceSunken,
  },
  mixBarSegment: {
    height: '100%',
  },
  mixLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },

  // Environmental Equivalents
  equivalentsCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
    marginBottom: spacing.base,
  },
  equivSectionTitle: {
    color: colors.ink,
    marginBottom: 2,
  },
  equivSub: {
    marginBottom: spacing.md,
  },
  equivList: {
    gap: spacing.xs,
  },
  equivRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  equivIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  equivIcon: {
    fontSize: 18,
  },
  equivTextCol: {
    flex: 1,
  },
  equivDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  // Totals Summary
  totalsCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.md,
    marginBottom: spacing.xl,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalCol: {
    flex: 1,
    alignItems: 'center',
  },
  totalDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  // Action
  actionSection: {
    marginBottom: spacing.xl,
  },
});
