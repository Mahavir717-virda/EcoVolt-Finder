import { Request, Response, NextFunction } from 'express';
import { VehiclesService } from './vehicles.service';
import { createVehicleSchema, updateVehicleSchema } from './vehicles.schema';
import { ValidationError, UnauthorizedError } from '../../middleware/error-handler';

export class VehiclesController {
  public static async listVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const vehicles = await VehiclesService.listUserVehicles(req.user.sub);
      res.status(200).json(vehicles);
    } catch (err) {
      next(err);
    }
  }

  public static async createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const parsed = createVehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid vehicle data', parsed.error.format()));
    }

    try {
      const vehicle = await VehiclesService.createVehicle(req.user.sub, parsed.data);
      res.status(201).json(vehicle);
    } catch (err) {
      next(err);
    }
  }

  public static async updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const parsed = updateVehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid vehicle update data', parsed.error.format()));
    }

    try {
      const rawId = req.params.id;
      const vehicleId = Array.isArray(rawId) ? rawId[0] : rawId;
      const updated = await VehiclesService.updateVehicle(req.user.sub, vehicleId, parsed.data);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  public static async deleteVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    try {
      const rawId = req.params.id;
      const vehicleId = Array.isArray(rawId) ? rawId[0] : rawId;
      await VehiclesService.deleteVehicle(req.user.sub, vehicleId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
