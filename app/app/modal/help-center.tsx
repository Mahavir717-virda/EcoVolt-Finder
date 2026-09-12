/**
 * Help Center Modal Screen
 * Searchable EV FAQs, Connector Guides, Dynamic Pricing Explanations & Quick Troubleshooting
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { spacing } from '@/styles/spacing';

interface FAQItem {
  id: string;
  category: 'green' | 'connectors' | 'billing' | 'troubleshooting';
  question: string;
  answer: string;
}

export default function HelpCenterModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('1');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqs: FAQItem[] = [
    {
      id: '1',
      category: 'green',
      question: 'How do Green Window dynamic discounts work?',
      answer:
        'Our smart algorithm tracks real-time generation from Gujarat and Western state solar & wind farms. When renewable energy exceeds 60% of grid supply, charging stations offer discounts up to ₹3.50/kWh to reward clean charging.',
    },
    {
      id: '2',
      category: 'connectors',
      question: 'Which connector does my vehicle support?',
      answer:
        'Most modern 4W EVs (Tata Nexon, MG ZS, Hyundai Ioniq, BYD) support CCS2 for fast DC charging and Type 2 for AC home/slow charging. 2-Wheelers (Ather, Ola) typically use Bharat AC/DC 001 or standard 3-pin plugs.',
    },
    {
      id: '3',
      category: 'billing',
      question: 'Can I cancel my reserved slot without fees?',
      answer:
        'Yes! You can cancel any reservation free of charge up to 15 minutes before the start time. Cancellations inside the 15-minute window or no-shows incur a small slot holding fee to keep stations fair for all drivers.',
    },
    {
      id: '4',
      category: 'troubleshooting',
      question: 'What should I do if the charging gun is locked to my car?',
      answer:
        '1. Ensure the session is officially stopped in the EcoVolt app.\n2. Unlock your EV using your key fob 2-3 times to release the vehicle connector latch.\n3. If still stuck, use the manual emergency latch release cord under your car trunk or call 24/7 hotline.',
    },
    {
      id: '5',
      category: 'green',
      question: 'How is my Green Score & CO₂ avoided calculated?',
      answer:
        'We compare your charging session kWh against the carbon intensity of standard fossil thermal grid power (approx 710 gCO₂/kWh). Renewable energy charged during high solar hours earns bonus points for the EcoVolt Leaderboard.',
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCat = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCallEmergency = () => {
    Alert.alert(
      '24/7 Roadside Assistance',
      'Connect directly with EcoVolt Emergency EV Rescue Hotline (+91 800-326-8658)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => Linking.openURL('tel:+918003268658').catch(() => {}),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={26} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center & FAQ</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs, charging tips, errors..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Quick Emergency Assistance Banner */}
        <TouchableOpacity
          style={styles.emergencyCard}
          onPress={handleCallEmergency}
          activeOpacity={0.85}
        >
          <View style={styles.emergencyLeft}>
            <View style={styles.emergencyIcon}>
              <Ionicons name="call" size={20} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>24/7 Roadside & Charger Support</Text>
              <Text style={styles.emergencySubtitle}>Instant assistance for gun lock or station errors</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#DC2626" />
        </TouchableOpacity>

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'green', label: '🌱 Green Pricing' },
            { id: 'connectors', label: '🔌 Connectors' },
            { id: 'billing', label: '💳 Billing' },
            { id: 'troubleshooting', label: '🛠 Troubleshooting' },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ List */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqList}>
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            return (
              <View key={faq.id} style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() => setExpandedId(isExpanded ? null : faq.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.faqQuestionText}>{faq.question}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.neutral[500]}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.faqAnswerContainer}>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Still need help CTA */}
        <View style={styles.contactCtaCard}>
          <Ionicons name="chatbubbles-outline" size={28} color={colors.primary[600]} />
          <Text style={styles.contactCtaTitle}>Still have questions?</Text>
          <Text style={styles.contactCtaDesc}>
            Our team is available 24/7 to help you with reservations, charger troubleshooting, and rebates.
          </Text>
          <TouchableOpacity
            style={styles.contactCtaBtn}
            onPress={() => {
              router.back();
              setTimeout(() => router.push('/modal/contact-us'), 200);
            }}
          >
            <Text style={styles.contactCtaBtnText}>Send Us a Message</Text>
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
  scrollContent: {
    padding: spacing.screenPadding,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[900],
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: spacing.md,
  },
  emergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emergencyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
  },
  emergencySubtitle: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  categoryChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  categoryChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  faqList: {
    gap: 10,
    marginBottom: spacing.lg,
  },
  faqCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral[900],
    marginRight: 10,
  },
  faqAnswerContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingTop: 10,
  },
  faqAnswerText: {
    fontSize: 13,
    color: colors.neutral[600],
    lineHeight: 20,
  },
  contactCtaCard: {
    backgroundColor: colors.primary[50],
    borderRadius: spacing.radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[100],
    gap: 8,
  },
  contactCtaTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary[900],
  },
  contactCtaDesc: {
    fontSize: 13,
    color: colors.primary[700],
    textAlign: 'center',
    lineHeight: 18,
  },
  contactCtaBtn: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  contactCtaBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
});
