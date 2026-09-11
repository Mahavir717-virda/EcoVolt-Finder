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
        efficiencyWhKm: 140.0,
        batteryKwh: 40.0,
        connectors: [ConnectorType.ccs2, ConnectorType.type2_ac],
      };
    }
    // Bike defaults
    return {
      efficiencyWhKm: 35.0,
      batteryKwh: 3.7,
      connectors: [ConnectorType.type2_ac, ConnectorType.three_pin],
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
   * Add a new vehicle
   */
  public static async createVehicle(userId: string, input: CreateVehicleInput) {
    const vClass = input.vehicleClass as VehicleClass;
    const defaults = this.getClassDefaults(vClass);

    const batteryKwh = input.batteryKwh ?? defaults.batteryKwh;
    const efficiencyWhKm = input.efficiencyWhKm ?? defaults.efficiencyWhKm;
    const connectors = (input.connectors as ConnectorType[]) ?? defaults.connectors;

    return prisma.vehicle.create({
      data: {
        userId,
        vehicleClass: vClass,
        model: input.model,
        batteryKwh,
        efficiencyWhKm,
        connectors,
        currentChargePct: input.currentChargePct,
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

    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...(input.model !== undefined ? { model: input.model } : {}),
        ...(input.batteryKwh !== undefined ? { batteryKwh: input.batteryKwh } : {}),
        ...(input.efficiencyWhKm !== undefined ? { efficiencyWhKm: input.efficiencyWhKm } : {}),
        ...(input.connectors !== undefined
          ? { connectors: input.connectors as ConnectorType[] }
          : {}),
        ...(input.currentChargePct !== undefined
          ? { currentChargePct: input.currentChargePct }
          : {}),
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
