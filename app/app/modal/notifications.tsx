/**
 * Notifications Modal
 * Displays real-time smart savings alerts, charging reminders, and deals
 */

import { EmptyState } from '@/components/common';
import { NotificationListSkeleton } from '@/components/ui';
import { colors } from '@/constants/colors';
import {
  AppNotification,
  getNotificationHistory,
  markNotificationAsRead,
  evaluateNearbySavings,
} from '@/services/notifications.service';
import { spacing } from '@/styles/spacing';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await getNotificationHistory();
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = async (notif: AppNotification) => {
    await markNotificationAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );

    if (notif.data?.bookingId) {
      router.push(`/reservation/${notif.data.bookingId}`);
    } else if (notif.data?.stationId) {
      router.push(`/station/${notif.data.stationId}`);
    }
  };

  const handleSimulateDeal = async () => {
    setSimulating(true);
    try {
      await evaluateNearbySavings(undefined, true);
      await fetchNotifications();
    } finally {
      setSimulating(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return { name: 'checkmark-circle' as const, bg: '#EFF6FF', color: '#2563EB' };
      case 'booking_reminder':
        return { name: 'alarm' as const, bg: '#FEF3C7', color: '#D97706' };
      case 'session_complete':
        return { name: 'leaf' as const, bg: '#DCFCE7', color: '#16A34A' };
      case 'smart_savings_alert':
        return { name: 'flash' as const, bg: '#DCFCE7', color: '#15803D' };
      default:
        return { name: 'notifications' as const, bg: colors.neutral[100], color: colors.neutral[600] };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          onPress={handleSimulateDeal}
          disabled={simulating}
          style={styles.simulateButton}
        >
          {simulating ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <Ionicons name="sparkles" size={20} color={colors.primary[500]} />
          )}
        </TouchableOpacity>
      </View>

      {loading && notifications.length === 0 ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <NotificationListSkeleton count={4} />
        </ScrollView>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="notifications-outline"
            title="No Notifications Yet"
            description="We'll notify you for confirmed bookings, time reminders, completed sessions, and dynamic smart deals."
            actionLabel="Check for Smart Deals"
            onAction={handleSimulateDeal}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary[500]}
            />
          }
        >
          {notifications.map((notif) => {
            const iconConfig = getNotificationIcon(notif.type);
            return (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notifCard, !notif.isRead && styles.unreadCard]}
                onPress={() => handleNotificationPress(notif)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: iconConfig.bg },
                  ]}
                >
                  <Ionicons
                    name={iconConfig.name}
                    size={22}
                    color={iconConfig.color}
                  />
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.titleRow}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    {!notif.isRead && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifBody}>{notif.body}</Text>
                  <View style={styles.metaRow}>
                    {notif.data?.savingsInr ? (
                      <View style={styles.savingsTag}>
                        <Text style={styles.savingsTagText}>
                          Save ₹{notif.data.savingsInr}
                        </Text>
                      </View>
                    ) : null}
                    {notif.data?.avoidedCo2Kg ? (
                      <View style={[styles.savingsTag, { backgroundColor: '#DCFCE7' }]}>
                        <Text style={[styles.savingsTagText, { color: '#15803D' }]}>
                          🌱 {notif.data.avoidedCo2Kg}kg CO₂ avoided
                        </Text>
                      </View>
                    ) : null}
                    {notif.data?.minutesRemaining !== undefined ? (
                      <View style={[styles.savingsTag, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={[styles.savingsTagText, { color: '#B45309' }]}>
                          ⏰ {notif.data.minutesRemaining}m left
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.timeText}>
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.neutral[400]}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
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
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  simulateButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.neutral[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.screenPadding,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    gap: spacing.sm,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xs,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary[500],
    backgroundColor: '#F8FAFC',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  savingsIcon: {
    backgroundColor: colors.primary[50],
  },
  regularIcon: {
    backgroundColor: colors.neutral[100],
  },
  notifContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
  },
  notifBody: {
    fontSize: 13,
    color: colors.neutral[600],
    marginTop: 2,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  savingsTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  timeText: {
    fontSize: 11,
    color: colors.neutral[400],
  },
});
