import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../features/auth/authStore';
import { otpSchema } from '../../features/auth/validation';
import { colors, spacing } from '../../theme/tokens';
import {
  Text,
  Button,
  Card,
  Input,
  ErrorState,
  Chip,
} from '../../components';

export const VerifyOtpScreen: React.FC = () => {
  const route = useRoute<RouteProp<AuthStackParamList, 'VerifyOtp'>>();
  const email = route.params?.email || 'user@ecovolt.app';

  const { verifyOtp, setAuthSession, error, clearError } = useAuthStore();

  const [otp, setOtp] = useState('123456');
  const [timer, setTimer] = useState(45);
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | undefined>();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    clearError();
    setFieldError(undefined);

    const result = otpSchema.safeParse({ otp });
    if (!result.success) {
      setFieldError(result.error.format().otp?._errors[0]);
      return;
    }

    setBusy(true);
    await verifyOtp(email, otp);
    setBusy(false);
  };

  const handleResend = () => {
    setTimer(45);
    clearError();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Chip label="Secure Verification" variant="subtle" dotColor={colors.brand} />
          <Text variant="h1" style={styles.title}>
            Verify Account
          </Text>
          <Text variant="body" color={colors.ink2}>
            We've sent a 6-digit confirmation code to{' '}
            <Text variant="bodyMedium" color={colors.ink}>
              {email}
            </Text>
          </Text>
        </View>

        {error && (
          <ErrorState
            title="Verification Error"
            message={error}
            fixAction="Retry Code"
            onRetry={handleVerify}
          />
        )}

        <Card elevation="e1" padding="md" style={styles.card}>
          <Input
            label="6-Digit Verification Code"
            placeholder="123456"
            value={otp}
            onChangeText={(val) => {
              setOtp(val);
              if (fieldError) setFieldError(undefined);
            }}
            keyboardType="number-pad"
            maxLength={6}
            error={fieldError}
            helperText="Enter the 6-digit verification code"
          />

          <Button
            label={busy ? 'Verifying Code…' : 'Verify & Continue'}
            variant="primary"
            busy={busy}
            onPress={handleVerify}
            style={styles.submitBtn}
          />

          <View style={styles.resendRow}>
            {timer > 0 ? (
              <Text variant="caption" color={colors.ink2}>
                Resend code in <Text variant="caption" color={colors.brand} style={{ fontWeight: '700' }}>{timer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity activeOpacity={0.7} onPress={handleResend}>
                <Text variant="caption" color={colors.brand} style={{ fontWeight: '700' }}>
                  Resend Verification Code
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.base,
    gap: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  card: {
    gap: spacing.base,
    backgroundColor: colors.surface,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  resendRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
});
