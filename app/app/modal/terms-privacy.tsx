/**
 * Terms & Privacy Policy Modal Screen
 * Legal Terms of Service, User Privacy Policy, Location Data Rights & Green Energy Certification SLA
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { spacing } from '@/styles/spacing';

type LegalTab = 'terms' | 'privacy' | 'green_sla';

export default function TermsPrivacyModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<LegalTab>('terms');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={26} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Privacy</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: 'terms', label: 'Terms of Service' },
          { id: 'privacy', label: 'Privacy Policy' },
          { id: 'green_sla', label: '🌱 Green SLA' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isSelected && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id as LegalTab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'terms' && (
          <View style={styles.contentCard}>
            <Text style={styles.docTitle}>EcoVolt Finder Terms of Service</Text>
            <Text style={styles.lastUpdated}>Effective Date: September 2026 · Version 1.4</Text>

            <Text style={styles.sectionHeader}>1. EV Charging & Slot Reservations</Text>
            <Text style={styles.paragraph}>
              By placing a reservation on EcoVolt Finder, you enter into a smart contract lock for the specified connector, charging speed, and dynamic green tariff. A grace period of 15 minutes is provided after your start window before the slot may be reallocated.
            </Text>

            <Text style={styles.sectionHeader}>2. Dynamic Pricing & Green Windows</Text>
            <Text style={styles.paragraph}>
              Electricity rates displayed are tied directly to state power discom tariffs (GUVNL, Torrent Power, BESCOM, MSEDCL) combined with real-time renewable grid bonuses. The locked price at checkout is guaranteed throughout your active charging session.
            </Text>

            <Text style={styles.sectionHeader}>3. Safety & Charger Operations</Text>
            <Text style={styles.paragraph}>
              Users agree to follow certified EV charging protocols. Tampering with DC high-voltage connectors or leaving fully charged vehicles in active charging bays beyond designated time is subject to standard network overstay fees.
            </Text>

            <Text style={styles.sectionHeader}>4. Cancellation and Refunds</Text>
            <Text style={styles.paragraph}>
              Free cancellations are permitted up to 15 minutes prior to session onset. In the rare event of station hardware failure or power outage, 100% of wallet funds are auto-refunded instantly.
            </Text>
          </View>
        )}

        {activeTab === 'privacy' && (
          <View style={styles.contentCard}>
            <Text style={styles.docTitle}>Privacy & Data Protection Policy</Text>
            <Text style={styles.lastUpdated}>Effective Date: September 2026 · Version 1.4</Text>

            <Text style={styles.sectionHeader}>1. Information We Collect</Text>
            <Text style={styles.paragraph}>
              We collect your vehicle model, battery capacity (kWh), connector types, and live GPS coordinates strictly for routing you to compatible, high-efficiency charging stations within your real range.
            </Text>

            <Text style={styles.sectionHeader}>2. Location Data Usage</Text>
            <Text style={styles.paragraph}>
              Background GPS location is used only when active turn-by-turn navigation or nearby solar window proximity alerts are enabled. We do not sell or share individual driver telematics with third-party advertising networks.
            </Text>

            <Text style={styles.sectionHeader}>3. Payment & Banking Security</Text>
            <Text style={styles.paragraph}>
              Payment credentials, UPI handles, and card tokens are stored in compliance with PCI-DSS protocols and RBI guidelines using bank-grade 256-bit encryption.
            </Text>

            <Text style={styles.sectionHeader}>4. Account Deletion</Text>
            <Text style={styles.paragraph}>
              You have the right to request full anonymization and deletion of your profile, vehicle garage, and charging history at any time through our customer support.
            </Text>
          </View>
        )}

        {activeTab === 'green_sla' && (
          <View style={styles.contentCard}>
            <Text style={styles.docTitle}>Renewable Energy & Carbon Offset SLA</Text>
            <Text style={styles.lastUpdated}>Standard: Clean Energy Grid Accord 2026</Text>

            <View style={styles.highlightBox}>
              <Ionicons name="leaf" size={20} color="#059669" />
              <Text style={styles.highlightText}>
                EcoVolt guarantees 100% verifiable data sourcing for solar and wind energy generation metrics across Indian grid zones.
              </Text>
            </View>

            <Text style={styles.sectionHeader}>1. Grid Zone Forecast Accuracy</Text>
            <Text style={styles.paragraph}>
              Renewable energy percentages and carbon intensity (gCO₂/kWh) are updated at 60-minute intervals from state load dispatch centers (SLDC) and verified renewable energy certificates (REC).
            </Text>

            <Text style={styles.sectionHeader}>2. CO₂ Avoided Calculations</Text>
            <Text style={styles.paragraph}>
              CO₂ avoided is calculated against national average baseline emissions of 710 gCO₂/kWh for coal-dominant energy. Solar charging sessions during 10:00 AM - 3:00 PM reflect up to 92% carbon-free energy transfer.
            </Text>
          </View>
        )}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
  },
  tabButtonActive: {
    backgroundColor: colors.primary[500],
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  contentCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.neutral[900],
  },
  lastUpdated: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 4,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 12,
    borderRadius: 10,
    marginVertical: 12,
  },
  highlightText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '600',
    lineHeight: 18,
  },
});
