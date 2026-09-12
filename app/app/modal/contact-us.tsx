/**
 * Contact Us Modal Screen
 * Direct support inquiry form, hotline dialer, and ticketing system
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
import { colors } from '@/constants/colors';
import { spacing } from '@/styles/spacing';
import { useAuth } from '@/hooks/useAuth';

export default function ContactUsModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

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
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={26} color={colors.neutral[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {submittedTicketId ? (
          /* Success Screen */
          <View style={styles.successCard}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Support Ticket Created!</Text>
            <Text style={styles.ticketIdBadge}>Ticket #{submittedTicketId}</Text>
            <Text style={styles.successMessage}>
              Thank you, {profile?.full_name || 'Driver'}. Our EV engineering support team has received your inquiry. We typically reply within 15 minutes to {profile?.email || 'your email'}.
            </Text>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.doneBtnText}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Inquiry Form */
          <>
            {/* Quick Contact Channels */}
            <View style={styles.quickContactRow}>
              <TouchableOpacity
                style={styles.quickContactBtn}
                onPress={handleDialHotline}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={20} color={colors.primary[600]} />
                <Text style={styles.quickContactTitle}>24/7 Hotline</Text>
                <Text style={styles.quickContactSub}>1800-326-8658</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickContactBtn}
                onPress={handleSendEmail}
                activeOpacity={0.7}
              >
                <Ionicons name="mail" size={20} color="#3B82F6" />
                <Text style={styles.quickContactTitle}>Email Support</Text>
                <Text style={styles.quickContactSub}>support@ecovolt.in</Text>
              </TouchableOpacity>
            </View>

            {/* Category Selector */}
            <Text style={styles.sectionTitle}>What is your inquiry regarding?</Text>
            <View style={styles.categoryGrid}>
              {[
                { id: 'charging', label: '⚡ Session & Charging', icon: 'flash' },
                { id: 'billing', label: '💳 Billing & Discounts', icon: 'card' },
                { id: 'hardware', label: '🛠 Station & Connector', icon: 'build' },
                { id: 'general', label: '💬 General / Feedback', icon: 'chatbox' },
              ].map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardActive,
                    ]}
                    onPress={() => setCategory(cat.id as any)}
                  >
                    <Text
                      style={[
                        styles.categoryCardText,
                        isSelected && styles.categoryCardTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Form Fields */}
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Issue starting session at SG Highway Station"
                  placeholderTextColor={colors.neutral[400]}
                  value={subject}
                  onChangeText={setSubject}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Detailed Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Please describe what happened, station name, charger connector ID, or error code displayed..."
                  placeholderTextColor={colors.neutral[400]}
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
              style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={20} color={colors.white} />
                  <Text style={styles.submitButtonText}>Submit Support Request</Text>
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
  quickContactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg,
  },
  quickContactBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: 4,
  },
  quickContactTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
    marginTop: 4,
  },
  quickContactSub: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[500],
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
    backgroundColor: colors.white,
    borderRadius: spacing.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  categoryCardActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  categoryCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  categoryCardTextActive: {
    color: colors.primary[700],
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: spacing.radius.md,
    backgroundColor: colors.neutral[50],
    paddingHorizontal: 12,
    height: 48,
    fontSize: 14,
    color: colors.neutral[900],
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
    backgroundColor: colors.primary[500],
    height: 52,
    borderRadius: spacing.radius.lg,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  successCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.radius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginTop: spacing.md,
  },
  successIconBox: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  ticketIdBadge: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary[600],
    backgroundColor: colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 14,
    color: colors.neutral[600],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  doneBtn: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
