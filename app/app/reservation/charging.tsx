import { Button, Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { updateChargerStatus } from '@/services/chargers.service';
import { completeReservation } from '@/services/reservations.service';
import { formatCurrency } from '@/utils/pricing';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Modal,
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

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const power = parseFloat(powerKw || '0');
  const price = parseFloat(pricePerKwh || '0');

  // Calculate current cost
  const currentCost = useMemo(() => {
    return energyDelivered * price;
  }, [energyDelivered, price]);

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
        // Simulate energy delivery (power * time in hours)
        setEnergyDelivered((prev) => {
          const baseRate = Math.max(power, 7.4) / 3600; // kWh per second
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
  }, [sessionStarted, power]);

  const handleStartSession = useCallback(() => {
    Alert.alert(
      'Start Charging',
      'Make sure your vehicle is properly connected to the charger before starting.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Charging',
          onPress: async () => {
            setSessionStarted(true);
            if (chargerId) {
              await updateChargerStatus(chargerId, 'in_use');
            }
          },
        },
      ]
    );
  }, [chargerId]);

  const handleEndSession = useCallback(async () => {
    Alert.alert(
      'End Charging Session',
      `You've charged ${energyDelivered.toFixed(2)} kWh for ${formatCurrency(currentCost)}. End session now?`,
      [
        { text: 'Continue Charging', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            setIsEnding(true);
            
            try {
              // Complete the reservation on server (marks session stopped & triggers dynamic sweet notification)
              if (reservationId) {
                await completeReservation(reservationId, energyDelivered);
              }

              const co2 = parseFloat((energyDelivered * 0.72).toFixed(2));
              const pts = Math.max(10, Math.round(energyDelivered * 15));

              setCompletedStats({
                energy: energyDelivered,
                cost: currentCost,
                co2Avoided: co2,
                ecoPoints: pts,
                duration: formattedTime,
              });

              setShowSweetModal(true);
            } catch (error) {
              console.error('Error ending session:', error);
              Alert.alert('Session Complete', 'Session ended successfully!');
              router.replace('/(tabs)/reservations');
            } finally {
              setIsEnding(false);
            }
          },
        },
      ]
    );
  }, [energyDelivered, currentCost, formattedTime, reservationId, chargerId]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{stationName || 'Charging Session'}</Text>
        {!sessionStarted && (
          <Text style={styles.headerSubtitle}>Ready to charge</Text>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Charging Animation */}
        <View style={styles.chargingVisual}>
          <Animated.View
            style={[
              styles.outerRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: sessionStarted ? 1 : 0.5,
              },
            ]}
          >
            <View style={[styles.innerRing, sessionStarted && styles.innerRingActive]}>
              <Ionicons
                name={sessionStarted ? 'flash' : 'flash-outline'}
                size={64}
                color={sessionStarted ? colors.primary[500] : colors.neutral[400]}
              />
            </View>
          </Animated.View>
          
          {sessionStarted && (
            <Text style={styles.chargingStatus}>Charging in progress...</Text>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Ionicons name="time-outline" size={24} color={colors.primary[500]} />
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{formattedTime}</Text>
          </Card>

          <Card style={styles.statCard}>
            <Ionicons name="flash-outline" size={24} color={colors.success} />
            <Text style={styles.statLabel}>Energy</Text>
            <Text style={styles.statValue}>{energyDelivered.toFixed(2)} kWh</Text>
          </Card>

          <Card style={styles.statCard}>
            <Ionicons name="cash-outline" size={24} color={colors.warning} />
            <Text style={styles.statLabel}>Cost</Text>
            <Text style={styles.statValue}>{formatCurrency(currentCost)}</Text>
          </Card>
        </View>

        {/* Charger Info */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Charger Power</Text>
            <Text style={styles.infoValue}>{power} kW</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rate</Text>
            <Text style={styles.infoValue}>{formatCurrency(price)}/kWh</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Est. Range Added</Text>
            <Text style={styles.infoValue}>~{Math.round(energyDelivered * 5)} km</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🌿 Clean Energy Grid</Text>
            <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '600' }]}>92% Solar/Wind</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🌍 CO₂ Avoided</Text>
            <Text style={[styles.infoValue, { color: '#10B981', fontWeight: '600' }]}>{(energyDelivered * 0.72).toFixed(2)} kg</Text>
          </View>
        </Card>
      </View>

      {/* Action Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {!sessionStarted ? (
          <Button
            title="⚡ Start Charging Session"
            variant="primary"
            size="lg"
            onPress={handleStartSession}
            fullWidth
          />
        ) : (
          <Button
            title="End Charging Session"
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
        animationType="slide"
        onRequestClose={() => {
          setShowSweetModal(false);
          router.replace('/(tabs)/reservations');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sweetModalCard}>
            <View style={styles.sweetBadge}>
              <Ionicons name="sparkles" size={28} color="#16A34A" />
            </View>

            <Text style={styles.sweetTitle}>Charging Complete! 🎉</Text>
            <Text style={styles.sweetSubtitle}>
              Thank you for driving clean and powering the green revolution with EcoVolt! 🌿⚡
            </Text>

            {/* Impact Grid */}
            <View style={styles.impactGrid}>
              <View style={styles.impactCell}>
                <Text style={styles.impactEmoji}>⚡</Text>
                <Text style={styles.impactValue}>{completedStats?.energy.toFixed(2)} kWh</Text>
                <Text style={styles.impactLabel}>Delivered</Text>
              </View>

              <View style={styles.impactCell}>
                <Text style={styles.impactEmoji}>🌍</Text>
                <Text style={[styles.impactValue, { color: '#16A34A' }]}>{completedStats?.co2Avoided.toFixed(2)} kg</Text>
                <Text style={styles.impactLabel}>CO₂ Avoided</Text>
              </View>

              <View style={styles.impactCell}>
                <Text style={styles.impactEmoji}>💰</Text>
                <Text style={styles.impactValue}>{formatCurrency(completedStats?.cost || 0)}</Text>
                <Text style={styles.impactLabel}>Total Cost</Text>
              </View>

              <View style={styles.impactCell}>
                <Text style={styles.impactEmoji}>🏆</Text>
                <Text style={[styles.impactValue, { color: '#D97706' }]}>+{completedStats?.ecoPoints} pts</Text>
                <Text style={styles.impactLabel}>EcoPoints</Text>
              </View>
            </View>

            <View style={styles.sweetNoteBox}>
              <Ionicons name="leaf-outline" size={18} color="#16A34A" />
              <Text style={styles.sweetNoteText}>
                A dynamic session receipt and sweet eco-credit alert have been saved in your notifications!
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtonContainer}>
              <Button
                title="View All Reservations"
                variant="primary"
                onPress={() => {
                  setShowSweetModal(false);
                  router.replace('/(tabs)/reservations');
                }}
                fullWidth
                style={{ marginBottom: 10 }}
              />
              <Button
                title="Go to Home"
                variant="outline"
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
    backgroundColor: colors.neutral[50],
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  chargingVisual: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  outerRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: colors.neutral[300],
  },
  innerRingActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  chargingStatus: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary[600],
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
    marginTop: 4,
  },
  infoCard: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  endButton: {
    borderColor: colors.error[500],
  },
  // Sweet Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sweetModalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sweetBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sweetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[900],
    textAlign: 'center',
  },
  sweetSubtitle: {
    fontSize: 14,
    color: colors.neutral[600],
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    marginTop: 20,
    marginBottom: 16,
  },
  impactCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  impactEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  impactLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 2,
  },
  sweetNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  sweetNoteText: {
    fontSize: 12,
    color: '#15803D',
    flex: 1,
    lineHeight: 16,
  },
  modalButtonContainer: {
    width: '100%',
  },
});
