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
import { signupSchema } from '../../features/auth/validation';
import { colors, spacing } from '../../theme/tokens';
import {
  Text,
  Button,
  Card,
  Input,
  SegmentedControl,
  ErrorState,
} from '../../components';

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Signup'>>();
  const route = useRoute<RouteProp<AuthStackParamList, 'Signup'>>();
  const initialRole: Role = route.params?.role || 'driver';

  const { signup, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(initialRole);
  const [vehicleClass, setVehicleClass] = useState<'car' | 'bike'>('car');
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const handleSignup = async () => {
    clearError();
    setFieldErrors({});

    const result = signupSchema.safeParse({
      name,
      email,
      password,
      role,
      vehicleClass: role === 'driver' ? vehicleClass : undefined,
    });

    if (!result.success) {
      const formatted = result.error.format();
      setFieldErrors({
        name: formatted.name?._errors[0],
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      });
      return;
    }

    setBusy(true);
    // Proceed to OTP verification or register directly
    navigation.navigate('VerifyOtp', { email });
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image
              source={require('../../../assets/images/ecovolt-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <View>
              <Text variant="h2" style={styles.brandTitle}>
                ecoVolt<Text variant="h2" color={colors.brand}>-finder</Text>
              </Text>
              <Text variant="caption" color={colors.ink3}>
                Clean Energy EV Network
              </Text>
            </View>
          </View>
          <Text variant="h1" style={styles.title}>
            Create Account
          </Text>
          <Text variant="body" color={colors.ink2}>
            Join the decentralized green EV charging network.
          </Text>
        </View>

        {error && (
          <ErrorState
            title="Registration Error"
            message={error}
            fixAction="Try Again"
            onRetry={handleSignup}
          />
        )}

        <Card elevation="e1" padding="md" style={styles.formCard}>
          <Input
            label="Full Name"
            placeholder="Deep Pathak"
            value={name}
            onChangeText={(val) => {
              setName(val);
              if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
            }}
            error={fieldErrors.name}
          />

          <Input
            label="Email Address"
            placeholder="deep@example.com"
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
            placeholder="Min 6 characters"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
            }}
            secureTextEntry
            error={fieldErrors.password}
          />

          <View style={styles.section}>
            <Text variant="caption" color={colors.ink2} style={styles.sectionLabel}>
              Account Role
            </Text>
            <SegmentedControl
              options={[
                { label: 'Driver', value: 'driver' },
                { label: 'Manager', value: 'manager' },
                { label: 'Admin', value: 'admin' },
              ]}
              value={role}
              onChange={setRole}
            />
          </View>

          {role === 'driver' && (
            <View style={styles.section}>
              <Text variant="caption" color={colors.ink2} style={styles.sectionLabel}>
                Primary Vehicle Class
              </Text>
              <SegmentedControl
                options={[
                  { label: '4-Wheeler (Car)', value: 'car' },
                  { label: '2-Wheeler (Bike)', value: 'bike' },
                ]}
                value={vehicleClass}
                onChange={setVehicleClass}
              />
            </View>
          )}

          <Button
            label={busy ? 'Creating Account…' : 'Continue to Verification'}
            variant="primary"
            busy={busy}
            onPress={handleSignup}
            style={styles.submitBtn}
          />
        </Card>

        <View style={styles.footer}>
          <Text variant="body" color={colors.ink2}>
            Already have an account?
          </Text>
          <Button
            label="Sign In"
            variant="ghost"
            onPress={() => navigation.navigate('Login', { role })}
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
    gap: spacing.xs,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
    paddingBottom: spacing.xs,
  },
  logoImage: {
    width: 48,
    height: 55,
  },
  brandTitle: {
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  formCard: {
    gap: spacing.base,
    backgroundColor: colors.surface,
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontWeight: '600',
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
