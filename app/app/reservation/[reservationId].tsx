import { Button, Card } from '@/components/ui';
import { CHARGER_TYPES, CONNECTOR_TYPES } from '@/constants/chargerTypes';
import { colors } from '@/constants/colors';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { usePlacePhotos } from '@/hooks/usePlacePhotos';
import { useCancelReservation, useReservation } from '@/hooks/useReservations';
import { triggerBookingReminder } from '@/services/reservations.service';
import { ChargerType, ConnectorType } from '@/types/database.types';
import { formatDate, formatDuration, formatTime } from '@/utils/date';
import { formatCurrency } from '@/utils/pricing';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = 200;

export default function ReservationDetailScreen() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();
  const insets = useSafeAreaInsets();
  const { colors: themeColors, isDark } = useTheme();
  const { t } = useLanguage();
  const { reservation, loading, error, refresh } = useReservation(reservationId || '');
  const { cancel, loading: cancelling } = useCancelReservation();
  
  // Photo gallery state
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);

  // Extract nested data
  const charger = (reservation as any)?.charger;
  const station = (reservation as any)?.station || charger?.station;

  // Fetch Google Places photos
  const { photos, loading: photosLoading } = usePlacePhotos(
    station?.latitude,
    station?.longitude,
    station?.name,
    station?.image_url
  );

  const chargerTypeKey = charger?.charger_type as ChargerType | undefined;
  const connectorTypeKey = charger?.connector_type as ConnectorType | undefined;
  const chargerType = chargerTypeKey ? CHARGER_TYPES[chargerTypeKey] : null;
  const connectorType = connectorTypeKey ? CONNECTOR_TYPES[connectorTypeKey] : null;

  // Get duration from reservation (with type assertion)
  const reservationData = reservation as any;
  const durationMinutes =
    reservationData?.duration_minutes ||
    (reservation?.start_time && reservation?.end_time
      ? Math.max(15, Math.round((new Date(reservation.end_time).getTime() - new Date(reservation.start_time).getTime()) / 60000))
      : 60);
  
  // Calculate estimated cost: power_kw * hours * price_per_kwh
  // If not stored in DB, calculate from charger data
  const storedEstimatedCost = reservationData?.estimated_cost || reservationData?.total_price;
  const calculatedCost = charger?.power_kw && charger?.price_per_kwh && durationMinutes
    ? (charger.power_kw * (durationMinutes / 60) * charger.price_per_kwh)
    : 0;
  const estimatedCost = storedEstimatedCost || calculatedCost;

  // Check if reservation is upcoming or active
  const reservationStatus = useMemo(() => {
    if (!reservation) return 'unknown';
    
    const now = new Date();
    const startTime = new Date(reservation.start_time);
    const endTime = new Date(reservation.end_time);
    
    if (reservation.status === 'cancelled') return 'cancelled';
    if (reservation.status === 'completed') return 'completed';
    if (reservation.status === 'expired') return 'expired';
    
    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'in-progress';
    if (now > endTime) return 'expired';
    
    return 'active';
  }, [reservation]);

  // Time until reservation starts/ends
  const timeInfo = useMemo(() => {
    if (!reservation) return null;
    
    const now = new Date();
    const startTime = new Date(reservation.start_time);
    const endTime = new Date(reservation.end_time);
    
    if (reservationStatus === 'upcoming') {
      const diffMs = startTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins <= 0) return t('reservations.starts_now', 'Starts right now! Please arrive at station');
      if (diffMins < 60) return t('reservations.starts_in_mins', 'Starts in {m} mins — Come fast! ⚡').replace('{m}', diffMins.toString());
      const diffHours = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      if (diffHours < 24) return t('reservations.starts_in_hours', 'Starts in {h}h {m}m').replace('{h}', diffHours.toString()).replace('{m}', remMins.toString());
      const diffDays = Math.floor(diffHours / 24);
      return t('reservations.starts_in_days', 'Starts in {d} days').replace('{d}', diffDays.toString());
    }
    
    if (reservationStatus === 'in-progress') {
      const diffMs = endTime.getTime() - now.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      return `${Math.max(0, diffMins)} ${t('reservations.mins_remaining', 'minutes remaining in slot')}`;
    }
    
    return null;
  }, [reservation, reservationStatus]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      t('reservations.cancel_alert_title', 'Cancel Reservation'),
      t('reservations.cancel_alert_msg', 'Are you sure you want to cancel this reservation? This action cannot be undone.'),
      [
        { text: t('reservations.keep_booking', 'Keep Reservation'), style: 'cancel' },
        {
          text: t('reservations.cancel_alert_title', 'Cancel Reservation'),
          style: 'destructive',
          onPress: async () => {
            if (reservationId) {
              const success = await cancel(reservationId);
              if (success) {
                Alert.alert(t('reservations.cancelled_success', 'Cancelled'), t('reservations.cancelled_success', 'Your reservation has been cancelled.'));
                router.back();
              }
            }
          },
        },
      ]
    );
  }, [cancel, reservationId]);

  const handleSendReminder = async () => {
    setSendingReminder(true);
    // Simulate sending a push notification reminder
    setTimeout(() => {
      setSendingReminder(false);
      Alert.alert(t('reservations.send_reminder', 'Reminder Sent'), t('reservations.send_reminder', 'A push notification reminder has been sent to your device.'));
    }, 1500);
  };

  const handleStartCharging = useCallback(() => {
    // Navigate to charging session screen
    router.push({
      pathname: '/reservation/charging',
      params: {
        reservationId,
        chargerId: charger?.id,
        stationName: station?.name,
        powerKw: charger?.power_kw,
        pricePerKwh: charger?.price_per_kwh,
      },
    });
  }, [reservationId, charger, station]);

  const statusConfig = useMemo(() => {
    switch (reservationStatus) {
      case 'upcoming':
        return { label: 'Upcoming', color: colors.primary[500], bgColor: colors.primary[50] };
      case 'in-progress':
        return { label: 'In Progress', color: colors.success, bgColor: '#E8F5E9' };
      case 'completed':
        return { label: 'Completed', color: colors.neutral[500], bgColor: colors.neutral[100] };
      case 'cancelled':
        return { label: 'Cancelled', color: colors.error[500], bgColor: colors.error[50] };
      case 'expired':
        return { label: 'Expired', color: colors.warning, bgColor: '#FFF3E0' };
      default:
        return { label: 'Unknown', color: colors.neutral[500], bgColor: colors.neutral[100] };
    }
  }, [reservationStatus]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reservation Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading reservation...</Text>
        </View>
      </View>
    );
  }

  if (error || !reservation) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.neutral[800]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reservation Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error[500]} />
          <Text style={styles.errorText}>Reservation not found</Text>
          <Button title="Go Back" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>{t('reservations.title', 'Reservation Details')}</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: isDark ? '#1F2937' : statusConfig.bgColor }]}>
          <View style={styles.statusContent}>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
            {timeInfo && (
              <Text style={[styles.timeInfo, { color: isDark ? themeColors.textSecondary : statusConfig.color }]}>{timeInfo}</Text>
            )}
          </View>
          {reservationStatus === 'in-progress' && (
            <View style={styles.pulseIndicator}>
              <View style={[styles.pulseDot, { backgroundColor: statusConfig.color }]} />
            </View>
          )}
        </View>

        {/* Photo Gallery - Embedded Google Places Photos */}
        {station?.latitude && station?.longitude && (
          <Card style={styles.photoCard}>
            {/* Main Photo Display */}
            <TouchableOpacity 
              style={styles.photoContainer}
              onPress={() => photos.length > 0 && setShowPhotoModal(true)}
              activeOpacity={0.9}
            >
              {photosLoading ? (
                <View style={styles.photoLoading}>
                  <ActivityIndicator size="large" color={colors.primary[500]} />
                  <Text style={styles.photoLoadingText}>Loading photos...</Text>
                </View>
              ) : photos.length > 0 ? (
                <>
                  <Image
                    source={{ uri: photos[currentPhotoIndex] }}
                    style={styles.mainPhoto}
                    resizeMode="cover"
                  />
                  {/* Photo counter badge */}
                  {photos.length > 1 && (
                    <View style={styles.photoCounter}>
                      <Ionicons name="images" size={12} color="#fff" />
                      <Text style={styles.photoCounterText}>{currentPhotoIndex + 1}/{photos.length}</Text>
                    </View>
                  )}
                  {/* Tap to enlarge hint */}
                  <View style={styles.tapToEnlarge}>
                    <Ionicons name="expand-outline" size={12} color="#fff" />
                    <Text style={styles.tapToEnlargeText}>Tap to enlarge</Text>
                  </View>
                </>
              ) : (
                <View style={styles.noPhotos}>
                  <Ionicons name="image-outline" size={48} color={colors.neutral[300]} />
                  <Text style={styles.noPhotosText}>No photos available</Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Photo Thumbnails */}
            {photos.length > 1 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailsContainer}
                contentContainerStyle={styles.thumbnailsContent}
              >
                {photos.map((photo, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setCurrentPhotoIndex(index)}
                    style={[
                      styles.thumbnail,
                      currentPhotoIndex === index && styles.thumbnailActive
                    ]}
                  >
                    <Image
                      source={{ uri: photo }}
                      style={styles.thumbnailImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            {/* Get Directions Button */}
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={() => {
                router.push({
                  pathname: '/modal/navigation',
                  params: {
                    latitude: station.latitude.toString(),
                    longitude: station.longitude.toString(),
                    name: station.name || 'Charging Station',
                    address: station.address || '',
                  },
                });
              }}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.directionsButtonText}>Get Directions</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* Full-Screen Photo Modal */}
        <Modal
          visible={showPhotoModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPhotoModal(false)}
        >
          <View style={styles.photoModalContainer}>
            <TouchableOpacity
              style={styles.photoModalClose}
              onPress={() => setShowPhotoModal(false)}
            >
              <Ionicons name="close" size={32} color="#fff" />
            </TouchableOpacity>
            
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={currentPhotoIndex}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setCurrentPhotoIndex(index);
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={styles.photoModalImage}
                  resizeMode="contain"
                />
              )}
              keyExtractor={(_, index) => index.toString()}
            />
            
            {photos.length > 1 && (
              <View style={styles.photoModalCounter}>
                <Text style={styles.photoModalCounterText}>
                  {currentPhotoIndex + 1} / {photos.length}
                </Text>
              </View>
            )}
          </View>
        </Modal>

        {/* Station Info */}
        <Card style={[styles.stationCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.stationHeader}>
            <View style={[styles.stationIcon, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : colors.primary[50] }]}>
              <Ionicons name="flash" size={24} color={themeColors.primary} />
            </View>
            <View style={styles.stationInfo}>
              <Text style={[styles.stationName, { color: themeColors.textPrimary }]}>{station?.name || 'Unknown Station'}</Text>
              <Text style={[styles.stationAddress, { color: themeColors.textSecondary }]}>{station?.address || 'Address unavailable'}</Text>
            </View>
          </View>
        </Card>

        {/* Charger Details */}
        <Card style={[styles.detailsCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Charger Details</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="flash-outline" size={20} color={themeColors.textSecondary} />
              <View style={styles.detailText}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Type</Text>
                <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{chargerType?.name || 'Unknown'}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="hardware-chip-outline" size={20} color={themeColors.textSecondary} />
              <View style={styles.detailText}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Connector</Text>
                <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{connectorType?.name || 'Unknown'}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="speedometer-outline" size={20} color={themeColors.textSecondary} />
              <View style={styles.detailText}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Power</Text>
                <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{charger?.power_kw || 0} kW</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="pricetag-outline" size={20} color={themeColors.textSecondary} />
              <View style={styles.detailText}>
                <Text style={[styles.detailLabel, { color: themeColors.textSecondary }]}>Rate</Text>
                <Text style={[styles.detailValue, { color: themeColors.textPrimary }]}>{formatCurrency(charger?.price_per_kwh || 0)}/kWh</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Reservation Timing */}
        <Card style={[styles.detailsCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Reservation Time</Text>
          
          <View style={styles.timingContainer}>
            <View style={styles.timeBlock}>
              <Ionicons name="calendar-outline" size={24} color={themeColors.primary} />
              <Text style={[styles.timeLabel, { color: themeColors.textSecondary }]}>Date</Text>
              <Text style={[styles.timeValue, { color: themeColors.textPrimary }]}>{formatDate(new Date(reservation.start_time))}</Text>
            </View>
            
            <View style={[styles.timeDivider, { backgroundColor: themeColors.border }]} />
            
            <View style={styles.timeBlock}>
              <Ionicons name="time-outline" size={24} color={themeColors.primary} />
              <Text style={[styles.timeLabel, { color: themeColors.textSecondary }]}>Time</Text>
              <Text style={[styles.timeValue, { color: themeColors.textPrimary }]}>
                {formatTime(new Date(reservation.start_time))} - {formatTime(new Date(reservation.end_time))}
              </Text>
            </View>
            
            <View style={[styles.timeDivider, { backgroundColor: themeColors.border }]} />
            
            <View style={styles.timeBlock}>
              <Ionicons name="hourglass-outline" size={24} color={themeColors.primary} />
              <Text style={[styles.timeLabel, { color: themeColors.textSecondary }]}>Duration</Text>
              <Text style={[styles.timeValue, { color: themeColors.textPrimary }]}>{formatDuration(durationMinutes)}</Text>
            </View>
          </View>
        </Card>

        {/* Estimated Cost */}
        <Card style={[styles.costCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <View style={styles.costHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Estimated Cost</Text>
            <Text style={[styles.costNote, { color: themeColors.textSecondary }]}>*Based on full duration</Text>
          </View>
          <View style={styles.costContent}>
            <Text style={[styles.costAmount, { color: themeColors.textPrimary }]}>{formatCurrency(estimatedCost)}</Text>
            <Text style={[styles.costBreakdown, { color: themeColors.textSecondary }]}>
              {charger?.power_kw} kW × {(durationMinutes / 60).toFixed(1)} hrs × {formatCurrency(charger?.price_per_kwh || 0)}/kWh
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={[styles.actionButtons, { paddingBottom: insets.bottom + 16 }]}>
          {reservationStatus === 'upcoming' && (
            <>
              <Button
                title={t('reservations.check_in_start', '⚡ Check In / Start Charging Session')}
                variant="primary"
                onPress={handleSendReminder}
                loading={sendingReminder}
                fullWidth
                style={{ backgroundColor: themeColors.primary, marginBottom: 8 }}
              />
              <Button
                title={t('reservations.check_in_start', '⚡ Check In / Start Charging Now')}
                variant="outline"
                onPress={handleStartCharging}
                fullWidth
                style={{ marginBottom: 8 }}
              />
              <Button
                title={t('support.cancel', 'Cancel Reservation')}
                variant="ghost"
                onPress={handleCancel}
                loading={cancelling}
                fullWidth
                style={styles.cancelButton}
              />
            </>
          )}
          
          {reservationStatus === 'in-progress' && (
            <>
              <Button
                title={t('charging.start_btn', '⚡ Start Charging Session')}
                variant="primary"
                onPress={handleStartCharging}
                fullWidth
                style={{ marginBottom: 8 }}
              />
              <Button
                title={t('reservations.send_reminder', '🔔 Send Status Reminder')}
                variant="outline"
                onPress={handleSendReminder}
                loading={sendingReminder}
                fullWidth
              />
            </>
          )}
          
          {(reservationStatus === 'completed' || reservationStatus === 'expired') && (
            <Button
              title={t('reservations.book_again', 'Book Again')}
              variant="primary"
              onPress={() => {
                if (station?.id) {
                  router.push(`/station/${station.id}`);
                }
              }}
              fullWidth
            />
          )}
        </View>
      </ScrollView>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  placeholder: {
    width: 40,
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.neutral[500],
  },
  errorText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  content: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statusContent: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  timeInfo: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  pulseIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Photo Gallery Styles
  photoCard: {
    margin: 16,
    marginBottom: 8,
    overflow: 'hidden',
  },
  photoContainer: {
    height: PHOTO_HEIGHT,
    backgroundColor: colors.neutral[100],
    position: 'relative',
  },
  photoLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
  },
  photoLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.neutral[500],
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[200],
  },
  photoCounter: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  photoCounterText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  tapToEnlarge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  tapToEnlargeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  noPhotos: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotosText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.neutral[400],
  },
  thumbnailsContainer: {
    maxHeight: 60,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  thumbnailsContent: {
    padding: 8,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 44,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 8,
  },
  thumbnailActive: {
    borderColor: colors.primary[500],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.primary[500],
    margin: 12,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  directionsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Photo Modal Styles
  photoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  photoModalImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  photoModalCounter: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  photoModalCounterText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  stationCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stationName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  stationAddress: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 2,
  },
  detailsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailText: {
    marginLeft: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    marginTop: 2,
  },
  timingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeDivider: {
    width: 1,
    height: 50,
    backgroundColor: colors.neutral[200],
  },
  timeLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 8,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
    marginTop: 4,
    textAlign: 'center',
  },
  costCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  costHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costNote: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  costContent: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.primary[50],
    borderRadius: 12,
  },
  costAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary[600],
  },
  costBreakdown: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 8,
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    borderColor: colors.error[500],
  },
});
