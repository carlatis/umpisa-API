import type { CorsOptions } from 'cors';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Requests without Origin are non-browser clients; JWT authorization still applies.
    if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin is not allowed by CORS policy'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 600,
};

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' },
});
