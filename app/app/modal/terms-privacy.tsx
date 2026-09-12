/**
 * Terms & Privacy Policy Modal Screen
 * Legal Terms of Service, User Privacy Policy, Location Data Rights & Green Energy Certification SLA
 * Connected to dynamic Theme & Hindi/English Language.
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
import { spacing } from '@/styles/spacing';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

type LegalTab = 'terms' | 'privacy' | 'green_sla';

export default function TermsPrivacyModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<LegalTab>('terms');

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
          {t('support.terms_privacy', 'Terms & Privacy')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[
          { id: 'terms', label: language === 'hi' ? 'सेवा की शर्तें' : 'Terms of Service' },
          { id: 'privacy', label: language === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy' },
          { id: 'green_sla', label: language === 'hi' ? '🌱 हरित SLA' : '🌱 Green SLA' },
        ].map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                { backgroundColor: colors.surfaceSunken },
                isSelected && { backgroundColor: colors.primary },
              ]}
              onPress={() => setActiveTab(tab.id as LegalTab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  isSelected && { color: '#FFFFFF', fontWeight: '700' },
                ]}
              >
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
          <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.docTitle, { color: colors.textPrimary }]}>
              {language === 'hi' ? 'इकोवोल्ट सेवा की शर्तें' : 'EcoVolt Finder Terms of Service'}
            </Text>
            <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
              Effective Date: September 2026 · Version 1.4
            </Text>

            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
              1. {language === 'hi' ? 'ईवी चार्जिंग और स्लॉट आरक्षण' : 'EV Charging & Slot Reservations'}
            </Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              {language === 'hi'
                ? 'इकोवोल्ट फाइंडर पर आरक्षण करने पर, आप निर्दिष्ट कनेक्टर, चार्जिंग गति और डायनेमिक हरित दर के लिए अनुबंध में प्रवेश करते हैं। निर्धारित समय से 15 मिनट की ग्रेस अवधि प्रदान की जाती है।'
                : 'By placing a reservation on EcoVolt Finder, you enter into a smart contract lock for the specified connector, charging speed, and dynamic green tariff. A grace period of 15 minutes is provided after your start window before the slot may be reallocated.'}
            </Text>

            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
              2. {language === 'hi' ? 'डायनेमिक मूल्य निर्धारण और ग्रीन विंडोज' : 'Dynamic Pricing & Green Windows'}
            </Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              {language === 'hi'
                ? 'प्रदर्शित बिजली दरें राज्य डिस्कॉम टैरिफ (GUVNL, टोरेंट पावर, BESCOM) और वास्तविक समय के नवीकरणीय ऊर्जा बोनस से जुड़ी हैं।'
                : 'Electricity rates displayed are tied directly to state power discom tariffs (GUVNL, Torrent Power, BESCOM, MSEDCL) combined with real-time renewable grid bonuses. The locked price at checkout is guaranteed throughout your active charging session.'}
            </Text>

            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
              3. {language === 'hi' ? 'रद्द करना और रिफंड' : 'Cancellation and Refunds'}
            </Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              {language === 'hi'
                ? 'सत्र शुरू होने से 15 मिनट पहले तक निःशुल्क रद्दीकरण की अनुमति है। स्टेशन विफलता की स्थिति में वॉलेट में 100% रिफंड तुरंत जमा किया जाता है।'
                : 'Free cancellations are permitted up to 15 minutes prior to session onset. In the rare event of station hardware failure or power outage, 100% of wallet funds are auto-refunded instantly.'}
            </Text>
          </View>
        )}

        {activeTab === 'privacy' && (
          <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.docTitle, { color: colors.textPrimary }]}>
              {language === 'hi' ? 'गोपनीयता और डेटा सुरक्षा नीति' : 'Privacy & Data Protection Policy'}
            </Text>
            <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
              Effective Date: September 2026 · Version 1.4
            </Text>

            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
              1. {language === 'hi' ? 'हम कौन सी जानकारी एकत्र करते हैं' : 'Information We Collect'}
            </Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              {language === 'hi'
                ? 'हम आपके वाहन का मॉडल, बैटरी क्षमता (kWh), और जीपीएस लोकेशन एकत्र करते हैं ताकि आपको सबसे उपयुक्त और नजदीकी चार्जिंग स्टेशन मिल सके।'
                : 'We collect your vehicle model, battery capacity (kWh), connector types, and live GPS coordinates strictly for routing you to compatible, high-efficiency charging stations within your real range.'}
            </Text>

            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
              2. {language === 'hi' ? 'स्थान डेटा का उपयोग' : 'Location Data Usage'}
            </Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              {language === 'hi'
                ? 'नेविगेशन और पास के सोलर विंडो अलर्ट के लिए ही बैकग्राउंड जीपीएस का उपयोग किया जाता है। हम किसी तीसरे पक्ष के साथ डेटा साझा नहीं करते।'
                : 'Background GPS location is used only when active turn-by-turn navigation or nearby solar window proximity alerts are enabled. We do not sell or share individual driver telematics with third-party advertising networks.'}
            </Text>
          </View>
        )}

        {activeTab === 'green_sla' && (
          <View style={[styles.contentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.docTitle, { color: colors.textPrimary }]}>
              {language === 'hi' ? 'नवीकरणीय ऊर्जा और कार्बन ऑफसेट SLA' : 'Renewable Energy & Carbon Offset SLA'}
            </Text>
            <Text style={[styles.lastUpdated, { color: colors.textSecondary }]}>
              Standard: Clean Energy Grid Accord 2026
            </Text>

            <View style={[styles.highlightBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Ionicons name="leaf" size={20} color={colors.primary} />
              <Text style={[styles.highlightText, { color: colors.primary }]}>
                {language === 'hi'
                  ? 'इकोवोल्ट भारतीय ग्रिड क्षेत्रों में सौर और पवन ऊर्जा उत्पादन के 100% सत्यापन की गारंटी देता है।'
                  : 'EcoVolt guarantees 100% verifiable data sourcing for solar and wind energy generation metrics across Indian grid zones.'}
              </Text>
            </View>

            <Text style={[styles.sectionHeader, { color: colors.textPrimary }]}>
              1. {language === 'hi' ? 'ग्रिड ज़ोन पूर्वानुमान सटीकता' : 'Grid Zone Forecast Accuracy'}
            </Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
              {language === 'hi'
                ? 'नवीकरणीय ऊर्जा प्रतिशत और कार्बन तीव्रता SLDC से हर 60 मिनट में अपडेट की जाती है।'
                : 'Renewable energy percentages and carbon intensity (gCO₂/kWh) are updated at 60-minute intervals from state load dispatch centers (SLDC) and verified renewable energy certificates (REC).'}
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  contentCard: {
    borderRadius: spacing.radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  lastUpdated: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginVertical: 12,
  },
  highlightText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
});
