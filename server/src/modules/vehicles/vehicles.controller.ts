import { Request, Response, NextFunction } from 'express';
import { VehiclesService } from './vehicles.service';
import { createVehicleSchema, updateVehicleSchema } from './vehicles.schema';
import { ValidationError, UnauthorizedError, NotFoundError } from '../../middleware/error-handler';

export class VehiclesController {
  public static async listVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetUserId =
        (req.query.userId as string) ||
        (req.query.user_id as string) ||
        (req.user?.sub as string);

      if (!targetUserId) {
        res.status(200).json([]);
        return;
      }

      const vehicles = await VehiclesService.listUserVehicles(targetUserId);
      const mapped = vehicles.map(VehiclesService.formatVehicleResponse);
      res.status(200).json(mapped);
    } catch (err) {
      next(err);
    }
  }

  public static async getVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        return next(new NotFoundError('Vehicle ID is required'));
      }

      // 1. Try finding by vehicle ID
      const vehicle = await VehiclesService.getVehicleById(id);
      if (vehicle) {
        res.status(200).json(VehiclesService.formatVehicleResponse(vehicle));
        return;
      }

      // 2. If not found by vehicle ID, check if id is a userId!
      const userVehicles = await VehiclesService.listUserVehicles(id);
      if (userVehicles && userVehicles.length > 0) {
        res.status(200).json(userVehicles.map(VehiclesService.formatVehicleResponse));
        return;
      }

      throw new NotFoundError(`Vehicle not found with id: ${id}`);
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
      const targetUserId =
        req.user.role === 'admin' && (parsed.data.userId || parsed.data.user_id)
          ? (parsed.data.userId || parsed.data.user_id)!
          : req.user.sub;

      const vehicle = await VehiclesService.createVehicle(targetUserId, parsed.data);
      res.status(201).json(VehiclesService.formatVehicleResponse(vehicle));
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
      res.status(200).json(VehiclesService.formatVehicleResponse(updated));
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
