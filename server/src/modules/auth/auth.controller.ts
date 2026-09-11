import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { signupSchema, loginSchema, refreshSchema } from './auth.schema';
import { ValidationError } from '../../middleware/error-handler';

export class AuthController {
  public static async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid signup data', parsed.error.format()));
    }

    try {
      const result = await AuthService.signup(parsed.data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid login data', parsed.error.format()));
    }

    try {
      const result = await AuthService.login(parsed.data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid refresh token payload', parsed.error.format()));
    }

    try {
      const result = await AuthService.refresh(parsed.data.refreshToken);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
