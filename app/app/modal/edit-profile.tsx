/**
 * Edit Profile Modal Screen
 * Allows driver to update their Name, Email, Phone, and EV Preferences with live backend sync.
 * Connected to dynamic Theme & Hindi/English Language.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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

export default function EditProfileModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, updateUserProfile } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialLetter = (fullName || profile?.full_name || 'U').charAt(0).toUpperCase();

  const handleSave = async () => {
    if (!fullName.trim()) {
      setErrorMsg(t('edit_profile.enter_full_name', 'Full name cannot be empty'));
      return;
    }
    if (fullName.trim().length < 2) {
      setErrorMsg('Full name must be at least 2 characters');
      return;
    }
    if (email && !email.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      return;
    }

    setErrorMsg(null);
    setSaving(true);

    try {
      const res = await updateUserProfile({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      });

      if (res.error) {
        setErrorMsg(res.error);
        Alert.alert('Update Failed', res.error);
      } else {
        Alert.alert(
          t('edit_profile.success_title', 'Profile Updated'),
          t('edit_profile.success', 'Your profile details have been successfully saved.'),
          [{ text: t('common.ok', 'OK'), onPress: () => router.back() }]
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          {t('edit_profile.title', 'Edit Profile')}
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveHeaderButton, { backgroundColor: colors.primaryLight }, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveHeaderText, { color: colors.primary }]}>
              {t('edit_profile.save', 'Save')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initialLetter}</Text>
            <View style={[styles.cameraBadge, { backgroundColor: colors.surfaceSunken, borderColor: colors.surface }]}>
              <Ionicons name="camera" size={14} color={colors.textPrimary} />
            </View>
          </View>
          <Text style={[styles.avatarHint, { color: colors.textPrimary }]}>
            {t('profile.verified_driver', 'Verified EcoVolt Driver')}
          </Text>
          <View style={[styles.planBadge, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="leaf" size={13} color={colors.primary} />
            <Text style={[styles.planBadgeText, { color: colors.primary }]}>
              {(profile?.plan_type || 'Green Driver').toUpperCase()} {t('profile.green_tier', 'TIER')}
            </Text>
          </View>
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Input Card */}
        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t('edit_profile.full_name', 'Full Name')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={t('edit_profile.enter_full_name', 'Enter your full name')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t('edit_profile.email_address', 'Email Address')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
              <Ionicons name="mail-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="driver@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {t('edit_profile.phone_number', 'Phone Number')}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
              <Ionicons name="call-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary }]}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Security & Account Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={[styles.infoTitle, { color: colors.primary }]}>
              {t('edit_profile.account_security', 'Account Security')}
            </Text>
          </View>
          <Text style={[styles.infoDesc, { color: colors.textSecondary }]}>
            {t('edit_profile.security_desc', 'Your email is used for booking confirmations and smart solar charging alerts.')}
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, saving && styles.submitButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {t('edit_profile.save_btn', 'Save Profile Changes')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    fontSize: 15,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.screenPadding,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarHint: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
  },
  formCard: {
    borderRadius: spacing.radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    elevation: 2,
    gap: spacing.md,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: spacing.radius.md,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  infoCard: {
    borderRadius: spacing.radius.lg,
    padding: spacing.md,
    marginVertical: spacing.lg,
    borderWidth: 1,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoDesc: {
    fontSize: 12,
    lineHeight: 18,
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
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
