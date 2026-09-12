/**
 * Notification Settings & Preferences Modal Screen
 * Manage smart solar window alerts, price drop notifications, countdowns, and distance units.
 * Connected to dynamic Theme & Hindi/English Language.
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
import { spacing } from '@/styles/spacing';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

export default function NotificationSettingsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [solarWindowAlerts, setSolarWindowAlerts] = useState(true);
  const [priceDiscountAlerts, setPriceDiscountAlerts] = useState(true);
  const [sessionCountdowns, setSessionCountdowns] = useState(true);
  const [lowBatteryReminder, setLowBatteryReminder] = useState(true);
  const [units, setUnits] = useState<'km' | 'mi'>('km');

  const handleSave = () => {
    Alert.alert(
      t('pref.notifications', 'Preferences Saved'),
      'Your notification and unit preferences have been successfully updated.',
      [{ text: t('common.ok', 'OK'), onPress: () => router.back() }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('pref.notifications', 'Notifications & Settings')}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveHeaderButton, { backgroundColor: colors.primaryLight }]}
        >
          <Text style={[styles.saveHeaderText, { color: colors.primary }]}>
            {t('common.save', 'Save')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Push Toggle */}
        <View style={[styles.masterCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.masterLeft}>
            <View style={[styles.masterIconBox, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="notifications" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.masterTitle, { color: colors.textPrimary }]}>
                {t('pref.notifications', 'Push Notifications')}
              </Text>
              <Text style={[styles.masterSubtitle, { color: colors.textSecondary }]}>
                Enable all real-time alerts and charging updates
              </Text>
            </View>
          </View>
          <Switch
            value={pushEnabled}
            onValueChange={setPushEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Smart Green Grid Alerts */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Eco & Smart Charging Alerts
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Solar Windows */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.rowTitleWrap}>
                <Ionicons name="sunny" size={18} color="#F59E0B" />
                <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                  Peak Solar & Wind Hours
                </Text>
              </View>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                Notify when renewable grid mix exceeds 75% for lowest carbon intensity
              </Text>
            </View>
            <Switch
              value={solarWindowAlerts && pushEnabled}
              onValueChange={setSolarWindowAlerts}
              disabled={!pushEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {/* Dynamic Discounts */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.rowTitleWrap}>
                <Ionicons name="pricetag" size={18} color="#10B981" />
                <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                  Price Drop & Dynamic Discounts
                </Text>
              </View>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                Alert when nearby fast-chargers offer ₹100+ savings or off-peak rates
              </Text>
            </View>
            <Switch
              value={priceDiscountAlerts && pushEnabled}
              onValueChange={setPriceDiscountAlerts}
              disabled={!pushEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Charging Session Updates */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Active Sessions & Garage
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Session Countdown */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.rowTitleWrap}>
                <Ionicons name="timer-outline" size={18} color="#3B82F6" />
                <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                  Session 10-Min Countdown
                </Text>
              </View>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                Reminders before reservation window expires to avoid idle fees
              </Text>
            </View>
            <Switch
              value={sessionCountdowns && pushEnabled}
              onValueChange={setSessionCountdowns}
              disabled={!pushEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          {/* Low Battery Alerts */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.rowTitleWrap}>
                <Ionicons name="battery-dead-outline" size={18} color="#EF4444" />
                <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
                  Low EV Battery Protection
                </Text>
              </View>
              <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
                Smart prompts when EV state of charge falls below 20%
              </Text>
            </View>
            <Switch
              value={lowBatteryReminder && pushEnabled}
              onValueChange={setLowBatteryReminder}
              disabled={!pushEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Distance Units */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Measurement Units
        </Text>
        <View style={[styles.unitsCard, { backgroundColor: colors.surfaceSunken }]}>
          <TouchableOpacity
            style={[styles.unitButton, units === 'km' && [styles.unitButtonActive, { backgroundColor: colors.surface }]]}
            onPress={() => setUnits('km')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.unitText,
                { color: colors.textSecondary },
                units === 'km' && { color: colors.primary, fontWeight: '700' },
              ]}
            >
              Kilometers (km)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitButton, units === 'mi' && [styles.unitButtonActive, { backgroundColor: colors.surface }]]}
            onPress={() => setUnits('mi')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.unitText,
                { color: colors.textSecondary },
                units === 'mi' && { color: colors.primary, fontWeight: '700' },
              ]}
            >
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveHeaderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveHeaderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  masterTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  masterSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
    marginLeft: 4,
  },
  card: {
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
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
  },
  toggleDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  divider: {
    height: 1,
  },
  unitsCard: {
    flexDirection: 'row',
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
    elevation: 2,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
