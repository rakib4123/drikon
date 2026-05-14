import { z } from 'zod';

/**
 * Centralized env-var validation.
 * Crash hard at boot if anything is missing — never run with bad config.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_HOST: z.string().default('0.0.0.0'),
  WEB_ORIGIN: z.string().min(1),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be ≥32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be ≥32 chars'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(604800),

  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().or(z.string()).default('Drikon <noreply@drikon.com>'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(65536),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(3),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(4),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_LOGIN_WINDOW: z.coerce.number().int().positive().default(60),
  ACCOUNT_LOCK_THRESHOLD: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCK_DURATION: z.coerce.number().int().positive().default(1800),

  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Wraps NestJS ConfigModule's validate hook.
 * If validation fails, the app refuses to start — fail-fast is a feature.
 */
export const envValidationSchema = {
  validate: (config: Record<string, unknown>): Env => {
    const result = envSchema.safeParse(config);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n');
      throw new Error(`❌ Invalid environment variables:\n${issues}`);
    }
    return result.data;
  },
} as any;
