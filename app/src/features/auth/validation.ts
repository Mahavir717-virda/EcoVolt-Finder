import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string().min(2, 'Please enter your full name'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['driver', 'manager', 'admin']),
  vehicleClass: z.enum(['car', 'bike']).optional(),
});

export type SignupFormData = z.infer<typeof signupSchema>;

export const otpSchema = z.object({
  otp: z.string().length(6, 'Please enter the 6-digit verification code'),
});

export type OtpFormData = z.infer<typeof otpSchema>;
