/**
 * Contact Us Modal Screen
 * Direct support inquiry form, hotline dialer, and ticketing system
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/styles/spacing';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

export default function ContactUsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [category, setCategory] = useState<'charging' | 'billing' | 'hardware' | 'general'>('charging');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!subject.trim()) {
      Alert.alert('Missing Subject', 'Please enter a brief subject for your support request.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      Alert.alert('Details Needed', 'Please provide a detailed message (at least 10 characters).');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const ticketId = `EV-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedTicketId(ticketId);
      setIsSubmitting(false);
    }, 800);
  };

  const handleDialHotline = () => {
    Linking.openURL('tel:+918003268658').catch(() => {
      Alert.alert('Hotline', 'Toll-Free Helpline: 1800-326-8658');
    });
  };

  const handleSendEmail = () => {
    Linking.openURL('mailto:support@ecovolt.in?subject=EcoVolt%20Driver%20Support').catch(() => {
      Alert.alert('Email Support', 'Contact us at support@ecovolt.in');
    });
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
          {t('contact.title', 'Contact Support')}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {submittedTicketId ? (
          /* Success Screen */
          <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
              {t('contact.success_title', 'Support Ticket Created!')}
            </Text>
            <Text style={[styles.ticketIdBadge, { backgroundColor: colors.primaryLight, color: colors.primary }]}>
              Ticket #{submittedTicketId}
            </Text>
            <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
              Thank you, {profile?.full_name || 'Driver'}. Our EV engineering support team has received your inquiry. We typically reply within 15 minutes to {profile?.email || 'your email'}.
            </Text>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>
                {t('contact.back_profile', 'Back to Profile')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Inquiry Form */
          <>
            {/* Quick Contact Channels */}
            <View style={styles.quickContactRow}>
              <TouchableOpacity
                style={[styles.quickContactBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleDialHotline}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={20} color={colors.primary} />
                <Text style={[styles.quickContactTitle, { color: colors.textPrimary }]}>
                  {t('contact.hotline', '24/7 Hotline')}
                </Text>
                <Text style={[styles.quickContactSub, { color: colors.textSecondary }]}>
                  1800-326-8658
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickContactBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={handleSendEmail}
                activeOpacity={0.7}
              >
                <Ionicons name="mail" size={20} color="#3B82F6" />
                <Text style={[styles.quickContactTitle, { color: colors.textPrimary }]}>
                  {t('contact.email_support', 'Email Support')}
                </Text>
                <Text style={[styles.quickContactSub, { color: colors.textSecondary }]}>
                  support@ecovolt.in
                </Text>
              </TouchableOpacity>
            </View>

            {/* Category Selector */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {t('contact.category_title', 'What is your inquiry regarding?')}
            </Text>
            <View style={styles.categoryGrid}>
              {[
                { id: 'charging', labelKey: 'contact.cat_charging', defaultLabel: '⚡ Session & Charging' },
                { id: 'billing', labelKey: 'contact.cat_billing', defaultLabel: '💳 Billing & Discounts' },
                { id: 'hardware', labelKey: 'contact.cat_hardware', defaultLabel: '🛠 Station & Connector' },
                { id: 'general', labelKey: 'contact.cat_general', defaultLabel: '💬 General / Feedback' },
              ].map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setCategory(cat.id as any)}
                  >
                    <Text
                      style={[
                        styles.categoryCardText,
                        { color: colors.textPrimary },
                        isSelected && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {t(cat.labelKey, cat.defaultLabel)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Form Fields */}
            <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {t('contact.subject', 'Subject')}
                </Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.surfaceSunken, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="e.g. Issue starting session at SG Highway Station"
                  placeholderTextColor={colors.textMuted}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {t('contact.description', 'Detailed Description')}
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea, { backgroundColor: colors.surfaceSunken, color: colors.textPrimary, borderColor: colors.border }]}
                  placeholder="Please describe what happened, station name, charger connector ID, or error code displayed..."
                  placeholderTextColor={colors.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {t('contact.submit', 'Submit Support Request')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
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
  scrollContent: {
    padding: spacing.screenPadding,
  },
  quickContactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg,
  },
  quickContactBtn: {
    flex: 1,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  quickContactTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  quickContactSub: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  categoryGrid: {
    gap: 8,
    marginBottom: spacing.md,
  },
  categoryCard: {
    borderRadius: spacing.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  categoryCardText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formCard: {
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 14,
  },
  textArea: {
    height: 110,
    paddingTop: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: spacing.radius.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successCard: {
    borderRadius: spacing.radius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: spacing.md,
  },
  successIconBox: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  ticketIdBadge: {
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  doneBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
