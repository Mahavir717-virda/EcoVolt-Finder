import { create } from 'zustand';
import { storage } from '../../lib/storage';
import { http } from '../../api/http';
import { ENV } from '../../api/config';

export type Role = 'driver' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone?: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  role: Role;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  login: (email: string, pass: string, targetRole?: Role) => Promise<boolean>;
  signup: (name: string, email: string, pass: string, targetRole: Role, vehicleClass?: 'car' | 'bike') => Promise<boolean>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  setRole: (role: Role) => void;
  setAuthSession: (user: User, accessToken: string, refreshToken?: string) => Promise<void>;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: 'driver',
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isHydrating: true,
  error: null,

  hydrate: async () => {
    try {
      const accessToken = await storage.getAccessToken();
      const refreshToken = await storage.getRefreshToken();
      const user = await storage.getUserData<User>();

      if (accessToken && user) {
        set({
          user,
          role: user.role,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isHydrating: false,
          error: null,
        });
        return;
      }
    } catch {
      // hydration error fallback
    }
    set({ isHydrating: false });
  },

  login: async (email: string, pass: string, targetRole?: Role) => {
    set({ error: null });
    try {
      let authData: AuthResponse;

      if (ENV.USE_MOCKS) {
        const assignedRole = targetRole || (email.includes('manager') ? 'manager' : email.includes('admin') ? 'admin' : 'driver');
        authData = {
          user: {
            id: `usr_${assignedRole}_101`,
            email: email || `${assignedRole}@ecovolt.app`,
            name: assignedRole === 'driver' ? 'Deep Pathak' : assignedRole === 'manager' ? 'Station Ops Ahmedabad' : 'Gujarat Grid Admin',
            role: assignedRole,
            phone: '+919876543210',
            createdAt: new Date().toISOString(),
          },
          accessToken: `mock_jwt_access_${assignedRole}_${Date.now()}`,
          refreshToken: `mock_jwt_refresh_${assignedRole}_${Date.now()}`,
        };
      } else {
        authData = await http.post<AuthResponse>('/auth/login', {
          email,
          password: pass,
        }, { skipAuth: true });
      }

      await get().setAuthSession(authData.user, authData.accessToken, authData.refreshToken);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please check your email and password.';
      set({ error: message });
      return false;
    }
  },

  signup: async (name: string, email: string, pass: string, targetRole: Role, vehicleClass?: 'car' | 'bike') => {
    set({ error: null });
    try {
      let authData: AuthResponse;

      if (ENV.USE_MOCKS) {
        authData = {
          user: {
            id: `usr_${targetRole}_${Date.now()}`,
            email,
            name,
            role: targetRole,
            phone: '+919876543210',
            createdAt: new Date().toISOString(),
          },
          accessToken: `mock_jwt_access_${targetRole}_${Date.now()}`,
          refreshToken: `mock_jwt_refresh_${targetRole}_${Date.now()}`,
        };
      } else {
        authData = await http.post<AuthResponse>('/auth/signup', {
          name,
          email,
          password: pass,
          role: targetRole,
          vehicleClass,
        }, { skipAuth: true });
      }

      await get().setAuthSession(authData.user, authData.accessToken, authData.refreshToken);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      set({ error: message });
      return false;
    }
  },

  verifyOtp: async (email: string, otp: string) => {
    set({ error: null });
    try {
      if (ENV.USE_MOCKS) {
        if (otp.length !== 6) {
          set({ error: 'Please enter a 6-digit OTP.' });
          return false;
        }
        return true;
      }

      await http.post('/auth/verify-otp', { email, otp }, { skipAuth: true });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid OTP code. Please check and retry.';
      set({ error: message });
      return false;
    }
  },

  setAuthSession: async (user: User, accessToken: string, refreshToken?: string) => {
    await storage.setAccessToken(accessToken);
    if (refreshToken) {
      await storage.setRefreshToken(refreshToken);
    }
    await storage.setUserData(user);

    set({
      user,
      role: user.role,
      accessToken,
      refreshToken: refreshToken || null,
      isAuthenticated: true,
      error: null,
    });
  },

  setAuth: async (user: User, accessToken: string, refreshToken?: string) => {
    await get().setAuthSession(user, accessToken, refreshToken);
  },

  logout: async () => {
    await storage.clearAll();
    set({
      user: null,
      role: 'driver',
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),

  setRole: (role: Role) => set({ role }),
}));
