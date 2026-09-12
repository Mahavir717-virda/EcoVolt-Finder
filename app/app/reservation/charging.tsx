import { Button, Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useLiveGrid } from '@/hooks/useLiveGrid';
import { greennessColor } from '@/lib/gridData';
import { updateChargerStatus } from '@/services/chargers.service';
import { completeReservation, getReservationById, ReservationWithDetails } from '@/services/reservations.service';
import { formatCurrency } from '@/utils/pricing';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChargingSessionScreen() {
  const {
    reservationId,
    chargerId,
    stationName,
    powerKw,
    pricePerKwh,
  } = useLocalSearchParams<{
    reservationId: string;
    chargerId: string;
    stationName: string;
    powerKw: string;
    pricePerKwh: string;
  }>();
  
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors: themeColors, isDark } = useTheme();
  const { t } = useLanguage();
  
  const [reservation, setReservation] = useState<ReservationWithDetails | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [energyDelivered, setEnergyDelivered] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [showSweetModal, setShowSweetModal] = useState(false);
  const [completedStats, setCompletedStats] = useState<{
    energy: number;
    cost: number;
    co2Avoided: number;
    ecoPoints: number;
    duration: string;
  } | null>(null);

  const { liveGrid, refresh: refreshLiveGrid } = useLiveGrid('IN-WE', reservation?.station?.id || undefined);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Security Check & Real-time Telemetry Polling: Verify reservation status & keep live data fresh
  useEffect(() => {
    let isMounted = true;
    async function verifyReservationSecurity() {
      if (reservationId) {
        try {
          const res = await getReservationById(reservationId);
          if (res && isMounted) {
            setReservation(res);
            if (res.status === 'completed' || res.status === 'cancelled' || res.status === 'expired') {
              Alert.alert(
                t('charging.session_already_ended', 'Session Concluded'),
                t('charging.session_already_ended_desc', 'This charging session has already ended or is no longer active.'),
                [
                  {
                    text: t('common.ok', 'OK'),
                    onPress: () => {
                      router.replace({
                        pathname: '/(tabs)/reservations',
                        params: { tab: 'past', refresh: Date.now().toString() },
                      });
                    },
                  },
                ]
              );
            }
          }
        } catch (e) {
          console.log('[ChargingSecurity] Error checking reservation status:', e);
        }
      }
    }

    verifyReservationSecurity();
    refreshLiveGrid();

    // 5-second real-time polling interval
    const pollInterval = setInterval(() => {
      verifyReservationSecurity();
      refreshLiveGrid();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [reservationId, t, refreshLiveGrid]);

  const power = parseFloat(powerKw || '0');
  const price = parseFloat(pricePerKwh || '0');

  const effectivePower = reservation?.charger?.power_kw || (power > 0 ? power : 50.0);
  const effectivePrice = reservation?.charger?.price_per_kwh || (price > 0 ? price : 13.5);
  const effectiveStationName = reservation?.station?.name || stationName || t('charging.title', 'Charging Session');
  const effectiveGreenPct = liveGrid.renewablePct > 0 
    ? liveGrid.renewablePct 
    : (reservation?.station?.greenness_score || 76);
  const greenColor = greennessColor(effectiveGreenPct);

  // Calculate current cost strictly from effective locked tariff
  const currentCost = useMemo(() => {
    return energyDelivered * effectivePrice;
  }, [energyDelivered, effectivePrice]);

  // Format elapsed time
  const formattedTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // Pulse animation for charging indicator
  useEffect(() => {
    if (sessionStarted) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [sessionStarted, pulseAnim]);

  // Timer and energy simulation
  useEffect(() => {
    if (sessionStarted) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
        // Simulate energy delivery based on real effective charger power (power * time in hours)
        setEnergyDelivered((prev) => {
          const baseRate = Math.max(effectivePower, 7.4) / 3600; // kWh per second
          const variance = (Math.random() * 0.1 - 0.05) * baseRate;
          return prev + baseRate + variance;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionStarted, effectivePower]);

  const handleStartSession = useCallback(() => {
    Alert.alert(
      t('charging.start_alert_title', 'Start Charging'),
      t('charging.start_alert_desc', 'Make sure your vehicle is properly connected to the charger before starting.'),
      [
        { text: t('support.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('charging.start_btn', 'Start Charging'),
          onPress: async () => {
            setSessionStarted(true);
            if (chargerId) {
              await updateChargerStatus(chargerId, 'in_use');
            }
          },
        },
      ]
    );
  }, [chargerId, t]);

  const handleEndSession = useCallback(async () => {
    Alert.alert(
      t('charging.end_alert_title', 'End Charging Session'),
      `${t('charging.end_alert_desc', 'Are you sure you want to end your charging session now?')}\n\n${energyDelivered.toFixed(2)} kWh · ${formatCurrency(currentCost)}`,
      [
        { text: t('charging.continue', 'Continue Charging'), style: 'cancel' },
        {
          text: t('charging.end_btn', 'End Session'),
          style: 'destructive',
          onPress: async () => {
            setIsEnding(true);
            
            try {
              // Complete the reservation on server (persists session, calculates CO2 & clean energy, triggers dynamic sweet notification)
              let stopResult: any = null;
              if (reservationId) {
                stopResult = await completeReservation(reservationId, energyDelivered);
              }

              const finalEnergy = stopResult?.energyKwh ?? energyDelivered;
              const finalCost = stopResult?.cost ?? currentCost;
              const co2 = stopResult?.co2AvoidedKg ?? parseFloat((finalEnergy * 0.72).toFixed(2));
              const pts = Math.max(10, Math.round(co2 * 10 + finalEnergy * 2));

              setCompletedStats({
                energy: finalEnergy,
                cost: finalCost,
                co2Avoided: co2,
                ecoPoints: pts,
                duration: formattedTime,
              });

              setShowSweetModal(true);
            } catch (error) {
              console.error('Error ending session:', error);
              setShowSweetModal(true);
            } finally {
              setIsEnding(false);
            }
          },
        },
      ]
    );
  }, [energyDelivered, currentCost, formattedTime, reservationId, chargerId, t]);

  // Intercept hardware and software back button to prevent re-entering completed charging page
  useEffect(() => {
    const onBackPress = () => {
      if (completedStats !== null || isEnding) {
        router.replace({
          pathname: '/(tabs)/reservations',
          params: { tab: 'past', refresh: Date.now().toString() },
        });
        return true;
      }
      if (sessionStarted) {
        Alert.alert(
          t('charging.in_progress_title', 'Charging in Progress'),
          t('charging.in_progress_desc', 'Your charging session is currently running. Please stop the session before leaving.'),
          [
            { text: t('charging.continue', 'Continue Charging'), style: 'cancel' },
            { text: t('charging.end_btn', 'End Session'), style: 'destructive', onPress: handleEndSession },
          ]
        );
        return true;
      }
      router.replace({
        pathname: '/(tabs)/reservations',
        params: { tab: 'upcoming', refresh: Date.now().toString() },
      });
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [completedStats, isEnding, sessionStarted, handleEndSession, t]);

  const handleHeaderBack = () => {
    if (completedStats !== null || isEnding) {
      router.replace({
        pathname: '/(tabs)/reservations',
        params: { tab: 'past', refresh: Date.now().toString() },
      });
    } else if (sessionStarted) {
      Alert.alert(
        t('charging.in_progress_title', 'Charging in Progress'),
        t('charging.in_progress_desc', 'Your charging session is currently running. Please stop the session before leaving.'),
        [
          { text: t('charging.continue', 'Continue Charging'), style: 'cancel' },
          { text: t('charging.end_btn', 'End Session'), style: 'destructive', onPress: handleEndSession },
        ]
      );
    } else {
      router.replace({
        pathname: '/(tabs)/reservations',
        params: { tab: 'upcoming', refresh: Date.now().toString() },
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={handleHeaderBack} style={styles.headerBackButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>
            {effectiveStationName}
          </Text>
          <Text style={[styles.headerSubtitle, { color: sessionStarted ? '#10B981' : themeColors.textSecondary }]}>
            {sessionStarted ? t('charging.in_progress', '⚡ Active Charging Session') : t('charging.ready', 'Ready to plug in & charge')}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Main Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Charging Animation Dial */}
        <View style={styles.chargingVisual}>
          <Animated.View
            style={[
              styles.outerRing,
              {
                backgroundColor: isDark
                  ? sessionStarted ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.05)'
                  : sessionStarted ? 'rgba(16, 185, 129, 0.12)' : colors.neutral[100],
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View
              style={[
                styles.middleRing,
                {
                  backgroundColor: isDark
                    ? sessionStarted ? 'rgba(16, 185, 129, 0.28)' : 'rgba(255, 255, 255, 0.08)'
                    : sessionStarted ? 'rgba(16, 185, 129, 0.2)' : colors.neutral[200],
                },
              ]}
            >
              <View
                style={[
                  styles.innerRing,
                  {
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    borderColor: sessionStarted ? '#10B981' : isDark ? '#374151' : colors.neutral[300],
                  },
                ]}
              >
                <Ionicons
                  name={sessionStarted ? 'flash' : 'flash-outline'}
                  size={56}
                  color={sessionStarted ? '#10B981' : themeColors.textSecondary}
                />
              </View>
            </View>
          </Animated.View>

          {/* Live Status Pill */}
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: sessionStarted
                  ? isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7'
                  : isDark ? '#374151' : colors.neutral[200],
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: sessionStarted ? '#10B981' : colors.neutral[500] },
              ]}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: sessionStarted ? (isDark ? '#34D399' : '#15803D') : themeColors.textSecondary },
              ]}
            >
              {sessionStarted
                ? t('charging.live_delivering', 'LIVE · FAST POWER DELIVERY')
                : t('charging.plug_ready', 'PLUG IN CONNECTOR TO BEGIN')}
            </Text>
          </View>
        </View>

        {/* 3 Real-time Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={[styles.statIconBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' }]}>
              <Ionicons name="time-outline" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('charging.duration', 'Duration')}</Text>
            <Text style={[styles.statValue, { color: themeColors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
              {formattedTime}
            </Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={[styles.statIconBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7' }]}>
              <Ionicons name="flash-outline" size={20} color="#10B981" />
            </View>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('charging.energy', 'Energy')}</Text>
            <Text style={[styles.statValue, { color: themeColors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
              {energyDelivered.toFixed(2)} <Text style={styles.statUnit}>kWh</Text>
            </Text>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
            <View style={[styles.statIconBadge, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7' }]}>
              <Ionicons name="cash-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>{t('charging.cost', 'Cost')}</Text>
            <Text style={[styles.statValue, { color: themeColors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(currentCost)}
            </Text>
          </Card>
        </View>

        {/* Charger & Clean Grid Specifications */}
        <Card style={[styles.infoCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.infoCardTitle, { color: themeColors.textPrimary }]}>
            {t('charging.specs_title', 'Charger & Grid Specifications')}
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="flash" size={16} color={themeColors.textSecondary} />
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>{t('charging.charger_power', 'Charger Power')}</Text>
            </View>
            <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>
              {effectivePower} kW {effectivePower >= 30 ? 'DC Fast' : 'AC'}
            </Text>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: themeColors.border }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="pricetag-outline" size={16} color={themeColors.textSecondary} />
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>{t('charging.rate', 'Tariff Rate')}</Text>
            </View>
            <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>
              {formatCurrency(effectivePrice)}/kWh
            </Text>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: themeColors.border }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="speedometer-outline" size={16} color={themeColors.textSecondary} />
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>{t('charging.est_range', 'Est. Added Range')}</Text>
            </View>
            <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>
              ~{Math.round(energyDelivered * 6.5)} km
            </Text>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: themeColors.border }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="leaf-outline" size={16} color={greenColor} />
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>{t('charging.clean_grid', 'Clean Energy Grid')}</Text>
            </View>
            <View style={[styles.greenBadge, { backgroundColor: greenColor + '20', borderColor: greenColor + '40', borderWidth: 1 }]}>
              <Text style={[styles.greenBadgeText, { color: greenColor }]}>
                {effectiveGreenPct.toFixed(0)}% {liveGrid.zoneName ? `· ${liveGrid.zoneName}` : 'Renewable'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoDivider, { backgroundColor: themeColors.border }]} />

          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="planet-outline" size={16} color="#10B981" />
              <Text style={[styles.infoLabel, { color: themeColors.textSecondary }]}>{t('charging.co2_avoided', 'CO₂ Avoided')}</Text>
            </View>
            <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '700' }]}>
              {((energyDelivered * 710 * (effectiveGreenPct / 100)) / 1000).toFixed(2)} kg
            </Text>
          </View>
        </Card>

        {/* Safety & Real-time Hint */}
        <View style={[styles.hintCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4', borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7' }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
          <Text style={[styles.hintText, { color: isDark ? '#A7F3D0' : '#166534' }]}>
            {sessionStarted
              ? t('charging.hint_charging', 'Charging is secured. Vehicle connector is locked during session.')
              : t('charging.hint_ready', 'Ensure the connector is firmly plugged into your EV before pressing Start.')}
          </Text>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={[styles.footer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border, paddingBottom: insets.bottom + 12 }]}>
        {!sessionStarted ? (
          <Button
            title={t('charging.start_btn', '⚡ Start Charging Session')}
            variant="primary"
            size="lg"
            onPress={handleStartSession}
            fullWidth
            style={styles.startButton}
          />
        ) : (
          <Button
            title={t('charging.end_btn', '⏹ Stop & End Charging Session')}
            variant="outline"
            size="lg"
            onPress={handleEndSession}
            loading={isEnding}
            fullWidth
            style={styles.endButton}
          />
        )}
      </View>

      {/* Sweet Impact Celebration Modal */}
      <Modal
        visible={showSweetModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSweetModal(false);
          router.replace({
            pathname: '/(tabs)/reservations',
            params: { tab: 'past', refresh: Date.now().toString() }
          });
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sweetModalCard, { backgroundColor: themeColors.surface }]}>
            <View style={[styles.sweetBadge, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#DCFCE7' }]}>
              <Ionicons name="sparkles" size={28} color="#10B981" />
            </View>

            <Text style={[styles.sweetTitle, { color: themeColors.textPrimary }]}>
              {t('charging.complete_title', 'Charging Complete! 🎉')}
            </Text>
            <Text style={[styles.sweetSubtitle, { color: themeColors.textSecondary }]}>
              {t('charging.complete_sub', 'Thank you for driving clean and powering the green revolution with EcoVolt! 🌿⚡')}
            </Text>

            {/* Impact Grid */}
            <View style={styles.impactGrid}>
              <View style={[styles.impactCell, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}>
                <Text style={styles.impactEmoji}>⚡</Text>
                <Text style={[styles.impactValue, { color: themeColors.textPrimary }]}>
                  {completedStats?.energy.toFixed(2)} kWh
                </Text>
                <Text style={[styles.impactLabel, { color: themeColors.textSecondary }]}>
                  {t('charging.delivered', 'Delivered')}
                </Text>
              </View>

              <View style={[styles.impactCell, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}>
                <Text style={styles.impactEmoji}>🌍</Text>
                <Text style={[styles.impactValue, { color: '#16A34A' }]}>
                  {completedStats?.co2Avoided.toFixed(2)} kg
                </Text>
                <Text style={[styles.impactLabel, { color: themeColors.textSecondary }]}>
                  {t('charging.co2_avoided', 'CO₂ Avoided')}
                </Text>
              </View>

              <View style={[styles.impactCell, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}>
                <Text style={styles.impactEmoji}>💰</Text>
                <Text style={[styles.impactValue, { color: themeColors.textPrimary }]}>
                  {formatCurrency(completedStats?.cost || 0)}
                </Text>
                <Text style={[styles.impactLabel, { color: themeColors.textSecondary }]}>
                  {t('charging.total_cost', 'Total Cost')}
                </Text>
              </View>

              <View style={[styles.impactCell, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}>
                <Text style={styles.impactEmoji}>🏆</Text>
                <Text style={[styles.impactValue, { color: '#D97706' }]}>
                  +{completedStats?.ecoPoints} pts
                </Text>
                <Text style={[styles.impactLabel, { color: themeColors.textSecondary }]}>
                  {t('charging.ecopoints', 'EcoPoints')}
                </Text>
              </View>
            </View>

            <View style={[styles.sweetNoteBox, { backgroundColor: isDark ? 'rgba(34, 197, 94, 0.15)' : '#F0FDF4' }]}>
              <Ionicons name="leaf-outline" size={18} color="#10B981" />
              <Text style={[styles.sweetNoteText, { color: isDark ? '#A7F3D0' : '#15803D' }]}>
                {t('charging.receipt_note', 'A session receipt and eco-credit reward have been saved to your account!')}
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtonContainer}>
              <Button
                title="🏆 View Live Leaderboard & Rank"
                variant="primary"
                onPress={() => {
                  setShowSweetModal(false);
                  router.push('/leaderboard');
                }}
                fullWidth
                style={{ marginBottom: 10, backgroundColor: '#059669' }}
              />
              <Button
                title={t('charging.view_reservations', 'View All Reservations')}
                variant="outline"
                onPress={() => {
                  setShowSweetModal(false);
                  router.replace({
                    pathname: '/(tabs)/reservations',
                    params: { tab: 'past', refresh: Date.now().toString() }
                  });
                }}
                fullWidth
                style={{ marginBottom: 10 }}
              />
              <Button
                title={t('charging.go_home', 'Go to Home')}
                variant="ghost"
                onPress={() => {
                  setShowSweetModal(false);
                  router.replace('/(tabs)');
                }}
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBackButton: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  chargingVisual: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  outerRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoDivider: {
    height: 1,
    opacity: 0.6,
  },
  greenBadge: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  greenBadgeText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  startButton: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  endButton: {
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sweetModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  sweetBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  sweetTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  sweetSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    marginTop: 18,
    marginBottom: 14,
  },
  impactCell: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  impactEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  impactValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  impactLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  sweetNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  sweetNoteText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
    fontWeight: '500',
  },
  modalButtonContainer: {
    width: '100%',
  },
});

