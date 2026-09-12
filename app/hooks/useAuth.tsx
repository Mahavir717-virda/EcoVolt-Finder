/**
 * useAuth Hook
 * Manages authentication state and provides auth methods for EcoVolt.
 *
 * State lifecycle:
 *  1. App boot  → isLoading: true, isAuthenticated: false
 *  2. Boot check → reads SecureStore; if token+user found → restore session
 *  3. Sign-in   → call signIn(), store token+user, set full auth state
 *  4. Sign-out  → clear SecureStore, reset state to unauthenticated
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { signIn, signUp, signOut, getCurrentProfile, signInWithGoogle } from '@/lib/auth';
import { getAuthToken, getStoredUser } from '@/services/api';
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
  signInWithGoogle: (options?: { email?: string; name?: string; idToken?: string; photoUrl?: string }) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const UNAUTHENTICATED_STATE: AuthState = {
  user: null,
  profile: null,
  session: null,
  isLoading: false,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Start fully unauthenticated with isLoading:true while we check SecureStore
  const [state, setState] = useState<AuthState>({
    ...UNAUTHENTICATED_STATE,
    isLoading: true,
  });

  /**
   * On boot: try to restore a previously stored session from SecureStore.
   * This handles the "stay logged in" case across app restarts.
   */
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      try {
        const [token, storedUser] = await Promise.all([
          getAuthToken(),
          getStoredUser(),
        ]);

        if (!cancelled) {
          if (token && storedUser) {
            // Valid persisted session → restore it
            const user: User = {
              id: storedUser.id,
              email: storedUser.email,
              user_metadata: { full_name: storedUser.full_name || undefined },
            };
            setState({
              user,
              profile: storedUser as Profile,
              session: { user, access_token: token },
              isLoading: false,
              isAuthenticated: true,
            });
          } else {
            // No stored session → go to login
            setState({ ...UNAUTHENTICATED_STATE });
          }
        }
      } catch {
        if (!cancelled) {
          setState({ ...UNAUTHENTICATED_STATE });
        }
      }
    }
    restoreSession();
    return () => { cancelled = true; };
  }, []);


  const handleSignIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    const result = await signIn(email, password);

    if (result.error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { error: result.error.message };
    }

    // signIn() already stored the token + user in SecureStore (see lib/auth.ts)
    // Now read back what was stored so we have a single source of truth
    try {
      const [token, storedUser] = await Promise.all([
        getAuthToken(),
        getStoredUser(),
      ]);
      const user: User = {
        id: storedUser?.id ?? email,
        email: storedUser?.email ?? email,
        user_metadata: { full_name: storedUser?.full_name },
      };
      setState({
        user,
        profile: storedUser as Profile,
        session: { user, access_token: token ?? undefined },
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }

    return { error: null };
  }, []);

  const handleSignInWithGoogle = useCallback(
    async (options?: {
      email?: string;
      name?: string;
      idToken?: string;
      photoUrl?: string;
    }) => {
      setState(prev => ({ ...prev, isLoading: true }));

      const result = await signInWithGoogle(options);

      if (result.error) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { error: result.error.message };
      }

      try {
        const [token, storedUser] = await Promise.all([
          getAuthToken(),
          getStoredUser(),
        ]);
        const user: User = {
          id: storedUser?.id ?? (options?.email || 'google_user'),
          email: storedUser?.email ?? options?.email,
          user_metadata: { full_name: storedUser?.full_name ?? options?.name },
        };
        setState({
          user,
          profile: storedUser as Profile,
          session: { user, access_token: token ?? undefined },
          isLoading: false,
          isAuthenticated: true,
        });
      } catch {
        setState(prev => ({ ...prev, isLoading: false }));
      }

      return { error: null };
    },
    []
  );

  const handleSignUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      setState(prev => ({ ...prev, isLoading: true }));
      const result = await signUp(email, password, fullName);

      if (result.error) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { error: result.error.message };
      }

      // After sign-up, user needs to verify email (or auto-login depending on flow)
      // Just reset loading — they'll be redirected to login by the signup screen
      setState(prev => ({ ...prev, isLoading: false }));
      return { error: null };
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await signOut(); // clears SecureStore token + user
    setState({ ...UNAUTHENTICATED_STATE });
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { data: profile } = await getCurrentProfile();
      if (profile) {
        setState(prev => ({
          ...prev,
          profile,
          user: prev.user
            ? { ...prev.user, email: profile.email ?? prev.user.email }
            : prev.user,
        }));
      }
    } catch {
      // Silently fail — profile stays as-is
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn: handleSignIn,
        signInWithGoogle: handleSignInWithGoogle,
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
