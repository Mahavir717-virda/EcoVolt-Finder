import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from './auth.schema';
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

  public static async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = googleAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid Google auth data', parsed.error.format()));
    }

    try {
      const result = await AuthService.googleAuth(parsed.data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid email address', parsed.error.format()));
    }

    try {
      const result = await AuthService.forgotPassword(parsed.data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid OTP request', parsed.error.format()));
    }

    try {
      const result = await AuthService.verifyOtp(parsed.data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  public static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new ValidationError('Invalid password reset payload', parsed.error.format()));
    }

    try {
      const result = await AuthService.resetPassword(parsed.data);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

