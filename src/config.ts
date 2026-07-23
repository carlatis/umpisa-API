import 'dotenv/config';
import { z } from 'zod';

const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16),
    API_PORT: z.coerce.number().default(4000),
    CORS_ORIGINS: z.string().default('http://localhost:3000'),
  })
  .parse(process.env);

export const config = {
  ...env,
  corsOrigins: env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
