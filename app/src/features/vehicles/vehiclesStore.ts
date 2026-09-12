import { create } from 'zustand';
import { Vehicle } from '@contracts/types';
import { ConnectorType, VehicleClass } from '@contracts/enums';
import { storage } from '../../lib/storage';
import { VehicleFormData } from './types';
import { http } from '../../api/http';


export function normalizeVehicle(raw: any): Vehicle {
  if (!raw) {
    return {
      id: '',
      userId: '',
      vehicleClass: VehicleClass.CAR,
      model: 'Electric Vehicle',
      batteryKwh: 40.5,
      efficiencyWhKm: 140,
      connectors: [ConnectorType.CCS2, ConnectorType.TYPE2_AC],
      currentChargePct: 50,
    };
  }

  const rawClass = String(raw.vehicleClass || raw.vehicle_class || 'car').toLowerCase();
  const vehicleClass = rawClass === 'bike' ? VehicleClass.BIKE : VehicleClass.CAR;
  const model =
    raw.model ||
    raw.name ||
    raw.vehicleModel ||
    (vehicleClass === VehicleClass.BIKE ? 'Electric Scooter' : 'Electric Car');
  const batteryKwh =
    Number(raw.batteryKwh ?? raw.battery_kwh ?? raw.batteryCapacityKwh ?? 40.5) || 40.5;
  const efficiencyWhKm =
    Number(raw.efficiencyWhKm ?? raw.efficiency_wh_km ?? 140) || 140;
  const currentChargePct =
    Number(raw.currentChargePct ?? raw.current_charge_pct ?? 50) || 0;
  const connectors = (raw.connectors ||
    raw.connector_types ||
    raw.connectorTypes || [
      vehicleClass === VehicleClass.BIKE ? ConnectorType.THREE_PIN : ConnectorType.CCS2,
    ]) as ConnectorType[];

  const id = String(raw.id || raw._id || '');
  const userId = String(raw.userId || raw.user_id || '');

  const normalized: Vehicle & Record<string, any> = {
    id,
    userId,
    user_id: userId,
    vehicleClass,
    vehicle_class: vehicleClass,
    model,
    name: model,
    vehicleModel: model,
    batteryKwh,
    battery_kwh: batteryKwh,
    batteryCapacityKwh: batteryKwh,
    efficiencyWhKm,
    efficiency_wh_km: efficiencyWhKm,
    connectors,
    connector_types: connectors,
    connectorTypes: connectors,
    currentChargePct,
    current_charge_pct: currentChargePct,
  };

  return normalized;
}

export interface VehiclesState {
  vehicles: Vehicle[];
  activeVehicleId: string | null;
  isLoading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  addVehicle: (data: VehicleFormData) => Promise<Vehicle>;
  updateVehicle: (id: string, data: Partial<VehicleFormData>) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  setActiveVehicle: (id: string) => void;
  getActiveVehicle: () => Vehicle | null;
  clearError: () => void;
}

export const useVehiclesStore = create<VehiclesState>((set, get) => ({
  vehicles: [],
  activeVehicleId: null,
  isLoading: false,
  error: null,

  hydrate: async () => {
    set({ isLoading: true, error: null });
    try {
      const storedActiveId = await storage.getActiveVehicleId();
      const cachedVehicles = await storage.getVehicles<any[]>();

      // Populate immediately from cache if available so UI never flickers empty
      if (cachedVehicles && cachedVehicles.length > 0) {
        const cachedNormalized = cachedVehicles.map(normalizeVehicle);
        set({
          vehicles: cachedNormalized,
          activeVehicleId:
            storedActiveId && cachedNormalized.some((v) => v.id === storedActiveId)
              ? storedActiveId
              : cachedNormalized[0]?.id || null,
        });
      }

      let rawVehicles: any = null;
      try {
        rawVehicles = await http.get<any>('/vehicles');
      } catch (err) {
        console.warn('http.get(/vehicles) failed, trying apiRequest fallback', err);
        try {
          const { apiRequest } = require('../../../services/api');
          rawVehicles = await apiRequest('/vehicles', { method: 'GET' });
        } catch (apiErr) {
          console.warn('apiRequest(/vehicles) fallback failed', apiErr);
          rawVehicles = null;
        }
      }

      const list: any[] = Array.isArray(rawVehicles)
        ? rawVehicles
        : rawVehicles?.data || rawVehicles?.vehicles || cachedVehicles || [];

      const normalized = list.map(normalizeVehicle);

      const activeId =
        storedActiveId && normalized.some((v) => v.id === storedActiveId)
          ? storedActiveId
          : normalized[0]?.id || null;

      set({
        vehicles: normalized,
        activeVehicleId: activeId,
        isLoading: false,
      });

      if (normalized.length > 0) {
        await storage.setVehicles(normalized);
        if (activeId) {
          await storage.setActiveVehicleId(activeId);
        }
      }
    } catch (err: any) {
      console.error('Failed to hydrate vehicles:', err);
      set({
        isLoading: false,
      });
    }
  },

  addVehicle: async (data: VehicleFormData) => {
    try {
      let rawRes: any;
      try {
        rawRes = await http.post<any>('/vehicles', data);
      } catch (postErr) {
        const { apiRequest } = require('../../../services/api');
        rawRes = await apiRequest('/vehicles', {
          method: 'POST',
          body: JSON.stringify(data),
        });
      }

      const newVehicle = normalizeVehicle(rawRes);
      const updated = [newVehicle, ...get().vehicles.filter((v) => v.id !== newVehicle.id)];
      set({
        vehicles: updated,
        activeVehicleId: newVehicle.id,
      });

      await storage.setActiveVehicleId(newVehicle.id);
      await storage.setVehicles(updated);
      return newVehicle;
    } catch (err: any) {
      set({ error: err.message || 'Failed to add vehicle' });
      throw err;
    }
  },

  updateVehicle: async (id: string, data: Partial<VehicleFormData>) => {
    try {
      let rawRes: any;
      try {
        rawRes = await http.patch<any>(`/vehicles/${id}`, data);
      } catch (patchErr) {
        const { apiRequest } = require('../../../services/api');
        rawRes = await apiRequest(`/vehicles/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      }

      const updatedVehicle = normalizeVehicle(rawRes);
      const updated = get().vehicles.map((v) =>
        v.id === id ? { ...v, ...updatedVehicle } : v
      );
      set({ vehicles: updated });
      await storage.setVehicles(updated);
    } catch (err: any) {
      set({ error: err.message || 'Failed to update vehicle' });
      throw err;
    }
  },

  deleteVehicle: async (id: string) => {
    try {
      try {
        await http.delete(`/vehicles/${id}`);
      } catch (delErr) {
        const { apiRequest } = require('../../../services/api');
        await apiRequest(`/vehicles/${id}`, { method: 'DELETE' });
      }

      const updated = get().vehicles.filter((v) => v.id !== id);
      const newActiveId =
        get().activeVehicleId === id ? updated[0]?.id || null : get().activeVehicleId;

      set({
        vehicles: updated,
        activeVehicleId: newActiveId,
      });

      await storage.setVehicles(updated);
      if (newActiveId) {
        await storage.setActiveVehicleId(newActiveId);
      }
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete vehicle' });
      throw err;
    }
  },

  setActiveVehicle: async (id: string) => {
    set({ activeVehicleId: id });
    await storage.setActiveVehicleId(id);
  },

  getActiveVehicle: () => {
    const { vehicles, activeVehicleId } = get();
    return vehicles.find((v) => v.id === activeVehicleId) || vehicles[0] || null;
  },

  clearError: () => set({ error: null }),
}));
