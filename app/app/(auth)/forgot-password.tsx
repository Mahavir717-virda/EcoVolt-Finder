/**
 * Forgot Password Screen
 * 3-Step interactive flow:
 * Step 1: Email entry & OTP request
 * Step 2: 6-Digit OTP verification with resend timer
 * Step 3: Set new password & confirm
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components/ui';
import { colors } from '@/constants/colors';
import { spacing } from '@/styles/spacing';
import { FadeIn, ScaleIn, SlideIn } from '@/components/animations';
import { isValidEmail } from '@/utils/validators';
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} from '@/lib/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Current Step: 1 = Enter Email, 2 = Enter OTP, 3 = New Password
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  // UI State
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [errors, setErrors] = useState<{
    email?: string;
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendTimer]);

  // Step 1: Request OTP
  const handleRequestOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrors({ email: 'Email address is required' });
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setErrors({});
    setLoading(true);

    const { data, error } = await requestPasswordResetOtp(trimmedEmail);
    setLoading(false);

    if (error) {
      Alert.alert('Request Failed', error.message);
    } else {
      setResendTimer(60);
      setStep(2);
      Alert.alert(
        'OTP Sent!',
        data?.message || 'Check your inbox for the 6-digit reset code.'
      );
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || loading) return;
    setLoading(true);
    const { data, error } = await requestPasswordResetOtp(email.trim().toLowerCase());
    setLoading(false);

    if (error) {
      Alert.alert('Resend Failed', error.message);
    } else {
      setResendTimer(60);
      Alert.alert('OTP Resent', data?.message || 'A new 6-digit code has been sent.');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (!trimmedOtp) {
      setErrors({ otp: 'OTP code is required' });
      return;
    }
    if (trimmedOtp.length !== 6) {
      setErrors({ otp: 'OTP must be exactly 6 digits' });
      return;
    }

    setErrors({});
    setLoading(true);

    const { data, error } = await verifyPasswordResetOtp(
      email.trim().toLowerCase(),
      trimmedOtp
    );
    setLoading(false);

    if (error) {
      Alert.alert('Verification Failed', error.message);
    } else if (data?.resetToken) {
      setResetToken(data.resetToken);
      setStep(3);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    const newErr: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      newErr.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      newErr.newPassword = 'Password must be at least 8 characters long';
    }

    if (newPassword !== confirmPassword) {
      newErr.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErr).length > 0) {
      setErrors(newErr);
      return;
    }

    setErrors({});
    setLoading(true);

    const { data, error } = await resetPassword(resetToken, newPassword);
    setLoading(false);

    if (error) {
      Alert.alert('Reset Failed', error.message);
    } else {
      Alert.alert(
        'Password Reset Successful!',
        data?.message || 'Your password has been reset. Please log in with your new credentials.',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (step > 1) {
                  setStep((step - 1) as 1 | 2);
                } else {
                  router.back();
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.neutral[800]} />
            </TouchableOpacity>

            {/* Step Indicators */}
            <View style={styles.stepIndicatorContainer}>
              <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
              <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
              <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
              <View style={[styles.stepLine, step >= 3 && styles.stepLineActive]} />
              <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
            </View>
          </View>

          {/* Step 1 UI */}
          {step === 1 && (
            <SlideIn direction="right" delay={100} duration={400}>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="key-outline" size={40} color={colors.primary[500]} />
                </View>
                <Text style={styles.title}>Forgot Password?</Text>
                <Text style={styles.subtitle}>
                  Enter your registered email address and we'll send you a 6-digit OTP code.
                </Text>
              </View>

              <View style={styles.form}>
                <Input
                  label="Email Address"
                  placeholder="name@example.com"
                  value={email}
                  onChangeText={setEmail}
                  error={errors.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  leftIcon="mail-outline"
                />

                <Button
                  title="Send Verification Code"
                  onPress={handleRequestOtp}
                  loading={loading}
                  fullWidth
                  size="lg"
                  style={styles.actionBtn}
                />
              </View>
            </SlideIn>
          )}

          {/* Step 2 UI */}
          {step === 2 && (
            <SlideIn direction="right" delay={100} duration={400}>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="shield-checkmark-outline" size={40} color={colors.primary[500]} />
                </View>
                <Text style={styles.title}>Enter OTP Code</Text>
                <Text style={styles.subtitle}>
                  We sent a 6-digit code to{' '}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
              </View>

              <View style={styles.form}>
                <Input
                  label="6-Digit OTP Code"
                  placeholder="123456"
                  value={otp}
                  onChangeText={setOtp}
                  error={errors.otp}
                  keyboardType="number-pad"
                  maxLength={6}
                  leftIcon="lock-closed-outline"
                />

                <Button
                  title="Verify OTP Code"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  fullWidth
                  size="lg"
                  style={styles.actionBtn}
                />

                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>Didn't receive code? </Text>
                  {resendTimer > 0 ? (
                    <Text style={styles.timerText}>Resend in {resendTimer}s</Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                      <Text style={styles.resendLink}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </SlideIn>
          )}

          {/* Step 3 UI */}
          {step === 3 && (
            <SlideIn direction="right" delay={100} duration={400}>
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Ionicons name="lock-open-outline" size={40} color={colors.primary[500]} />
                </View>
                <Text style={styles.title}>Set New Password</Text>
                <Text style={styles.subtitle}>
                  Create a new secure password for your EcoVolt account.
                </Text>
              </View>

              <View style={styles.form}>
                <Input
                  label="New Password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  error={errors.newPassword}
                  secureTextEntry
                  leftIcon="lock-closed-outline"
                />

                <Input
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={errors.confirmPassword}
                  secureTextEntry
                  leftIcon="shield-checkmark-outline"
                />

                <Button
                  title="Reset Password"
                  onPress={handleResetPassword}
                  loading={loading}
                  fullWidth
                  size="lg"
                  style={styles.actionBtn}
                />
              </View>
            </SlideIn>
          )}

          {/* Footer Back to Sign In */}
          <FadeIn delay={400}>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Remember your password? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.signInLink}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.screenPadding,
    paddingTop: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutral[300],
  },
  stepDotActive: {
    backgroundColor: colors.primary[500],
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: colors.neutral[200],
  },
  stepLineActive: {
    backgroundColor: colors.primary[500],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  emailHighlight: {
    fontWeight: '600',
    color: colors.neutral[900],
  },
  form: {
    marginBottom: spacing.lg,
  },
  actionBtn: {
    marginTop: spacing.md,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  timerText: {
    fontSize: 14,
    color: colors.neutral[400],
    fontWeight: '500',
  },
  resendLink: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: 15,
    color: colors.neutral[500],
  },
  signInLink: {
    fontSize: 15,
    color: colors.primary[500],
    fontWeight: '600',
  },
});
