/**
 * useAuth Hook
 * Manages authentication state and provides auth methods for EcoVolt
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { signIn, signUp, signOut, getCurrentProfile } from '@/lib/auth';
import { Profile } from '@/types/database.types';

export interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

export interface Session {
  user: User;
  access_token?: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: { id: 'usr_driver_101', email: 'deep@ecovolt.io' },
    profile: null,
    session: {
      user: { id: 'usr_driver_101', email: 'deep@ecovolt.io' },
      access_token: 'mock_token',
    },
    isLoading: false,
    isAuthenticated: true,
  });

  const fetchProfile = useCallback(async () => {
    try {
      const { data: profile } = await getCurrentProfile();
      setState(prev => ({
        ...prev,
        profile,
        isLoading: false,
        isAuthenticated: true,
      }));
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await signIn(email, password);
    if (result.error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { error: result.error.message };
    }
    await fetchProfile();
    return { error: null };
  }, [fetchProfile]);

  const handleSignUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await signUp(email, password, fullName);
      if (result.error) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { error: result.error.message };
      }
      await fetchProfile();
      return { error: null };
    },
    [fetchProfile]
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    setState({
      user: null,
      profile: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
