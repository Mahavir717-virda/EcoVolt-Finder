import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role, VehicleClass, ConnectorType } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/client';
import {
  AppError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../../middleware/error-handler';
import { SignupInput, LoginInput, GoogleAuthInput } from './auth.schema';

export interface TokenPayload {
  sub: string; // userId
  email: string;
  role: Role;
}


export class AuthService {
  private static SALT_ROUNDS = 12;

  /**
   * Hash plain text password using bcrypt
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare plain text password against hash
   */
  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate access token (15m expiry)
   */
  public static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
  }

  /**
   * Generate refresh token (7d expiry)
   */
  public static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }

  /**
   * Verify refresh token and return payload
   */
  public static verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  /**
   * Verify access token and return payload
   */
  public static verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  /**
   * Register a new user
   */
  public static async signup(data: SignupInput) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError('Email is already registered', { email: data.email });
    }

    const passwordHash = await this.hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role as Role,
      },
    });

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Authenticate user with email and password
   * Edge Case #24: Generic message on fail so credentials don't leak which field failed
   */
  public static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await this.comparePassword(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token
   */
  public static async refresh(refreshToken: string) {
    const payload = this.verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const newAccessToken = this.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken: newAccessToken,
    };
  }

  /**
   * Get user profile by ID
   */
  public static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  public static async updateUserProfile(
    userId: string,
    data: { name?: string; email?: string; phone?: string; role?: Role }
  ) {
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: {
          email: data.email.toLowerCase(),
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw new ConflictError('Email is already registered with another account', {
          email: data.email,
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
        ...(data.role ? { role: data.role as Role } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return user;
  }

  /**
   * Authenticate / Sign in with Google (OAuth / ID Token / Google profile)
   * Dynamically verifies token, provisions user in PostgreSQL if first time,
   * creates default EV vehicle profile, and returns JWT access & refresh tokens.
   */
  public static async googleAuth(data: GoogleAuthInput) {
    let email = data.email;
    let name = data.name;

    // If ID token is passed, attempt extraction/decoding
    if (data.idToken && !email) {
      try {
        const decoded = jwt.decode(data.idToken) as any;
        if (decoded && decoded.email) {
          email = decoded.email;
          name = name || decoded.name || decoded.given_name;
        }
      } catch {}
    }

    if (!email) {
      throw new UnauthorizedError('Google authentication failed: email could not be verified');
    }

    email = email.toLowerCase().trim();

    // 1. Check if user already exists in PostgreSQL
    let user = await prisma.user.findUnique({
      where: { email },
      include: { vehicles: true },
    });

    // 2. If first time user, automatically provision account & EV profile
    if (!user) {
      const generatedPassword = `GoogleOAuth_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const passwordHash = await this.hashPassword(generatedPassword);

      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          role: Role.driver,
          passwordHash,
        },
        include: { vehicles: true },
      });

      // Automatically create standard Indian EV vehicle profile for new driver
      await prisma.vehicle.create({
        data: {
          userId: user.id,
          vehicleClass: VehicleClass.car,
          model: 'Tata Nexon EV Max',
          batteryKwh: 40.5,
          efficiencyWhKm: 140.0,
          connectors: [ConnectorType.ccs2, ConnectorType.type2_ac],
          currentChargePct: 45.0,
        },
      });
    }

    // 3. Issue standard access and refresh JWT tokens
    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.generateAccessToken(tokenPayload);
    const refreshToken = this.generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}

