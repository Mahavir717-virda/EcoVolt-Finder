import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'ecovolt_access_token';
const REFRESH_TOKEN_KEY = 'ecovolt_refresh_token';
const USER_KEY = 'ecovolt_user_data';
const VEHICLES_KEY = 'ecovolt_vehicles_data';
const ACTIVE_VEHICLE_KEY = 'ecovolt_active_vehicle_id';

// In-memory cache to guarantee fast access and eliminate SecureStore 2048-byte overflow
let memoryUserData: any = null;
let memoryVehiclesData: any = null;
let memoryActiveVehicleId: string | null = null;

function compactVehicleList(data: any): any {
  if (!Array.isArray(data)) return data;
  return data.map((v: any) => ({
    id: v.id,
    userId: v.userId || v.user_id,
    vehicleClass: v.vehicleClass || v.vehicle_class,
    model: v.model || v.name,
    batteryKwh: v.batteryKwh ?? v.battery_kwh,
    efficiencyWhKm: v.efficiencyWhKm ?? v.efficiency_wh_km,
    connectors: v.connectors || v.connector_types,
    currentChargePct: v.currentChargePct ?? v.current_charge_pct,
  }));
}

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
      if (token && token.length < 2000) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
      }
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
      if (token && token.length < 2000) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
      }
    } catch {
      // SecureStore error fallback
    }
  },

  async getUserData<T>(): Promise<T | null> {
    if (memoryUserData) {
      return memoryUserData as T;
    }
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      if (raw) {
        memoryUserData = JSON.parse(raw);
        return memoryUserData as T;
      }
      return null;
    } catch {
      return null;
    }
  },

  async setUserData<T>(data: T): Promise<void> {
    memoryUserData = data;
    try {
      if (!data) return;
      const str = JSON.stringify(data);
      // Android SecureStore limits SharedPreferences keys to <= 2048 bytes
      if (str.length < 2000) {
        await SecureStore.setItemAsync(USER_KEY, str);
      }
    } catch {
      // SecureStore error fallback
    }
  },

  async getVehicles<T>(): Promise<T | null> {
    if (memoryVehiclesData) {
      return memoryVehiclesData as T;
    }
    try {
      const raw = await SecureStore.getItemAsync(VEHICLES_KEY);
      if (raw) {
        memoryVehiclesData = JSON.parse(raw);
        return memoryVehiclesData as T;
      }
      return null;
    } catch {
      return null;
    }
  },

  async setVehicles<T>(data: T): Promise<void> {
    memoryVehiclesData = data;
    try {
      if (!data) return;
      const compacted = compactVehicleList(data);
      const str = JSON.stringify(compacted);
      // Keep payload under 2000 bytes to strictly satisfy Android SecureStore limit
      if (str.length < 2000) {
        await SecureStore.setItemAsync(VEHICLES_KEY, str);
      }
    } catch {
      // ignore
    }
  },

  async getActiveVehicleId(): Promise<string | null> {
    if (memoryActiveVehicleId) {
      return memoryActiveVehicleId;
    }
    try {
      const id = await SecureStore.getItemAsync(ACTIVE_VEHICLE_KEY);
      if (id) memoryActiveVehicleId = id;
      return id;
    } catch {
      return null;
    }
  },

  async setActiveVehicleId(id: string): Promise<void> {
    memoryActiveVehicleId = id;
    try {
      if (id && id.length < 2000) {
        await SecureStore.setItemAsync(ACTIVE_VEHICLE_KEY, id);
      }
    } catch {
      // ignore
    }
  },

  async clearAll(): Promise<void> {
    memoryUserData = null;
    memoryVehiclesData = null;
    memoryActiveVehicleId = null;
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      await SecureStore.deleteItemAsync(VEHICLES_KEY);
      await SecureStore.deleteItemAsync(ACTIVE_VEHICLE_KEY);
    } catch {
      // ignore
    }
  },
};
