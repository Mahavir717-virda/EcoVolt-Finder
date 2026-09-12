import { Button, Card } from '@/components/ui';
import { ConnectorIcon, CHARGER_COLORS } from '@/components/ui/ConnectorIcon';
import { CHARGER_TYPES, CONNECTOR_TYPES } from '@/constants/chargerTypes';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useCharger } from '@/hooks/useChargers';
import { useCreateReservation, useStationAvailability } from '@/hooks/useReservations';

import { useVehiclesStore } from '@/src/features/vehicles/vehiclesStore';

import { getDynamicPriceQuote, greennessColor } from '@/lib/gridData';

import {
    addMinutes,
    formatDate,
    formatDuration,
    formatTime,
    generateTimeSlots
} from '@/utils/date';
import { formatCurrency } from '@/utils/pricing';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Duration options in minutes
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

export default function ReserveScreen() {
  const { stationId, chargerId } = useLocalSearchParams<{ 
    stationId: string; 
    chargerId: string;
  }>();
  const insets = useSafeAreaInsets();
  const { profile, user } = useAuth();
  
  // Fetch the actual charger data
  const { charger, loading: chargerLoading, error: chargerError } = useCharger(chargerId || '');
  
  // Use the create reservation hook
  const { create: createReservation, loading: reservationLoading } = useCreateReservation();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  
  const { availability, loading: availabilityLoading } = useStationAvailability(stationId || null, selectedDate);
  
  // Fully reactive synchronized vehicle state
  const vehicles = useVehiclesStore(state => state.vehicles);
  const activeVehicleId = useVehiclesStore(state => state.activeVehicleId);
  const hydrateVehicles = useVehiclesStore(state => state.hydrate);
  
  const [vehicleId, setVehicleId] = useState<string | null>(activeVehicleId);

  // Sync component state when activeVehicleId changes from store
  React.useEffect(() => {
    if (activeVehicleId) {
      setVehicleId(activeVehicleId);
    } else if (vehicles.length > 0 && !vehicleId) {
      setVehicleId(vehicles[0].id);
    }
  }, [activeVehicleId, vehicles]);

  // Load user's vehicles on mount directly via the store so it is in sync
  React.useEffect(() => {
    hydrateVehicles();
  }, [hydrateVehicles, user?.id]);
  
  const chargerType = charger ? CHARGER_TYPES[charger.charger_type] : null;
  const connectorType = charger ? CONNECTOR_TYPES[charger.connector_type] : null;

  const chargerTypeInfo = chargerType || {
    name: charger ? (charger.charger_type === 'dc_fast' ? 'DC Fast Charging' : 'Level 2 AC') : 'EV Charger',
    description: charger ? `${charger.power_kw} kW Charging Point` : 'Charging Point',
    icon: 'flash',
    speed: charger ? `${charger.power_kw} kW` : 'Standard Speed',
    typicalTime: charger && charger.power_kw >= 50 ? '20-60 mins' : '2-6 hrs',
    color: colors.primary[500],
  };
  const connectorTypeInfo = connectorType || {
    name: charger ? (charger.connector_type ? charger.connector_type.toUpperCase().replace('_', ' ') : 'Standard Connector') : 'Connector',
    shortName: charger ? (charger.connector_type ? charger.connector_type.toUpperCase().replace('_', ' ') : 'Connector') : 'Connector',
    icon: 'flash-outline',
    compatibleWith: [],
  };

  const isLoading = chargerLoading || reservationLoading;

  // Generate available time slots
  const timeSlots = useMemo(() => {
    const rawSlots = generateTimeSlots(selectedDate, 15); // 15-minute intervals
    
    if (!availability || !availability.connectors || !charger) return rawSlots.map(time => ({ time, available: true }));
    
    const connectorType = charger.connector_type;
    const connector = availability.connectors.find((c: any) => c.type === connectorType);
    const totalCount = connector?.totalCount || 1;
    
    const totalStationPlugs = availability.connectors.reduce((acc: number, c: any) => acc + c.totalCount, 0);
    const peakCap = Math.max(1, Math.floor(totalStationPlugs * 0.8));

    return rawSlots.map(time => {
      // Parse slot time
      const [timeStr, ampm] = time.split(' ');
      let [hours, minutes] = timeStr.split(':').map(Number);
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      const slotStart = new Date(selectedDate);
      slotStart.setHours(hours, minutes, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + selectedDuration * 60 * 1000);

      const hourLocal = (slotStart.getUTCHours() + 5 + Math.floor((slotStart.getUTCMinutes() + 30) / 60)) % 24;
      const isPeakHour = hourLocal >= 18 && hourLocal <= 22; // 6pm to 10pm IST

      let overlappingForConnector = 0;
      let overlappingForStation = 0;

      availability.bookings.forEach((b: any) => {
        const bStart = new Date(b.windowStart);
        const bEnd = new Date(b.windowEnd);
        
        // Overlap logic: bookingStart < slotEnd AND bookingEnd > slotStart
        if (bStart < slotEnd && bEnd > slotStart) {
          overlappingForStation++;
          if (b.connectorType === connectorType) {
            overlappingForConnector++;
          }
        }
      });

      const isBooked = overlappingForConnector >= totalCount || (isPeakHour && overlappingForStation >= peakCap);
      return { time, available: !isBooked };
    });
  }, [selectedDate, selectedDuration, availability, charger]);

  // Live dynamic price quote — synced with grid green-energy ToU
  const priceQuote = useMemo(() => {
    if (!charger) return null;
    return getDynamicPriceQuote(charger.id, charger.price_per_kwh);
  }, [charger]);

  // Estimated cost using dynamic (green-energy adjusted) price
  const estimatedCost = useMemo(() => {
    if (!charger || !priceQuote) return 0;
    const durationHours = selectedDuration / 60;
    const estimatedKwh = charger.power_kw * durationHours * 0.85; // 85% efficiency
    return priceQuote.finalPrice * estimatedKwh;
  }, [selectedDuration, charger, priceQuote]);

  // Generate next 7 days for date selection
  const dateOptions = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  const handleReserve = async () => {
    if (!selectedTime) {
      Alert.alert('Select Time', 'Please select a start time for your reservation.');
      return;
    }

    if (!stationId || !chargerId || !charger) {
      Alert.alert('Error', 'Station or charger not found. Please try again.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to make a reservation.');
      return;
    }

    if (!vehicleId) {
      Alert.alert(
        'No Vehicle Found',
        'Please add a vehicle to your profile before making a reservation.',
        [{ text: 'Add Vehicle', onPress: () => router.push('/vehicles') }, { text: 'Cancel' }]
      );
      return;
    }

    try {
      // Parse selected time (robust for "14:30" or "02:30 PM")
      const [timePart, ampm] = selectedTime.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = addMinutes(startTime, selectedDuration);

      // Create the reservation — passes real stationId, connectorType, vehicleId
      const reservation = await createReservation(
        stationId,
        charger.connector_type,
        vehicleId,
        startTime,
        endTime
      );

      if (reservation && reservation.id) {
        // Dynamic Redirection: Navigate to Home page and notify user
        router.replace('/(tabs)');
      } else {
        Alert.alert('Reservation Failed', 'The time slot may already be taken or the charger is unavailable. Please try a different time.');
      }
    } catch (error: any) {
      console.error('Reservation error:', error);
      Alert.alert('Error', error.message || 'Failed to create reservation. Please try again.');
    }
  };

  const formatDateLabel = (date: Date, index: number): string => {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Show loading state while fetching charger
  if (chargerLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reserve Charger</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading charger details...</Text>
        </View>
      </View>
    );
  }

  // Show error state if charger not found
  if (chargerError || !charger) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reserve Charger</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error[500]} />
          <Text style={styles.errorText}>Charger not found</Text>
          <Text style={styles.errorSubtext}>Please go back and try again</Text>
          <Button 
            title="Go Back"
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reserve Charger</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Charger Info Card */}
        <Card style={styles.chargerCard}>
          <View style={styles.chargerInfo}>
            {/* Custom SVG connector icon */}
            <View style={[styles.chargerIconWrap, { backgroundColor: (CHARGER_COLORS[charger.charger_type] ?? colors.primary[500]) + '18' }]}>
              <ConnectorIcon
                chargerType={charger.charger_type}
                connectorType={charger.connector_type}
                size={48}
              />
            </View>
            <View style={styles.chargerDetails}>
              <Text style={styles.chargerType}>
                {chargerTypeInfo.name} · {connectorTypeInfo.name}
              </Text>
              <View style={styles.chargerStats}>
                <Text style={styles.statText}>⚡ {charger.power_kw} kW</Text>
                <Text style={styles.statDivider}>•</Text>
                <Text style={styles.statText}>₹{charger.price_per_kwh.toFixed(2)}/kWh base</Text>
              </View>
            </View>
          </View>
          {/* Green pricing strip */}
          {priceQuote && (
            <View style={styles.greenStrip}>
              <View style={[styles.greenDot, { backgroundColor: greennessColor(priceQuote.finalPrice < charger.price_per_kwh ? 70 : 40) }]} />
              <Text style={styles.greenStripText}>
                {priceQuote.touAdjustment < 0
                  ? `🌿 Green discount active — save ₹${Math.abs(priceQuote.touAdjustment).toFixed(2)}/kWh`
                  : priceQuote.touAdjustment > 0
                  ? `⚡ Peak hour — +₹${priceQuote.touAdjustment.toFixed(2)}/kWh surcharge`
                  : '✓ Standard rate — no ToU adjustment'}
              </Text>
              <Text style={styles.greenFinalRate}>₹{priceQuote.finalPrice.toFixed(2)}/kWh</Text>
            </View>
          )}
        </Card>

        {/* Vehicle Selection */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Select Vehicle</Text>
            {vehicles.length === 0 && (
              <TouchableOpacity onPress={() => router.push('/vehicles')}>
                <Text style={{ color: colors.primary[600], fontWeight: '600' }}>+ Add Vehicle</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {vehicles.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {vehicles.map((v) => {
                const isSelected = vehicleId === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.durationItem, isSelected && styles.durationItemSelected]}
                    onPress={() => setVehicleId(v.id)}
                  >
                    <Text style={[styles.durationText, isSelected && styles.durationTextSelected]}>
                      {v.model || 'Unknown EV'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={{ padding: 16, backgroundColor: colors.neutral[100], borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: colors.neutral[600] }}>No vehicles found in your garage.</Text>
            </View>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
          >
            {dateOptions.map((date, index) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[styles.dateItem, isSelected && styles.dateItemSelected]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[styles.dateDay, isSelected && styles.dateDaySelected]}>
                    {date.getDate()}
                  </Text>
                  <Text style={[styles.dateLabel, isSelected && styles.dateLabelSelected]}>
                    {formatDateLabel(date, index)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Start Time</Text>
          <View style={styles.timeGrid}>
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;
              const isAvailable = slot.available;
              
              return (
                <TouchableOpacity
                  key={slot.time}
                  disabled={!isAvailable}
                  style={[
                    styles.timeSlot, 
                    isSelected && styles.timeSlotSelected,
                    !isAvailable && styles.timeSlotDisabled,
                  ]}
                  onPress={() => isAvailable && setSelectedTime(slot.time)}
                >
                  <Text style={[
                    styles.timeText, 
                    isSelected && styles.timeTextSelected,
                    !isAvailable && styles.timeTextDisabled,
                  ]}>
                    {slot.time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((duration) => {
              const isSelected = selectedDuration === duration;
              return (
                <TouchableOpacity
                  key={duration}
                  style={[styles.durationItem, isSelected && styles.durationItemSelected]}
                  onPress={() => setSelectedDuration(duration)}
                >
                  <Text style={[styles.durationText, isSelected && styles.durationTextSelected]}>
                    {formatDuration(duration)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Reservation Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date</Text>
            <Text style={styles.summaryValue}>{formatDate(selectedDate)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time</Text>
            <Text style={styles.summaryValue}>
              {selectedTime ? `${selectedTime} - ${addMinutes(
                (() => {
                  const [h, m] = (selectedTime || '00:00').split(':').map(Number);
                  const d = new Date(selectedDate);
                  d.setHours(h, m);
                  return d;
                })(),
                selectedDuration
              ).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'Not selected'}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{formatDuration(selectedDuration)}</Text>
          </View>

          {/* Pricing breakdown */}
          {priceQuote && (
            <>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base rate</Text>
                <Text style={styles.summaryValue}>₹{priceQuote.baseTariff.toFixed(2)}/kWh</Text>
              </View>
              {priceQuote.touAdjustment !== 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: priceQuote.touAdjustment < 0 ? '#16A34A' : '#EA580C' }]}>
                    {priceQuote.touAdjustment < 0 ? '🌿 Green discount' : '⚡ Peak surcharge'}
                  </Text>
                  <Text style={[styles.summaryValue, { color: priceQuote.touAdjustment < 0 ? '#16A34A' : '#EA580C' }]}>
                    {priceQuote.touAdjustment < 0 ? '−' : '+'}₹{Math.abs(priceQuote.touAdjustment).toFixed(2)}/kWh
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Effective rate</Text>
                <Text style={[styles.summaryValue, { fontWeight: '700' }]}>₹{priceQuote.finalPrice.toFixed(2)}/kWh</Text>
              </View>
            </>
          )}
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.costLabel}>Estimated Cost</Text>
            <Text style={styles.costValue}>{formatCurrency(estimatedCost)}</Text>
          </View>
          
          <Text style={styles.costNote}>
            * Based on {charger.power_kw} kW × {selectedDuration} min at 85% efficiency
          </Text>
        </Card>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Reserve Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          variant="primary"
          size="lg"
          loading={isLoading}
          disabled={!selectedTime}
          onPress={handleReserve}
          title="Confirm Reservation"
          fullWidth
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  chargerCard: {
    margin: 16,
  },
  chargerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  chargerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  greenStripText: {
    flex: 1,
    fontSize: 12,
    color: colors.neutral[600],
    fontWeight: '500',
  },
  greenFinalRate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  chargerDetails: {
    flex: 1,
  },
  chargerType: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  connectorType: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  chargerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statText: {
    fontSize: 13,
    color: colors.primary[600],
    fontWeight: '500',
  },
  statDivider: {
    color: colors.neutral[400],
    marginHorizontal: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 12,
  },
  dateList: {
    gap: 12,
  },
  dateItem: {
    width: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  dateItemSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  dateDaySelected: {
    color: colors.white,
  },
  dateLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    marginTop: 4,
    textAlign: 'center',
  },
  dateLabelSelected: {
    color: colors.white,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  timeSlotSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  timeSlotDisabled: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.neutral[200],
    opacity: 0.6,
  },
  timeText: {
    fontSize: 14,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  timeTextSelected: {
    color: colors.white,
  },
  timeTextDisabled: {
    color: colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  durationItem: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  durationItemSelected: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  durationText: {
    fontSize: 14,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  durationTextSelected: {
    color: colors.white,
  },
  summaryCard: {
    margin: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[800],
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: 12,
  },
  costLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  costValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary[600],
  },
  costNote: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    color: colors.neutral[600],
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
    textAlign: 'center',
  },
});
