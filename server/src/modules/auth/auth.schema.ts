import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  role: z.enum(['driver', 'manager', 'admin']).default('driver'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updateMeSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').optional(),
  email: z.string().trim().email('Invalid email address').optional(),
  phone: z.string().trim().optional(),
  role: z.enum(['driver', 'manager', 'admin']).optional(),
});

export const googleAuthSchema = z
  .object({
    idToken: z.string().optional(),
    email: z.string().trim().email('Invalid email address').optional(),
    name: z.string().trim().optional(),
    googleId: z.string().optional(),
    photoUrl: z.string().optional(),
  })
  .refine((data) => !!(data.idToken || data.email), {
    message: 'Either idToken or email is required for Google Sign-In',
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

