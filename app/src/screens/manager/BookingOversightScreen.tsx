import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ManagerStackParamList } from '../../navigation/types';
import { http } from '../../api/http';
import {
  Text,
  Button,
  Chip,
  Card,
  SkeletonCard,
} from '../../components';
import { colors, radii, spacing } from '../../theme/tokens';
import { formatConnectorName } from '../../features/stations/utils';
import { ConnectorType } from '@contracts/enums';

interface UpcomingBooking {
  id: string;
  stationId: string;
  connectorType: ConnectorType;
  connectorId: string;
  status: string;
  windowStart: string;
  windowEnd: string;
  station: { name: string };
  vehicle: { model: string };
  user: { name: string; email: string };
}

export const BookingOversightScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<ManagerStackParamList>>();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery<UpcomingBooking[]>({
    queryKey: ['manager', 'upcoming-bookings'],
    queryFn: async () => {
      const res = await http.get<UpcomingBooking[]>('/bookings/manager/upcoming');
      return res;
    },
    staleTime: 10000,
  });

  const overrideMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return await http.post(`/bookings/${bookingId}/override-stuck`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'upcoming-bookings'] });
      Alert.alert('Connector Freed', 'The stuck booking was overridden and the slot is now free.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to override booking.');
    },
  });

  const handleOverride = (bookingId: string) => {
    Alert.alert(
      'Free Stuck Connector',
      'Are you sure you want to mark this booking as expired and free up the plug for other drivers?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Free Plug',
          style: 'destructive',
          onPress: () => overrideMutation.mutate(bookingId),
        },
      ]
    );
  };

  const upcomingBookings = bookings || [];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <View style={styles.header}>
          <Text variant="h1" style={styles.screenTitle}>
            Booking Oversight
          </Text>
          <Text variant="caption" color={colors.ink2}>
            Manage upcoming reservations & no-shows
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <View style={styles.listContainer}>
            {upcomingBookings.length === 0 ? (
              <Card elevation="e0" style={styles.emptyCard}>
                <Text variant="body" color={colors.ink2} align="center">
                  No upcoming bookings.
                </Text>
              </Card>
            ) : (
              upcomingBookings.map((booking) => {
                const startTime = new Date(booking.windowStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(booking.windowEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const isNoShow = new Date() > new Date(new Date(booking.windowStart).getTime() + 15 * 60 * 1000);

                return (
                  <Card key={booking.id} elevation="e1" style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      <View style={{ flex: 1 }}>
                        <Text variant="title" style={styles.stationTitle}>
                          {booking.station.name}
                        </Text>
                        <Text variant="caption" color={colors.ink2}>
                          {startTime} - {endTime}
                        </Text>
                      </View>
                      <Chip
                        label={booking.status.toUpperCase()}
                        variant="subtle"
                        color={isNoShow ? colors.danger : colors.brand}
                        backgroundColor={isNoShow ? '#FDEDED' : colors.brandTint}
                      />
                    </View>

                    <View style={styles.bookingDetails}>
                      <Text variant="bodyMedium" color={colors.ink}>
                        Driver: {booking.user.name} ({booking.user.email})
                      </Text>
                      <Text variant="caption" color={colors.ink2}>
                        Vehicle: {booking.vehicle.model}
                      </Text>
                      <Text variant="caption" color={colors.ink2}>
                        Plug: {formatConnectorName(booking.connectorType)}
                      </Text>
                    </View>

                    <View style={styles.actionsRow}>
                      <Button
                        label="Free Stuck Plug"
                        variant="secondary"
                        onPress={() => handleOverride(booking.id)}
                        style={styles.actionBtn}
                      />
                    </View>
                  </Card>
                );
              })
            )}
          </View>
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
  header: {
    marginBottom: spacing.base,
  },
  screenTitle: {
    color: colors.ink,
    marginBottom: 2,
  },
  skeletonContainer: {
    gap: spacing.base,
  },
  listContainer: {
    gap: spacing.base,
    marginBottom: spacing.xxl,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: radii.lg,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  stationTitle: {
    color: colors.ink,
    marginBottom: 2,
  },
  bookingDetails: {
    backgroundColor: colors.surfaceSunken,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    height: 36,
    paddingHorizontal: spacing.sm,
  },
});
