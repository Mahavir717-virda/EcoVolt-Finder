import { create } from 'zustand';
import { storage } from '../../lib/storage';

export type Role = 'driver' | 'manager' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  role: Role;
  isAuthenticated: boolean;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: Role) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: 'driver',
  isAuthenticated: false,
  isHydrating: true,

  hydrate: async () => {
    try {
      const token = await storage.getAccessToken();
      const user = await storage.getUserData<User>();

      if (token && user) {
        set({
          user,
          role: user.role,
          isAuthenticated: true,
          isHydrating: false,
        });
        return;
      }
    } catch {
      // hydration fallback
    }
    set({ isHydrating: false });
  },

  setAuth: async (user: User, accessToken: string, refreshToken?: string) => {
    await storage.setAccessToken(accessToken);
    if (refreshToken) {
      await storage.setRefreshToken(refreshToken);
    }
    await storage.setUserData(user);

    set({
      user,
      role: user.role,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await storage.clearAll();
    set({
      user: null,
      role: 'driver',
      isAuthenticated: false,
    });
  },

  setRole: (role: Role) => {
    set({ role });
  },
}));
