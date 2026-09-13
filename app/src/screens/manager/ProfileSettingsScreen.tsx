import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { http } from '../../api/http';
import {
  Text,
  Button,
  Card,
  SkeletonCard,
} from '../../components';
import { colors, radii, spacing } from '../../theme/tokens';
import { useAuthStore } from '../../features/auth/authStore';

export const ProfileSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    supportEmail: '',
    payoutBankDetails: { accountName: '', accountNumber: '', ifscCode: '' },
    notificationPrefs: { emailAlerts: false, pushAlerts: true, smsAlerts: false },
  });

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ['manager', 'profile'],
    queryFn: async () => {
      const res = await http.get<any>('/manager/profile');
      return res;
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        phone: profile.phone || '',
        supportEmail: profile.supportEmail || '',
        payoutBankDetails: profile.payoutBankDetails || { accountName: '', accountNumber: '', ifscCode: '' },
        notificationPrefs: profile.notificationPrefs || { emailAlerts: false, pushAlerts: true, smsAlerts: false },
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return http.patch('/manager/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager', 'profile'] });
      Alert.alert('Success', 'Profile settings updated.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.message || 'Failed to update profile.');
    },
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.base }]}>
        <SkeletonCard />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.base, paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <Text variant="h2" style={styles.header}>Manager Settings</Text>

        <Card elevation="e1" style={styles.card}>
          <Text variant="title" style={styles.sectionTitle}>Business Profile</Text>
          
          <View style={styles.inputGroup}>
            <Text variant="bodyMedium" color={colors.ink}>Business Name</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(val) => setForm({ ...form, name: val })}
              placeholder="e.g. Green Drive Pvt Ltd"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text variant="bodyMedium" color={colors.ink}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(val) => setForm({ ...form, phone: val })}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text variant="bodyMedium" color={colors.ink}>Support Email</Text>
            <TextInput
              style={styles.input}
              value={form.supportEmail}
              onChangeText={(val) => setForm({ ...form, supportEmail: val })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </Card>

        <Card elevation="e1" style={styles.card}>
          <Text variant="title" style={styles.sectionTitle}>Payout Bank Details</Text>
          
          <View style={styles.inputGroup}>
            <Text variant="bodyMedium" color={colors.ink}>Account Name</Text>
            <TextInput
              style={styles.input}
              value={form.payoutBankDetails.accountName}
              onChangeText={(val) => setForm({ ...form, payoutBankDetails: { ...form.payoutBankDetails, accountName: val } })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text variant="bodyMedium" color={colors.ink}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={form.payoutBankDetails.accountNumber}
              onChangeText={(val) => setForm({ ...form, payoutBankDetails: { ...form.payoutBankDetails, accountNumber: val } })}
              keyboardType="numeric"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text variant="bodyMedium" color={colors.ink}>IFSC Code</Text>
            <TextInput
              style={styles.input}
              value={form.payoutBankDetails.ifscCode}
              onChangeText={(val) => setForm({ ...form, payoutBankDetails: { ...form.payoutBankDetails, ifscCode: val } })}
              autoCapitalize="characters"
            />
          </View>
        </Card>

        <Card elevation="e1" style={styles.card}>
          <Text variant="title" style={styles.sectionTitle}>Notification Preferences</Text>
          
          <View style={styles.switchRow}>
            <Text variant="body" color={colors.ink}>Push Alerts (Demand/Refunds)</Text>
            <Switch
              value={form.notificationPrefs.pushAlerts}
              onValueChange={(val) => setForm({ ...form, notificationPrefs: { ...form.notificationPrefs, pushAlerts: val } })}
              trackColor={{ true: colors.brand }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text variant="body" color={colors.ink}>Email Summaries</Text>
            <Switch
              value={form.notificationPrefs.emailAlerts}
              onValueChange={(val) => setForm({ ...form, notificationPrefs: { ...form.notificationPrefs, emailAlerts: val } })}
              trackColor={{ true: colors.brand }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text variant="body" color={colors.ink}>SMS Critical Alerts</Text>
            <Switch
              value={form.notificationPrefs.smsAlerts}
              onValueChange={(val) => setForm({ ...form, notificationPrefs: { ...form.notificationPrefs, smsAlerts: val } })}
              trackColor={{ true: colors.brand }}
            />
          </View>
        </Card>

        <Button
          label={updateMutation.isPending ? "Saving..." : "Save Settings"}
          variant="primary"
          onPress={handleSave}
          disabled={updateMutation.isPending}
          style={styles.saveBtn}
        />

        <Button
          label="Log Out"
          variant="ghost"
          onPress={handleLogout}
          style={styles.logoutBtn}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  content: {
    paddingHorizontal: spacing.base,
    gap: spacing.base,
  },
  header: {
    marginBottom: spacing.xs,
  },
  card: {
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  },
  sectionTitle: {
    marginBottom: spacing.base,
    color: colors.ink,
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    marginTop: 4,
    backgroundColor: colors.surfaceSunken,
    color: colors.ink,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  saveBtn: {
    marginTop: spacing.base,
  },
  logoutBtn: {
    marginTop: spacing.xs,
  },
});
