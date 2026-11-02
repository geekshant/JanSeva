import dotenv from 'dotenv';

dotenv.config();

function readNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: readNumber(process.env.PORT, 8080),
  host: process.env.HOST ?? '0.0.0.0',
  apiBasePath: process.env.API_BASE_PATH ?? '/api/v1',
  corsOrigins: readCsv(process.env.CORS_ORIGINS),

  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://janmitra:janmitra@localhost:5432/janmitra',

  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  jwtIssuer: process.env.JWT_ISSUER ?? 'janmitra',

  authMode: process.env.AUTH_MODE ?? 'jwt',

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER ?? 'janmitra/complaints',
    signedUrlExpires: readNumber(process.env.CLOUDINARY_SIGNED_URL_EXPIRES, 3600),
    maxImages: readNumber(process.env.CLOUDINARY_MAX_IMAGES, 5),
    maxUploadSizeMb: readNumber(process.env.CLOUDINARY_MAX_UPLOAD_SIZE_MB, 10),
  },

  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

  rateLimit: {
    windowMs: readNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    maxRequests: readNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 300),
    authMax: readNumber(process.env.RATE_LIMIT_AUTH_MAX, 20),
  },

  seed: {
    demoAdminEmail: process.env.SEED_DEMO_ADMIN_EMAIL ?? 'admin@janmitra.local',
    demoAdminPassword: process.env.SEED_DEMO_ADMIN_PASSWORD ?? '',
  },
} as const;

// Fail fast in production if critical secrets are missing or weak. There are
// no insecure hard-coded fallbacks: the app refuses to boot without a strong
// JWT secret and a real database URL.
if (env.isProduction) {
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set to a strong value (>= 32 characters) in production');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set in production');
  }
}