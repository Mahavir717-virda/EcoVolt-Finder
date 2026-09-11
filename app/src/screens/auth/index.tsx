import React from 'react';
import { PlaceholderScreen } from '../placeholder/PlaceholderScreen';

export const IntroScreen: React.FC = () => (
  <PlaceholderScreen
    title="ecoVolt-finder"
    subtitle="Charge when and where the grid is greenest & cheapest"
  />
);

export const RoleSelectScreen: React.FC = () => (
  <PlaceholderScreen
    title="Choose Your Role"
    subtitle="Driver · Station Manager · Grid Admin"
  />
);

export const LoginScreen: React.FC = () => (
  <PlaceholderScreen
    title="Sign In"
    subtitle="Access your ecoVolt profile & charging history"
  />
);

export const SignupScreen: React.FC = () => (
  <PlaceholderScreen
    title="Create Account"
    subtitle="Join the green charging network"
  />
);

export const VerifyOtpScreen: React.FC = () => (
  <PlaceholderScreen
    title="Verify Code"
    subtitle="Enter OTP sent to your phone/email"
  />
);
