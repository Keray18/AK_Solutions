import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default('/api'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Google OAuth
  GOOGLE_AUTH_ENABLED: z.preprocess((v) => v === 'true' || v === true, z.boolean().default(false)),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Email
  EMAIL_VERIFICATION_REQUIRED: z.preprocess((v) => v === 'true' || v === true || v === undefined, z.boolean().default(true)),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@skinai.in'),

  // Frontend (comma-separated origins allowed for production + staging/localhost)
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Private Friends & Family Beta Gate
  BETA_ACCESS_ENABLED: z.preprocess((v) => v === 'true' || v === true, z.boolean().default(false)),
  BETA_INVITE_CODE: z.string().optional(),
  BETA_ALLOWED_EMAILS: z.string().optional(), // Comma-separated allowlist of emails

  // AI Providers
  PRIMARY_AI_PROVIDER: z.enum(['openai', 'gemini', 'groq', 'grok', 'deterministic']).default('openai'),
  SECONDARY_AI_PROVIDER: z.enum(['gemini', 'openai', 'groq', 'grok', 'deterministic']).default('gemini'),
  TERTIARY_AI_PROVIDER: z.enum(['groq', 'gemini', 'openai', 'grok', 'deterministic']).default('groq'),
  AI_PROVIDER_ORDER: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-3.5-flash'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('qwen/qwen3.8-27b'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
