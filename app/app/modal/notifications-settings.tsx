/**
 * Notification Settings & Preferences Modal Screen
 * Manage smart solar window alerts, price drop notifications, countdowns, and distance units.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { spacing } from '@/styles/spacing';

export default function NotificationSettingsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [solarWindowAlerts, setSolarWindowAlerts] = useState(true);
  const [priceDiscountAlerts, setPriceDiscountAlerts] = useState(true);
  const [sessionCountdowns, setSessionCountdowns] = useState(true);
  const [lowBatteryReminder, setLowBatteryReminder] = useState(true);
  const [units, setUnits] = useState<'km' | 'mi'>('km');

  const handleSave = () => {
    Alert.alert(
      'Preferences Saved',
      'Your notification and unit preferences have been successfully updated.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={26} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications & Settings</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveHeaderButton}>
          <Text style={styles.saveHeaderText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Push Toggle */}
        <View style={styles.masterCard}>
          <View style={styles.masterLeft}>
            <View style={styles.masterIconBox}>
              <Ionicons name="notifications" size={22} color={colors.primary[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.masterTitle}>Push Notifications</Text>
              <Text style={styles.masterSubtitle}>Enable all real-time alerts and charging updates</Text>
            </View>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
            thumbColor={colors.white}
          />
        </View>

        {/* Smart Green Grid Alerts */}
        <Text style={styles.sectionTitle}>Eco & Smart Charging Alerts</Text>
        <View style={styles.card}>
          {/* Solar Windows */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.rowTitleWrap}>
                <Ionicons name="sunny" size={18} color="#F59E0B" />
                <Text style={styles.toggleTitle}>Peak Solar & Wind Hours</Text>
              </View>
              <Text style={styles.toggleDesc}>
                Notify when renewable grid mix exceeds 75% for lowest carbon intensity
              </Text>
            </View>
            <Switch
              value={solarWindowAlerts && pushEnabled}
              onValueChange={setSolarWindowAlerts}
              disabled={!pushEnabled}
              trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.divider} />

          {/* Dynamic Discounts */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.rowTitleWrap}>
                <Ionicons name="pricetag" size={18} color="#10B981" />
                <Text style={styles.toggleTitle}>Price Drop & Dynamic Discounts</Text>
              </View>
              <Text style={styles.toggleDesc}>
                Alert when nearby fast-chargers offer ₹100+ savings or off-peak rates
              </Text>
            </View>
            <Switch
              value={priceDiscountAlerts && pushEnabled}
              onValueChange={setPriceDiscountAlerts}
              disabled={!pushEnabled}
              trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Charging Session Updates */}
        <Text style={styles.sectionTitle}>Active Sessions & Garage</Text>
        <View style={styles.card}>
          {/* Session Countdown */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.rowTitleWrap}>
                <Ionicons name="timer-outline" size={18} color="#3B82F6" />
                <Text style={styles.toggleTitle}>Session 10-Min Countdown</Text>
              </View>
              <Text style={styles.toggleDesc}>
                Reminders before reservation window expires to avoid idle fees
              </Text>
            </View>
            <Switch
              value={sessionCountdowns && pushEnabled}
              onValueChange={setSessionCountdowns}
              disabled={!pushEnabled}
              trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.divider} />

          {/* Low Battery Alerts */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.rowTitleWrap}>
                <Ionicons name="battery-dead-outline" size={18} color="#EF4444" />
                <Text style={styles.toggleTitle}>Low EV Battery Protection</Text>
              </View>
              <Text style={styles.toggleDesc}>
                Smart prompts when EV state of charge falls below 20%
              </Text>
            </View>
            <Switch
              value={lowBatteryReminder && pushEnabled}
              onValueChange={setLowBatteryReminder}
              disabled={!pushEnabled}
              trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Distance Units */}
        <Text style={styles.sectionTitle}>Measurement Units</Text>
        <View style={styles.unitsCard}>
          <TouchableOpacity
            style={[styles.unitButton, units === 'km' && styles.unitButtonActive]}
            onPress={() => setUnits('km')}
            activeOpacity={0.8}
          >
            <Text style={[styles.unitText, units === 'km' && styles.unitTextActive]}>
              Kilometers (km)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitButton, units === 'mi' && styles.unitButtonActive]}
            onPress={() => setUnits('mi')}
            activeOpacity={0.8}
          >
            <Text style={[styles.unitText, units === 'mi' && styles.unitTextActive]}>
              Miles (mi)
            </Text>
          </TouchableOpacity>
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
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  headerButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  saveHeaderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
  },
  saveHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary[600],
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  masterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  masterIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  masterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  masterSubtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  rowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  toggleDesc: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 4,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
  },
  unitsCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[200],
    borderRadius: spacing.radius.lg,
    padding: 4,
    gap: 4,
    marginBottom: spacing.lg,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: spacing.radius.md,
  },
  unitButtonActive: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  unitTextActive: {
    color: colors.primary[600],
    fontWeight: '700',
  },
});
