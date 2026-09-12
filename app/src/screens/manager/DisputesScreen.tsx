import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '../../api/http';
import {
  Text,
  Button,
  Card,
  SkeletonCard,
  Chip,
} from '../../components';
import { colors, radii, spacing } from '../../theme/tokens';

export const DisputesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: disputes, isLoading } = useQuery<any[]>({
    queryKey: ['manager', 'disputes'],
    queryFn: async () => {
      const res = await http.get<any[]>('/sessions/manager/disputes');
      return res;
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['manager', 'disputes'] });
    setRefreshing(false);
  };

  const refundMutation = useMutation({
    mutationFn: async ({ sessionId, amount }: { sessionId: string; amount: number }) => {
      return http.post(`/sessions/${sessionId}/refund`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'disputes'] });
      Alert.alert('Refund Processing', 'The refund has been initiated. Status will update once the webhook confirms.');
    },
    onError: (err: any) => {
      Alert.alert('Refund Failed', err?.message || 'Something went wrong');
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ sessionId, resolutionNotes }: { sessionId: string; resolutionNotes: string }) => {
      return http.post(`/sessions/${sessionId}/resolve`, { resolutionNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'disputes'] });
      Alert.alert('Resolved', 'Resolution notes saved.');
    },
  });

  const handleRefund = (session: any) => {
    if (session.refundStatus !== 'none') {
      Alert.alert('Notice', `Refund is already ${session.refundStatus}.`);
      return;
    }

    Alert.prompt(
      'Issue Refund',
      `Enter refund amount for session ${session.id.substring(0, 8)} (Max: ₹${session.cost})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refund',
          style: 'destructive',
          onPress: (amountStr) => {
            const amount = parseFloat(amountStr || '0');
            if (isNaN(amount) || amount <= 0 || amount > session.cost) {
              Alert.alert('Error', 'Invalid amount.');
              return;
            }
            refundMutation.mutate({ sessionId: session.id, amount });
          },
        },
      ],
      'plain-text',
      session.cost.toString()
    );
  };

  const handleResolve = (session: any) => {
    Alert.prompt(
      'Resolve Dispute',
      'Enter resolution notes for internal tracking:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (notes) => {
            if (notes) resolveMutation.mutate({ sessionId: session.id, resolutionNotes: notes });
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <Card elevation="e1" style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text variant="title" color={colors.ink}>{item.station.name}</Text>
            <Text variant="caption" color={colors.ink2}>Session: {item.id.substring(0, 8)}</Text>
          </View>
          <Chip 
            label={item.refundStatus === 'processing' ? 'Processing' : item.refundStatus === 'refunded' ? 'Refunded' : 'Disputed'}
            variant="subtle"
            color={item.refundStatus === 'refunded' ? colors.success : item.refundStatus === 'processing' ? colors.warning : colors.danger}
            backgroundColor={item.refundStatus === 'refunded' ? colors.success + '20' : item.refundStatus === 'processing' ? colors.warning + '20' : colors.danger + '20'}
          />
        </View>

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" color={colors.ink}>User:</Text>
          <Text variant="body" color={colors.ink2}>{item.user.name}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text variant="bodyMedium" color={colors.ink}>Cost:</Text>
          <Text variant="body" color={colors.ink2}>₹{item.cost}</Text>
        </View>

        <View style={styles.detailBlock}>
          <Text variant="bodyMedium" color={colors.ink}>Dispute Reason:</Text>
          <Text variant="body" color={colors.ink2}>{item.disputeReason}</Text>
        </View>

        {item.resolutionNotes && (
          <View style={styles.detailBlock}>
            <Text variant="bodyMedium" color={colors.ink}>Resolution Notes:</Text>
            <Text variant="body" color={colors.success}>{item.resolutionNotes}</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Button
            label={item.refundStatus === 'processing' ? 'Processing...' : 'Refund'}
            variant={item.refundStatus !== 'none' ? 'secondary' : 'primary'}
            onPress={() => handleRefund(item)}
            disabled={item.refundStatus !== 'none' || refundMutation.isPending}
            style={styles.actionBtn}
          />
          <Button
            label="Resolve"
            variant="secondary"
            onPress={() => handleResolve(item)}
            disabled={resolveMutation.isPending}
            style={styles.actionBtn}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={[styles.skeletonContainer, { paddingTop: insets.top + spacing.base }]}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing.xxl },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text variant="title" color={colors.ink2}>No disputed sessions</Text>
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
  skeletonContainer: {
    paddingHorizontal: spacing.base,
    gap: spacing.base,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailBlock: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    height: 40,
  },
  empty: {
    padding: spacing.xl,
    alignItems: 'center',
  },
});
