import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuthStore, Role } from '../../features/auth/authStore';
import { loginSchema } from '../../features/auth/validation';
import { colors, radii, spacing } from '../../theme/tokens';
import {
  Text,
  Button,
  Card,
  Input,
  ErrorState,
  Chip,
} from '../../components';

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Login'>>();
  const initialRole: Role = route.params?.role || 'driver';

  const { login, error, clearError } = useAuthStore();

  const [email, setEmail] = useState(
    initialRole === 'manager'
      ? 'ops.manager@ecovolt.app'
      : initialRole === 'admin'
      ? 'grid.admin@ecovolt.app'
      : 'deep.driver@ecovolt.app'
  );
  const [password, setPassword] = useState('password123');
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const handleDemoPreset = (role: Role) => {
    setSelectedRole(role);
    clearError();
    setFieldErrors({});
    if (role === 'driver') {
      setEmail('deep.driver@ecovolt.app');
      setPassword('password123');
    } else if (role === 'manager') {
      setEmail('ops.manager@ecovolt.app');
      setPassword('password123');
    } else {
      setEmail('grid.admin@ecovolt.app');
      setPassword('password123');
    }
  };

  const handleLogin = async () => {
    clearError();
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const formatted = result.error.format();
      setFieldErrors({
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      });
      return;
    }

    setBusy(true);
    const success = await login(email, password, selectedRole);
    setBusy(false);

    // If login succeeds, RootNavigator automatically switches to the role's stack
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoBadgeContainer}>
            <Image
              source={require('../../../assets/images/ecovolt-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text variant="h1" style={styles.title}>
            Sign In to ecoVolt<Text variant="h1" color={colors.brand}>-finder</Text>
          </Text>
          <Text variant="body" color={colors.ink2} style={styles.subtitle}>
            Access your clean energy profile & charging controls
          </Text>
        </View>

        {/* Quick Demo Selector */}
        <Card elevation="e0" padding="sm" style={styles.demoCard}>
          <Text variant="micro" color={colors.ink2} style={styles.demoLabel}>
            QUICK DEMO PROFILES (1-TAP LOGIN)
          </Text>
          <View style={styles.demoButtons}>
            <TouchableOpacity
              onPress={() => handleDemoPreset('driver')}
              style={[styles.demoBtn, selectedRole === 'driver' && styles.demoBtnActive]}
            >
              <Text variant="caption" color={selectedRole === 'driver' ? '#FFFFFF' : colors.ink}>
                Driver
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDemoPreset('manager')}
              style={[styles.demoBtn, selectedRole === 'manager' && styles.demoBtnActive]}
            >
              <Text variant="caption" color={selectedRole === 'manager' ? '#FFFFFF' : colors.ink}>
                Manager
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDemoPreset('admin')}
              style={[styles.demoBtn, selectedRole === 'admin' && styles.demoBtnActive]}
            >
              <Text variant="caption" color={selectedRole === 'admin' ? '#FFFFFF' : colors.ink}>
                Grid Admin
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Auth Error Banner */}
        {error && (
          <ErrorState
            title="Authentication Error"
            message={error}
            fixAction="Retry Sign In"
            onRetry={handleLogin}
          />
        )}

        {/* Form Inputs */}
        <Card elevation="e1" padding="md" style={styles.formCard}>
          <Input
            label="Email or Username"
            placeholder="name@ecovolt.app"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={fieldErrors.email}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
            }}
            secureTextEntry
            error={fieldErrors.password}
          />

          <Button
            label={busy ? 'Signing in…' : 'Sign In'}
            variant="primary"
            busy={busy}
            onPress={handleLogin}
            style={styles.submitBtn}
          />
        </Card>

        {/* Bottom Switch to Sign up */}
        <View style={styles.footer}>
          <Text variant="body" color={colors.ink2}>
            Don't have an account?
          </Text>
          <Button
            label="Create Account"
            variant="ghost"
            onPress={() => navigation.navigate('Signup', { role: selectedRole })}
          />
        </View>
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
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  logoBadgeContainer: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#E7F7EC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1C9B4A25',
    marginBottom: spacing.xs,
  },
  logoImage: {
    width: 44,
    height: 50,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 22,
    textAlign: 'center',
    color: colors.ink,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink2,
    maxWidth: 290,
  },
  demoCard: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.line,
  },
  demoLabel: {
    fontWeight: '700',
  },
  demoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  demoBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  demoBtnActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  formCard: {
    gap: spacing.base,
    backgroundColor: colors.surface,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
