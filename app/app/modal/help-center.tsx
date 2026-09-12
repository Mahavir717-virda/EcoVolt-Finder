/**
 * Help Center Modal Screen
 * Searchable EV FAQs, Connector Guides, Dynamic Pricing Explanations & Quick Troubleshooting
 * Connected to dynamic Theme & Hindi/English Language.
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
import { spacing } from '@/styles/spacing';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

interface FAQItem {
  id: string;
  category: 'green' | 'connectors' | 'billing' | 'troubleshooting';
  questionEn: string;
  questionHi: string;
  answerEn: string;
  answerHi: string;
}

export default function HelpCenterModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('1');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqs: FAQItem[] = [
    {
      id: '1',
      category: 'green',
      questionEn: 'How do Green Window dynamic discounts work?',
      questionHi: 'ग्रीन विंडो डायनेमिक छूट कैसे काम करती है?',
      answerEn:
        'Our smart algorithm tracks real-time generation from state solar & wind farms. When renewable energy exceeds 60% of grid supply, charging stations offer discounts up to ₹3.50/kWh to reward clean charging.',
      answerHi:
        'हमारा स्मार्ट एल्गोरिदम राज्य के सौर और पवन ऊर्जा उत्पादन को लाइव ट्रैक करता है। जब नवीकरणीय ऊर्जा ग्रिड आपूर्ति के 60% से अधिक होती है, तो स्वच्छ चार्जिंग को प्रोत्साहित करने के लिए ₹3.50/kWh तक की छूट मिलती है।',
    },
    {
      id: '2',
      category: 'connectors',
      questionEn: 'Which connector does my vehicle support?',
      questionHi: 'मेरा वाहन कौन सा कनेक्टर सपोर्ट करता है?',
      answerEn:
        'Most modern 4W EVs (Tata Nexon, MG ZS, Hyundai Ioniq, BYD) support CCS2 for fast DC charging and Type 2 for AC home/slow charging. 2-Wheelers (Ather, Ola) typically use Bharat AC/DC 001 or standard 3-pin plugs.',
      answerHi:
        'अधिकांश आधुनिक 4-व्हीलर ईवी (टाटा नेक्सॉन, एमजी जेडएस, हुंडई आयोनिक) फास्ट डीसी चार्जिंग के लिए CCS2 और एसी के लिए Type 2 का उपयोग करते हैं। 2-व्हीलर (एथर, ओला) भारत AC/DC 001 या 3-पिन प्लग का उपयोग करते हैं।',
    },
    {
      id: '3',
      category: 'billing',
      questionEn: 'Can I cancel my reserved slot without fees?',
      questionHi: 'क्या मैं बिना किसी शुल्क के आरक्षित स्लॉट रद्द कर सकता हूँ?',
      answerEn:
        'Yes! You can cancel any reservation free of charge up to 15 minutes before the start time. Cancellations inside the 15-minute window or no-shows incur a small slot holding fee to keep stations fair for all drivers.',
      answerHi:
        'हाँ! आप शुरू होने से 15 मिनट पहले तक किसी भी बुकिंग को बिना किसी शुल्क के रद्द कर सकते हैं। 15 मिनट से कम समय में रद्द करने पर न्यूनतम स्लॉट शुल्क लग सकता है।',
    },
    {
      id: '4',
      category: 'troubleshooting',
      questionEn: 'What should I do if the charging gun is locked to my car?',
      questionHi: 'यदि चार्जिंग गन कार में लॉक हो जाए तो क्या करें?',
      answerEn:
        '1. Ensure the session is officially stopped in the EcoVolt app.\n2. Unlock your EV using your key fob 2-3 times to release the vehicle connector latch.\n3. If still stuck, use the manual emergency latch release cord under your car trunk or call 24/7 hotline.',
      answerHi:
        '1. सुनिश्चित करें कि इकोवोल्ट ऐप में चार्जिंग सत्र बंद कर दिया गया है।\n2. वाहन के कनेक्टर लैच को खोलने के लिए अपनी कार की चाबी से 2-3 बार अनलॉक करें।\n3. यदि फिर भी अटका हो, तो आपातकालीन लैच का उपयोग करें या हेल्पलाइन पर कॉल करें।',
    },
    {
      id: '5',
      category: 'green',
      questionEn: 'How is my Green Score & CO₂ avoided calculated?',
      questionHi: 'मेरा ग्रीन स्कोर और CO₂ बचत की गणना कैसे की जाती है?',
      answerEn:
        'We compare your charging session kWh against the carbon intensity of standard fossil thermal grid power (approx 710 gCO₂/kWh). Renewable energy charged during high solar hours earns bonus points for the EcoVolt Leaderboard.',
      answerHi:
        'हम आपके चार्जिंग सत्र के kWh की तुलना थर्मल ग्रिड पावर (लगभग 710 gCO₂/kWh) से करते हैं। पीक सोलर घंटों में चार्ज करने पर लीडरबोर्ड के लिए अतिरिक्त अंक मिलते हैं।',
    },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const q = language === 'hi' ? faq.questionHi : faq.questionEn;
    const a = language === 'hi' ? faq.answerHi : faq.answerEn;
    const matchesCat = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCallEmergency = () => {
    Alert.alert(
      t('help.roadside', '24/7 Roadside Assistance'),
      'Connect to Helpline (+91 800-326-8658)?',
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('common.ok', 'Call Now'),
          onPress: () => Linking.openURL('tel:+918003268658').catch(() => {}),
        },
      ]
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
          {t('help.title', 'Help Center & FAQ')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder={t('help.search_placeholder', 'Search FAQs, charging tips, errors...')}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
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
              <Text style={styles.emergencyTitle}>
                {t('help.roadside', '24/7 Roadside & Charger Support')}
              </Text>
              <Text style={styles.emergencySubtitle}>
                {t('help.roadside_sub', 'Instant assistance for gun lock or station errors')}
              </Text>
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
            { id: 'all', label: t('help.all_topics', 'All Topics') },
            { id: 'green', label: t('help.green_pricing', '🌱 Green Pricing') },
            { id: 'connectors', label: t('help.connectors', '🔌 Connectors') },
            { id: 'billing', label: t('help.billing', '💳 Billing') },
            { id: 'troubleshooting', label: t('help.troubleshooting', '🛠 Troubleshooting') },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                selectedCategory === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  { color: colors.textPrimary },
                  selectedCategory === cat.id && { color: '#FFFFFF', fontWeight: '700' },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ List */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {t('help.faq_title', 'Frequently Asked Questions')}
        </Text>
        <View style={styles.faqList}>
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedId === faq.id;
            const question = language === 'hi' ? faq.questionHi : faq.questionEn;
            const answer = language === 'hi' ? faq.answerHi : faq.answerEn;
            return (
              <View key={faq.id} style={[styles.faqCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.faqQuestionRow}
                  onPress={() => setExpandedId(isExpanded ? null : faq.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.faqQuestionText, { color: colors.textPrimary }]}>{question}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={[styles.faqAnswerContainer, { borderTopColor: colors.borderLight }]}>
                    <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>{answer}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Still need help CTA */}
        <View style={[styles.contactCtaCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Ionicons name="chatbubbles-outline" size={28} color={colors.primary} />
          <Text style={[styles.contactCtaTitle, { color: colors.primary }]}>
            {t('help.still_questions', 'Still have questions?')}
          </Text>
          <Text style={[styles.contactCtaDesc, { color: colors.textSecondary }]}>
            {t('help.still_questions_desc', 'Our team is available 24/7 to help you with reservations, charger troubleshooting, and rebates.')}
          </Text>
          <TouchableOpacity
            style={[styles.contactCtaBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              router.back();
              setTimeout(() => router.push('/modal/contact-us'), 200);
            }}
          >
            <Text style={styles.contactCtaBtnText}>
              {t('help.send_message', 'Send Us a Message')}
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
  scrollContent: {
    padding: spacing.screenPadding,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.radius.lg,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
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
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
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
    borderRadius: spacing.radius.lg,
    borderWidth: 1,
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
    marginRight: 10,
  },
  faqAnswerContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 20,
  },
  contactCtaCard: {
    borderRadius: spacing.radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    gap: 8,
  },
  contactCtaTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  contactCtaDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  contactCtaBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  contactCtaBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
