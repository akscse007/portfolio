import 'server-only';
import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SITE_URL: z.string().url().default('http://localhost:3000'),

  SESSION_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(12),
  /// Secret used to hash visitor IPs for rate limiting / message metadata.
  IP_HASH_SALT: z.string().min(16).optional(),
  CSP_MODE: z.enum(['standard', 'strict']).default('standard'),
  TRUST_PROXY: bool,

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_DIR: z.string().default('./storage'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: bool,
  S3_SIGNED_URL_TTL: z.coerce.number().int().min(30).max(3600).default(300),

  MAX_IMAGE_MB: z.coerce.number().positive().default(15),
  MAX_PDF_MB: z.coerce.number().positive().default(20),
  MAX_VIDEO_MB: z.coerce.number().positive().default(200),

  EMAIL_PROVIDER: z.enum(['none', 'console', 'smtp']).default('console'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_SECURE: bool,
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  CONTACT_TO: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  if (parsed.data.NODE_ENV === 'production' && !parsed.data.IP_HASH_SALT) {
    throw new Error('IP_HASH_SALT must be set in production (at least 16 characters).');
  }
  if (parsed.data.STORAGE_DRIVER === 's3' && !parsed.data.S3_BUCKET) {
    throw new Error('S3_BUCKET is required when STORAGE_DRIVER=s3.');
  }
  cached = parsed.data;
  return cached;
}

/** For tests: reset memoised env after mutating process.env. */
export function resetEnvCache() {
  cached = null;
}
