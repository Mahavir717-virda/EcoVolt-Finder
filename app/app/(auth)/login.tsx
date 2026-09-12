/**
 * Login Screen
 * With smooth entrance animations using React Native Reanimated
 */

import { FadeIn, ScaleIn, SlideIn } from '@/components/animations';
import { Button, Input } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { spacing } from '@/styles/spacing';
import { isValidEmail } from '@/utils/validators';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);

    if (error) {
      Alert.alert('Google Sign-In Failed', error);
    } else {
      router.replace('/(tabs)');
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
          {/* Header with Scale Animation */}
          <ScaleIn delay={100} duration={500}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="flash" size={48} color={colors.primary[500]} />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue to VoltSpot</Text>
            </View>
          </ScaleIn>

          {/* Form with Slide Animation */}
          <SlideIn direction="bottom" delay={300} duration={500}>
            <View style={styles.form}>
              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="mail-outline"
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                secureTextEntry
                leftIcon="lock-closed-outline"
              />

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                fullWidth
                size="lg"
              />
            </View>
          </SlideIn>

          {/* Divider with Fade Animation */}
          <FadeIn delay={500}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
          </FadeIn>

          {/* Social Login with Staggered Fade */}
          <FadeIn delay={600}>
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleLogin}
              disabled={googleLoading || loading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.primary[500]} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </FadeIn>

          {/* Sign Up Link with Fade */}
          <FadeIn delay={700}>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.signUpLink}>Sign Up</Text>
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
    paddingTop: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.neutral[500],
  },
  form: {
    marginBottom: spacing.lg,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: 14,
    color: colors.neutral[400],
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: spacing.radius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: 16,
    color: colors.neutral[500],
  },
  signUpLink: {
    fontSize: 16,
    color: colors.primary[500],
    fontWeight: '600',
  },
});
