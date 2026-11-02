import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.prisma ??
  new PrismaClient({
    // Avoid logging full query payloads (which can include hashed passwords
    // and refresh-token digests) even in development. Only surface warnings
    // and errors.
    log: env.isProduction
      ? ['error', 'warn']
      : env.isTest
        ? ['error']
        : ['warn', 'error'],
  });

if (!env.isProduction) {
  global.prisma = prisma;
}