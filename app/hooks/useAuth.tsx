/**
 * useAuth Hook
 * Manages real authentication state via EcoVolt Express API.
 * No hardcoded users — starts unauthenticated and checks token on mount.
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { signIn, signUp, signOut, getCurrentProfile } from '@/lib/auth';
import { getAuthToken } from '@/services/api';
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
    user: null,
    profile: null,
    session: null,
    isLoading: true,    // Start loading so we check token before rendering screens
    isAuthenticated: false,
  });

  /**
   * Check if a token exists and fetch the profile from the server.
   * Called on mount and after sign in / sign up.
   */
  const fetchProfile = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Only try to fetch profile if we have a stored token
      const token = await getAuthToken();
      if (!token) {
        setState({
          user: null,
          profile: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
        });
        return;
      }

      const { data: profile, error } = await getCurrentProfile();

      if (profile && !error) {
        const user: User = {
          id: profile.id,
          email: profile.email,
          user_metadata: { full_name: profile.full_name || undefined },
        };


        setState({
          user,
          profile,
          session: { user, access_token: token },
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        // Token is invalid/expired — clear state
        setState({
          user: null,
          profile: null,
          session: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch {
      setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
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
