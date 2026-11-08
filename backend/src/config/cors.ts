import cors from 'cors';
import { env } from './env.js';

const configuredOrigins = env.FRONTEND_URL
  ? env.FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:3000'];

export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }

    // In development or test, allow local development ports
    if (env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }

    // Check if origin matches any configured subdomain pattern (e.g. *.vercel.app if configured)
    const isAllowed = configuredOrigins.some((allowed) => {
      if (allowed === '*') return true;
      if (allowed.startsWith('*.') && origin.endsWith(allowed.slice(1))) return true;
      return origin === allowed;
    });

    if (isAllowed) {
      return callback(null, true);
    }

    callback(new Error(`Origin '${origin}' not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400, // 24 hours
};
