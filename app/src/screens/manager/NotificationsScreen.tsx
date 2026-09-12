import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '../../api/http';
import { Text, Card, SkeletonCard } from '../../components';
import { colors, radii, spacing } from '../../theme/tokens';
import { Ionicons } from '@expo/vector-icons';

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

export const NotificationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: notifications, isLoading } = useQuery<any[]>({
    queryKey: ['manager', 'notifications'],
    queryFn: async () => {
      const res = await http.get<any[]>('/notifications/history'); // Assuming this endpoint exists for both driver and manager
      return res;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return http.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'notifications'] });
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['manager', 'notifications'] });
    setRefreshing(false);
  };

  const handleMarkAsRead = (id: string, isRead: boolean) => {
    if (!isRead) {
      markAsReadMutation.mutate(id);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleMarkAsRead(item.id, item.isRead)}
      >
        <Card elevation="e0" style={[styles.card, !item.isRead ? styles.unreadCard : {}]}>
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Ionicons
                name={
                  item.type === 'demand_charge_risk' ? 'warning' :
                  item.type === 'refund_processing' || item.type === 'refund_completed' ? 'cash' :
                  'notifications'
                }
                size={20}
                color={colors.brand}
              />
            </View>
            <View style={styles.content}>
              <Text variant="bodyMedium" color={colors.ink}>{item.title}</Text>
              <Text variant="caption" color={colors.ink2}>{item.body}</Text>
              <Text variant="micro" color={colors.ink3} style={styles.time}>
                {timeAgo(item.createdAt)}
              </Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={[styles.listContent, { paddingTop: insets.top + spacing.base }]}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing.xxl },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="title" color={colors.ink2}>No notifications</Text>
              <Text variant="body" color={colors.ink3}>You are all caught up!</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.base,
  },
  card: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  unreadCard: {
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.brand,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
  },
  time: {
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
});
