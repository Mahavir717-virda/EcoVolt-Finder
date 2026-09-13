import { Button, Card, ReserveChargerSkeleton } from '@/components/ui';
import { ConnectorIcon, CHARGER_COLORS } from '@/components/ui/ConnectorIcon';
import { CHARGER_TYPES, CONNECTOR_TYPES } from '@/constants/chargerTypes';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useCharger } from '@/hooks/useChargers';
import { useCreateReservation, useStationAvailability } from '@/hooks/useReservations';
import { triggerDeviceNotification } from '@/services/notifications.service';

import { useVehiclesStore } from '@/src/features/vehicles/vehiclesStore';
import { normalizeConnectorType } from '@/utils/chargerMatcher';

import { getDynamicPriceQuote, greennessColor } from '@/lib/gridData';

import {
    addMinutes,
    formatDate,
    formatDuration,
    formatTime,
    generateTimeSlots,
    parseTimeString
} from '@/utils/date';
import { formatCurrency } from '@/utils/pricing';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  const { colors: themeColors, isDark } = useTheme();
  const { t } = useLanguage();
  
  // Fetch the actual charger data
  const { charger, loading: chargerLoading, error: chargerError, refresh: refreshCharger } = useCharger(chargerId || '');
  
  // Use the create reservation hook
  const { create: createReservation, loading: reservationLoading } = useCreateReservation();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  
  const { availability, loading: availabilityLoading, refresh: refreshAvailability } = useStationAvailability(stationId || null, selectedDate);
  
  // Refetch live availability and charger status whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshAvailability();
      refreshCharger();
    }, [refreshAvailability, refreshCharger])
  );

  // Fully reactive synchronized vehicle state
  const vehicles = useVehiclesStore(state => state.vehicles);
  const activeVehicleId = useVehiclesStore(state => state.activeVehicleId);
  const hydrateVehicles = useVehiclesStore(state => state.hydrate);
  
  const [vehicleId, setVehicleId] = useState<string | null>(activeVehicleId || (vehicles[0]?.id ?? null));

  // Sync component state when activeVehicleId changes from store
  useEffect(() => {
    if (activeVehicleId) {
      setVehicleId(activeVehicleId);
    } else if (vehicles.length > 0 && !vehicleId) {
      setVehicleId(vehicles[0].id);
    }
  }, [activeVehicleId, vehicles.length, vehicleId]);

  // Load user's vehicles on mount directly via the store so it is in sync
  useEffect(() => {
    hydrateVehicles();
  }, [user?.id]);
  
  const chargerType = charger ? CHARGER_TYPES[charger.charger_type] : null;
  const connectorType = charger ? CONNECTOR_TYPES[charger.connector_type] : null;

  const chargerTypeInfo = chargerType || {
    name: charger ? (charger.charger_type === 'dc_fast' ? t('reserve.type_dc_fast', 'DC Fast Charging') : t('reserve.type_level_2', 'Level 2 AC')) : 'EV Charger',
    description: charger ? `${charger.power_kw} kW Charging Point` : 'Charging Point',
    icon: 'flash',
    speed: charger ? `${charger.power_kw} kW` : 'Standard Speed',
    typicalTime: charger && charger.power_kw >= 50 ? '20-60 mins' : '2-6 hrs',
    color: themeColors.primary,
  };
  const connectorTypeInfo = connectorType || {
    name: charger ? (charger.connector_type ? charger.connector_type.toUpperCase().replace('_', ' ') : 'Standard Connector') : 'Connector',
    shortName: charger ? (charger.connector_type ? charger.connector_type.toUpperCase().replace('_', ' ') : 'Connector') : 'Connector',
    icon: 'flash-outline',
    compatibleWith: [],
  };

  const isLoading = chargerLoading || reservationLoading;

  // Generate available time slots with authoritative overlap verification
  const timeSlots = useMemo(() => {
    // Generate all 15-minute slots for the day (06:00 to 23:00)
    const rawSlots = generateTimeSlots(selectedDate, 15, 6, 23, true);
    const now = new Date();
    const isToday = selectedDate.toDateString() === now.toDateString();

    const normalizedTargetType = normalizeConnectorType(charger?.connector_type);
    
    // Count total active (non-maintenance) plugs matching this connector
    let totalPlugsForConnector = 1;
    let totalStationPlugs = 1;
    let peakCap = 1;

    if (availability?.connectors && availability.connectors.length > 0) {
      const matchingConnectors = availability.connectors.filter((c: any) =>
        (charger?.id && c.id === charger.id) ||
        normalizeConnectorType(c.type) === normalizedTargetType
      );
      
      const activeMatching = matchingConnectors.filter((c: any) =>
        c.status !== 'maintenance' && c.status !== 'offline' && c.status !== 'MAINTENANCE' && c.status !== 'OFFLINE'
      );
      
      totalPlugsForConnector = activeMatching.reduce((sum: number, c: any) => sum + (c.totalCount || 1), 0);
      if (totalPlugsForConnector < 1 && matchingConnectors.length > 0) {
        // All matching connectors are maintenance or offline
        totalPlugsForConnector = 0;
      } else if (totalPlugsForConnector < 1) {
        totalPlugsForConnector = 1;
      }

      const activeAll = availability.connectors.filter((c: any) =>
        c.status !== 'maintenance' && c.status !== 'offline' && c.status !== 'MAINTENANCE' && c.status !== 'OFFLINE'
      );
      totalStationPlugs = activeAll.reduce((sum: number, c: any) => sum + (c.totalCount || 1), 0) || 1;
      peakCap = Math.max(1, Math.floor(totalStationPlugs * 0.8));
    }

    const activeBookings = (availability?.bookings || []).filter((b: any) =>
      b.status !== 'cancelled' && b.status !== 'CANCELLED' &&
      b.status !== 'completed' && b.status !== 'COMPLETED' &&
      b.status !== 'expired' && b.status !== 'EXPIRED'
    );

    return rawSlots.map(time => {
      const slotStart = parseTimeString(selectedDate, time);
      const slotEnd = new Date(slotStart.getTime() + selectedDuration * 60 * 1000);

      // 1. Check if past for today
      if (isToday && slotStart.getTime() < now.getTime() - 2 * 60 * 1000) {
        return {
          time,
          available: false,
          reason: 'past' as const,
        };
      }

      // 2. Check if connector is unavailable due to maintenance
      if (totalPlugsForConnector === 0) {
        return {
          time,
          available: false,
          reason: 'maintenance' as const,
        };
      }

      const hourLocal = (slotStart.getUTCHours() + 5 + Math.floor((slotStart.getUTCMinutes() + 30) / 60)) % 24;
      const isPeakHour = hourLocal >= 18 && hourLocal <= 22; // 6pm to 10pm IST

      let overlappingForConnector = 0;
      let overlappingForStation = 0;

      activeBookings.forEach((b: any) => {
        const bStart = new Date(b.windowStart);
        const bEnd = new Date(b.windowEnd);

        // Strict interval overlap formula: bStart < slotEnd AND bEnd > slotStart
        if (bStart < slotEnd && bEnd > slotStart) {
          overlappingForStation++;
          const isSamePlug = Boolean(charger?.id && b.connectorId === charger.id);
          const isSameType = normalizeConnectorType(b.connectorType) === normalizedTargetType;
          if (isSamePlug || isSameType) {
            overlappingForConnector++;
          }
        }
      });

      const isBooked = overlappingForConnector >= totalPlugsForConnector;
      const isThrottled = isPeakHour && overlappingForStation >= peakCap;

      if (isBooked) {
        return {
          time,
          available: false,
          reason: 'allocated' as const,
        };
      }

      if (isThrottled) {
        return {
          time,
          available: false,
          reason: 'throttled' as const,
        };
      }

      return {
        time,
        available: true,
        reason: 'available' as const,
      };
    });
  }, [selectedDate, selectedDuration, availability, charger]);

  // Auto-reset selectedTime if it becomes unavailable
  useEffect(() => {
    if (selectedTime) {
      const match = timeSlots.find(s => s.time === selectedTime);
      if (match && !match.available) {
        setSelectedTime(null);
      }
    }
  }, [timeSlots, selectedTime]);

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
      Alert.alert(t('reserve.select_time', 'Select Time'), t('reserve.select_time_alert', 'Please select a start time for your reservation.'));
      return;
    }

    if (!stationId || !chargerId || !charger) {
      Alert.alert('Error', t('reserve.charger_not_found', 'Charger not found'));
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'Please sign in to make a reservation.');
      return;
    }

    if (!vehicleId) {
      Alert.alert(
        t('account.no_vehicles', 'No Vehicle Found'),
        t('reserve.no_vehicle_alert', 'Please add a vehicle to your profile before making a reservation.'),
        [{ text: t('reserve.add_vehicle', 'Add Vehicle'), onPress: () => router.push('/vehicles') }, { text: t('support.cancel', 'Cancel') }]
      );
      return;
    }

    try {
      const startTime = parseTimeString(selectedDate, selectedTime);
      const [timePart, ampm] = selectedTime.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      const endTime = addMinutes(startTime, selectedDuration);

      const reservation = await createReservation(
        stationId,
        charger.connector_type,
        vehicleId,
        startTime,
        endTime
      );

      if (reservation && reservation.id) {
        triggerDeviceNotification({
          title: '⚡ Booking Confirmed!',
          body: `Your charging slot is locked for ${formatDate(selectedDate)} at ${selectedTime}. Tap to view your pass!`,
          data: { bookingId: reservation.id, stationId },
        }).catch(() => {});

        Alert.alert(
          '⚡ Reservation Confirmed!',
          `Your slot is locked for ${formatDate(selectedDate)} at ${selectedTime}.`,
          [
            {
              text: 'View Bookings',
              onPress: () => router.replace('/(tabs)/reservations'),
            },
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)'),
      if (reservation) {
        Alert.alert(
          t('reserve.success_title', 'Reservation Confirmed!'),
          t('reserve.success_message', 'Your charging slot has been reserved successfully.'),
          [
            {
              text: t('common.ok', 'OK'),
              onPress: () => {
                router.replace({
                  pathname: '/(tabs)/reservations',
                  params: { tab: 'active', refresh: Date.now().toString() },
                });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Reservation error:', error);
      // Immediately refresh live availability to reflect new bookings / conflicts
      refreshAvailability();
      Alert.alert(
        'Reservation Failed',
        error?.message || 'The selected time slot is no longer available. Please choose another time.'
      );
      console.error('[ReserveScreen] Reservation creation error:', error);
      Alert.alert('Reservation Failed', error?.message || 'Could not reserve slot. Please try again.');
    }
  };

  const formatDateLabel = (date: Date, index: number): string => {
    if (index === 0) return t('reservations.today', 'Today');
    if (index === 1) return t('reservations.tomorrow', 'Tomorrow');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Show loading state while fetching charger
  if (chargerLoading && !charger) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('reserve.title', 'Reserve Charger')}</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <ReserveChargerSkeleton />
        </ScrollView>
      </View>
    );
  }

  // Show error state if charger not found
  if (chargerError || !charger) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={themeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('reserve.title', 'Reserve Charger')}</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color={themeColors.error} />
          <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>{t('reserve.charger_not_found', 'Charger not found')}</Text>
          <Text style={[styles.errorSubtext, { color: themeColors.textSecondary }]}>{t('reserve.error_subtext', 'Please go back and try again')}</Text>
          <Button 
            title={t('station.go_back', 'Go Back')}
            onPress={() => router.back()}
            style={{ marginTop: 16 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('reserve.title', 'Reserve Charger')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Charger Info Card */}
        <Card style={[styles.chargerCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.chargerInfo}>
            {/* Custom SVG connector icon */}
            <View style={[styles.chargerIconWrap, { backgroundColor: (CHARGER_COLORS[charger.charger_type] ?? themeColors.primary) + '18' }]}>
              <ConnectorIcon
                chargerType={charger.charger_type}
                connectorType={charger.connector_type}
                size={48}
              />
            </View>
            <View style={styles.chargerDetails}>
              <Text style={[styles.chargerType, { color: themeColors.textPrimary }]}>
                {chargerTypeInfo.name} · {connectorTypeInfo.name}
              </Text>
              <View style={styles.chargerStats}>
                <Text style={[styles.statText, { color: themeColors.primary }]}>⚡ {charger.power_kw} kW</Text>
                <Text style={[styles.statDivider, { color: themeColors.textSecondary }]}>•</Text>
                <Text style={[styles.statText, { color: themeColors.primary }]}>₹{charger.price_per_kwh.toFixed(2)}/kWh {t('reserve.base_rate', 'base')}</Text>
              </View>
            </View>
          </View>
          {/* Green pricing strip */}
          {priceQuote && (
            <View style={[styles.greenStrip, { borderTopColor: themeColors.border }]}>
              <View style={[styles.greenDot, { backgroundColor: greennessColor(priceQuote.finalPrice < charger.price_per_kwh ? 70 : 40) }]} />
              <Text style={[styles.greenStripText, { color: themeColors.textSecondary }]}>
                {priceQuote.touAdjustment < 0
                  ? `${t('reserve.green_active', '🌿 Green discount active — save')} ₹${Math.abs(priceQuote.touAdjustment).toFixed(2)}/kWh`
                  : priceQuote.touAdjustment > 0
                  ? `${t('reserve.peak_active', '⚡ Peak hour — surcharge')} +₹${priceQuote.touAdjustment.toFixed(2)}/kWh`
                  : t('reserve.standard_rate', '✓ Standard rate — no ToU adjustment')}
              </Text>
              <Text style={[styles.greenFinalRate, { color: themeColors.textPrimary }]}>₹{priceQuote.finalPrice.toFixed(2)}/kWh</Text>
            </View>
          )}
        </Card>

        {/* Vehicle Selection */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0, color: themeColors.textPrimary }]}>{t('reserve.select_vehicle', 'Select Vehicle')}</Text>
            {vehicles.length === 0 && (
              <TouchableOpacity onPress={() => router.push('/vehicles')}>
                <Text style={{ color: themeColors.primary, fontWeight: '600' }}>{t('reserve.add_vehicle', '+ Add Vehicle')}</Text>
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
                    style={[styles.durationItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }, isSelected && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }]}
                    onPress={() => setVehicleId(v.id)}
                  >
                    <Text style={[styles.durationText, { color: themeColors.textPrimary }, isSelected && { color: colors.white }]}>
                      {v.model || 'Unknown EV'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={{ padding: 16, backgroundColor: isDark ? '#1F2937' : colors.neutral[100], borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: themeColors.textSecondary }}>{t('reserve.no_vehicles', 'No vehicles found in your garage.')}</Text>
            </View>
          )}
        </View>

        {/* Date Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{t('reserve.select_date', 'Select Date')}</Text>
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
                  style={[styles.dateItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }, isSelected && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text style={[styles.dateDay, { color: themeColors.textPrimary }, isSelected && { color: colors.white }]}>
                    {date.getDate()}
                  </Text>
                  <Text style={[styles.dateLabel, { color: themeColors.textSecondary }, isSelected && { color: colors.white }]}>
                    {formatDateLabel(date, index)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Time Selection */}
        <View style={styles.section}>
          <View style={styles.timeSectionHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0, color: themeColors.textPrimary }]}>
              {t('reserve.select_time', 'Select Start Time')}
            </Text>
            {availabilityLoading && (
              <ActivityIndicator size="small" color={themeColors.primary} />
            )}
          </View>

          {/* Availability Legend */}
          <View style={[styles.legendContainer, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: themeColors.border }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: themeColors.primary }]} />
              <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981', borderColor: '#059669', borderWidth: 1 }]} />
              <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Allocated / Booked</Text>
            </View>
          </View>

          <View style={styles.timeGrid}>
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time;
              const isAvailable = slot.available;
              const isAllocated = slot.reason === 'allocated' || slot.reason === 'throttled';
              const isPastSlot = slot.reason === 'past';
              const isMaintenance = slot.reason === 'maintenance';

              return (
                <TouchableOpacity
                  key={slot.time}
                  disabled={!isAvailable}
                  activeOpacity={0.7}
                  style={[
                    styles.timeSlot,
                    { backgroundColor: themeColors.surface, borderColor: themeColors.border },
                    isSelected && { backgroundColor: themeColors.primary, borderColor: themeColors.primary },
                    isAllocated && {
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
                      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
                    },
                    isPastSlot && {
                      backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                      borderColor: isDark ? '#374151' : '#E5E7EB',
                      opacity: 0.6,
                    },
                    isMaintenance && {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
                      borderColor: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
                    },
                  ]}
                  onPress={() => isAvailable && setSelectedTime(slot.time)}
                >
                  <View style={styles.timeSlotInner}>
                    <Text
                      style={[
                        styles.timeText,
                        { color: themeColors.textPrimary },
                        isSelected && { color: colors.white, fontWeight: '700' },
                        isAllocated && {
                          color: isDark ? '#FCA5A5' : '#DC2626',
                          textDecorationLine: 'line-through',
                          fontWeight: '600',
                        },
                        isPastSlot && {
                          color: isDark ? '#9CA3AF' : '#9CA3AF',
                          textDecorationLine: 'line-through',
                        },
                        isMaintenance && {
                          color: '#D97706',
                          textDecorationLine: 'line-through',
                        },
                      ]}
                    >
                      {slot.time}
                    </Text>
                    {isAllocated && (
                      <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FEE2E2' }]}>
                        <Text style={[styles.statusBadgeText, { color: isDark ? '#FCA5A5' : '#B91C1C' }]}>
                          Allocated
                        </Text>
                      </View>
                    )}
                    {isPastSlot && (
                      <View style={[styles.statusBadge, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]}>
                        <Text style={[styles.statusBadgeText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                          Passed
                        </Text>
                      </View>
                    )}
                    {isSelected && (
                      <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]}>
                        <Text style={[styles.statusBadgeText, { color: colors.white, fontWeight: '700' }]}>
                          ✓ Selected
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Duration Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>{t('reserve.duration', 'Duration')}</Text>
          <View style={styles.durationGrid}>
            {DURATION_OPTIONS.map((duration) => {
              const isSelected = selectedDuration === duration;
              return (
                <TouchableOpacity
                  key={duration}
                  style={[styles.durationItem, { backgroundColor: themeColors.surface, borderColor: themeColors.border }, isSelected && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }]}
                  onPress={() => setSelectedDuration(duration)}
                >
                  <Text style={[styles.durationText, { color: themeColors.textPrimary }, isSelected && { color: colors.white }]}>
                    {duration} {t('reserve.mins', 'mins')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Summary */}
        <Card style={[styles.summaryCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.summaryTitle, { color: themeColors.textPrimary }]}>{t('reserve.summary_title', 'Reservation Summary')}</Text>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>{t('reserve.date', 'Date')}</Text>
            <Text style={[styles.summaryValue, { color: themeColors.textPrimary }]}>{formatDate(selectedDate)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>{t('reserve.time', 'Time')}</Text>
            <Text style={[styles.summaryValue, { color: themeColors.textPrimary }]}>
              {selectedTime ? `${selectedTime} - ${formatTime(addMinutes(
                parseTimeString(selectedDate, selectedTime),
                selectedDuration
              ))}` : t('reserve.not_selected', 'Not selected')}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>{t('reserve.duration_label', 'Duration')}</Text>
            <Text style={[styles.summaryValue, { color: themeColors.textPrimary }]}>{selectedDuration} {t('reserve.mins', 'mins')}</Text>
          </View>

          {/* Pricing breakdown */}
          {priceQuote && (
            <>
              <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>{t('reserve.base_rate', 'Base rate')}</Text>
                <Text style={[styles.summaryValue, { color: themeColors.textPrimary }]}>₹{priceQuote.baseTariff.toFixed(2)}/kWh</Text>
              </View>
              {priceQuote.touAdjustment !== 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: priceQuote.touAdjustment < 0 ? '#16A34A' : '#EA580C' }]}>
                    {priceQuote.touAdjustment < 0 ? t('reserve.green_discount', '🌿 Green discount') : t('reserve.peak_surcharge_label', '⚡ Peak surcharge')}
                  </Text>
                  <Text style={[styles.summaryValue, { color: priceQuote.touAdjustment < 0 ? '#16A34A' : '#EA580C' }]}>
                    {priceQuote.touAdjustment < 0 ? '−' : '+'}₹{Math.abs(priceQuote.touAdjustment).toFixed(2)}/kWh
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>{t('reserve.effective_rate', 'Effective rate')}</Text>
                <Text style={[styles.summaryValue, { fontWeight: '700', color: themeColors.textPrimary }]}>₹{priceQuote.finalPrice.toFixed(2)}/kWh</Text>
              </View>
            </>
          )}
          
          <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
          
          <View style={styles.summaryRow}>
            <Text style={[styles.costLabel, { color: themeColors.textPrimary }]}>{t('reserve.estimated_cost', 'Estimated Cost')}</Text>
            <Text style={[styles.costValue, { color: themeColors.primary }]}>{formatCurrency(estimatedCost)}</Text>
          </View>
          
          <Text style={[styles.costNote, { color: themeColors.textSecondary }]}>
            * {t('reserve.cost_note', 'Based on full duration at 85% charging efficiency')}
          </Text>
        </Card>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Reserve Button */}
      <View style={[styles.footer, { backgroundColor: themeColors.surface, borderTopColor: themeColors.border, paddingBottom: insets.bottom + 16 }]}>
        <Button
          variant="primary"
          size="lg"
          loading={isLoading}
          disabled={!selectedTime}
          onPress={handleReserve}
          title={t('reserve.confirm_btn', 'Confirm Reservation')}
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
  timeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotInner: {
    alignItems: 'center',
    justifyContent: 'center',
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
  statusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
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
