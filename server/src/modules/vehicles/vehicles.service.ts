import { VehicleClass, ConnectorType } from '@prisma/client';
import { prisma } from '../../db/client';
import { NotFoundError, BadRequestError } from '../../middleware/error-handler';
import { CreateVehicleInput, UpdateVehicleInput } from './vehicles.schema';

export class VehiclesService {
  /**
   * Sensible defaults per vehicle class (Edge Case #11)
   */
  public static getClassDefaults(vehicleClass: VehicleClass) {
    if (vehicleClass === VehicleClass.car) {
      return {
        model: 'Tata Nexon EV',
        efficiencyWhKm: 140.0,
        batteryKwh: 40.0,
        connectors: [ConnectorType.ccs2, ConnectorType.type2_ac],
      };
    }
    // Bike defaults
    return {
      model: 'Ather 450X',
      efficiencyWhKm: 35.0,
      batteryKwh: 3.7,
      connectors: [ConnectorType.type2_ac, ConnectorType.three_pin],
    };
  }

  /**
   * Normalize vehicle object for universal frontend mapping compatibility.
   * Exposes both camelCase and snake_case attributes so all clients, stores,
   * and components find their expected keys.
   */
  public static formatVehicleResponse(v: any) {
    if (!v) return null;
    const vehicleClass = v.vehicleClass || v.vehicle_class || 'car';
    const model = v.model || v.name || v.vehicleModel || (vehicleClass === 'bike' ? 'Electric Scooter' : 'Electric Car');
    const batteryKwh = Number(v.batteryKwh ?? v.battery_kwh ?? v.batteryCapacityKwh ?? 40.0);
    const efficiencyWhKm = Number(v.efficiencyWhKm ?? v.efficiency_wh_km ?? 140.0);
    const currentChargePct = Number(v.currentChargePct ?? v.current_charge_pct ?? 50.0);
    const connectors = v.connectors || v.connector_types || v.connectorTypes || [ConnectorType.ccs2, ConnectorType.type2_ac];
    const userId = v.userId || v.user_id;

    return {
      id: v.id,
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
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }

  /**
   * List all vehicles for user
   */
  public static async listUserVehicles(userId: string) {
    return prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single vehicle by ID
   */
  public static async getVehicleById(id: string) {
    return prisma.vehicle.findUnique({
      where: { id },
    });
  }

  /**
   * Add a new vehicle
   */
  public static async createVehicle(userId: string, input: CreateVehicleInput) {
    const rawClass = (input.vehicleClass || input.vehicle_class || 'car').toLowerCase();
    const vClass = rawClass === 'bike' ? VehicleClass.bike : VehicleClass.car;
    const defaults = this.getClassDefaults(vClass);

    const model = (input.model || input.name || input.vehicleModel || '').trim() || defaults.model;
    const batteryKwh = input.batteryKwh ?? input.battery_kwh ?? input.batteryCapacityKwh ?? defaults.batteryKwh;
    const efficiencyWhKm = input.efficiencyWhKm ?? input.efficiency_wh_km ?? defaults.efficiencyWhKm;
    const connectors = ((input.connectors || input.connector_types) as ConnectorType[]) ?? defaults.connectors;
    const currentChargePct = input.currentChargePct ?? input.current_charge_pct ?? 50.0;
    const targetUserId = input.userId || input.user_id || userId;

    return prisma.vehicle.create({
      data: {
        userId: targetUserId,
        vehicleClass: vClass,
        model,
        batteryKwh,
        efficiencyWhKm,
        connectors,
        currentChargePct,
      },
    });
  }

  /**
   * Update a vehicle with owner check
   */
  public static async updateVehicle(userId: string, vehicleId: string, input: UpdateVehicleInput) {
    const existing = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });

    if (!existing) {
      throw new NotFoundError(`Vehicle not found with id: ${vehicleId}`);
    }

    const rawClass = input.vehicleClass || input.vehicle_class;
    const vClass = rawClass ? (rawClass.toLowerCase() === 'bike' ? VehicleClass.bike : VehicleClass.car) : undefined;
    const model = input.model !== undefined ? input.model.trim() : (input.name !== undefined ? input.name.trim() : undefined);
    const batteryKwh = input.batteryKwh ?? input.battery_kwh ?? input.batteryCapacityKwh;
    const efficiencyWhKm = input.efficiencyWhKm ?? input.efficiency_wh_km;
    const connectors = (input.connectors || input.connector_types) as ConnectorType[] | undefined;
    const currentChargePct = input.currentChargePct ?? input.current_charge_pct;

    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...(vClass !== undefined ? { vehicleClass: vClass } : {}),
        ...(model !== undefined ? { model } : {}),
        ...(batteryKwh !== undefined ? { batteryKwh } : {}),
        ...(efficiencyWhKm !== undefined ? { efficiencyWhKm } : {}),
        ...(connectors !== undefined ? { connectors } : {}),
        ...(currentChargePct !== undefined ? { currentChargePct } : {}),
      },
    });
  }

  /**
   * Delete a vehicle with owner check
   */
  public static async deleteVehicle(userId: string, vehicleId: string) {
    const existing = await prisma.vehicle.findFirst({
      where: { id: vehicleId, userId },
    });

    if (!existing) {
      throw new NotFoundError(`Vehicle not found with id: ${vehicleId}`);
    }

    await prisma.vehicle.delete({
      where: { id: vehicleId },
    });

    return { success: true };
  }
}
