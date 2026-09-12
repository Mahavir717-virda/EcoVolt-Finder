import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from server root or process env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().default('default_dev_jwt_secret_must_change_in_production'),
  JWT_REFRESH_SECRET: z.string().default('default_dev_jwt_refresh_secret_must_change_in_production'),
  ML_SERVICE_URL: z.string().optional().transform((val) => (val && val.trim() ? val.trim() : 'http://localhost:8000')),
  GOOGLE_SERVER_KEY: z.string().optional().default(''),
  CORS_ORIGINS: z.string().default('http://localhost:19006,http://localhost:3000,http://localhost:8081,http://localhost:4000')
    .transform((val) => val.split(',').map((origin) => origin.trim())),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
