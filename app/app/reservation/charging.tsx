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
    StyleSheet,
    Text,
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
        // Adding some randomness to make it feel more real
        setEnergyDelivered((prev) => {
          const baseRate = power / 3600; // kWh per second
          const variance = (Math.random() * 0.2 - 0.1) * baseRate; // ±10% variance
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
            // Update charger status to in_use
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
              // Complete the reservation (also updates charger status)
              if (reservationId) {
                await completeReservation(reservationId);
              }

              // Show summary and navigate
              Alert.alert(
                'Charging Complete! ⚡',
                `Session Summary:\n\n` +
                `⏱️ Duration: ${formattedTime}\n` +
                `⚡ Energy: ${energyDelivered.toFixed(2)} kWh\n` +
                `💰 Total Cost: ${formatCurrency(currentCost)}`,
                [
                  {
                    text: 'Done',
                    onPress: () => router.replace('/(tabs)/reservations'),
                  },
                ]
              );
            } catch (error) {
              console.error('Error ending session:', error);
              Alert.alert('Error', 'Failed to end session. Please try again.');
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
});
