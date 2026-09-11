import { create } from 'zustand';
import { Vehicle } from '@contracts/types';
import { ConnectorType, VehicleClass } from '@contracts/enums';
import { storage } from '../../lib/storage';
import { VehicleFormData } from './types';

export const INITIAL_DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: 'veh_nexon_1',
    userId: 'usr_driver_101',
    vehicleClass: VehicleClass.CAR,
    model: 'Tata Nexon EV Max',
    batteryKwh: 40.5,
    efficiencyWhKm: 140,
    connectors: [ConnectorType.CCS2, ConnectorType.TYPE2_AC],
    currentChargePct: 42,
  },
  {
    id: 'veh_ather_2',
    userId: 'usr_driver_101',
    vehicleClass: VehicleClass.BIKE,
    model: 'Ather 450X Gen 3',
    batteryKwh: 3.7,
    efficiencyWhKm: 40,
    connectors: [
      ConnectorType.THREE_PIN,
      ConnectorType.BHARAT_AC_001,
      ConnectorType.TYPE2_AC,
    ],
    currentChargePct: 68,
  },
];

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
  vehicles: INITIAL_DEFAULT_VEHICLES,
  activeVehicleId: 'veh_nexon_1',
  isLoading: false,
  error: null,

  hydrate: async () => {
    set({ isLoading: true, error: null });
    try {
      const storedVehicles = await storage.getVehicles<Vehicle[]>();
      const storedActiveId = await storage.getActiveVehicleId();

      const vehicles =
        storedVehicles && storedVehicles.length > 0
          ? storedVehicles
          : INITIAL_DEFAULT_VEHICLES;

      const activeId =
        storedActiveId && vehicles.some((v) => v.id === storedActiveId)
          ? storedActiveId
          : vehicles[0]?.id || null;

      set({
        vehicles,
        activeVehicleId: activeId,
        isLoading: false,
      });
    } catch {
      set({
        vehicles: INITIAL_DEFAULT_VEHICLES,
        activeVehicleId: 'veh_nexon_1',
        isLoading: false,
      });
    }
  },

  addVehicle: async (data: VehicleFormData) => {
    const newVehicle: Vehicle = {
      id: `veh_${Date.now()}`,
      userId: 'usr_driver_101',
      vehicleClass: data.vehicleClass,
      model: data.model,
      batteryKwh: data.batteryKwh,
      efficiencyWhKm: data.efficiencyWhKm,
      connectors: data.connectors,
      currentChargePct: data.currentChargePct,
    };

    const updated = [newVehicle, ...get().vehicles];
    set({
      vehicles: updated,
      activeVehicleId: newVehicle.id,
    });

    await storage.setVehicles(updated);
    await storage.setActiveVehicleId(newVehicle.id);
    return newVehicle;
  },

  updateVehicle: async (id: string, data: Partial<VehicleFormData>) => {
    const updated = get().vehicles.map((v) =>
      v.id === id ? { ...v, ...data } : v
    );
    set({ vehicles: updated });
    await storage.setVehicles(updated);
  },

  deleteVehicle: async (id: string) => {
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
