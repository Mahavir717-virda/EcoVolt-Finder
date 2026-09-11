import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'ecovolt_access_token';
const REFRESH_TOKEN_KEY = 'ecovolt_refresh_token';
const USER_KEY = 'ecovolt_user_data';

export const storage = {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setAccessToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } catch {
      // SecureStore error fallback
    }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async setRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } catch {
      // SecureStore error fallback
    }
  },

  async getUserData<T>(): Promise<T | null> {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setUserData<T>(data: T): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(data));
    } catch {
      // SecureStore error fallback
    }
  },

  async getVehicles<T>(): Promise<T | null> {
    try {
      const raw = await SecureStore.getItemAsync('ecovolt_vehicles_data');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setVehicles<T>(data: T): Promise<void> {
    try {
      await SecureStore.setItemAsync('ecovolt_vehicles_data', JSON.stringify(data));
    } catch {
      // ignore
    }
  },

  async getActiveVehicleId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('ecovolt_active_vehicle_id');
    } catch {
      return null;
    }
  },

  async setActiveVehicleId(id: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('ecovolt_active_vehicle_id', id);
    } catch {
      // ignore
    }
  },

  async clearAll(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync('ecovolt_vehicles_data');
      await SecureStore.deleteItemAsync('ecovolt_active_vehicle_id');
    } catch {
      // ignore
    }
  },
};
