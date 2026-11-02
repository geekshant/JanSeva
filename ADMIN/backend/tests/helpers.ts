import { prisma } from '../src/db/prisma';

const TABLES = [
  'refresh_sessions',
  'audit_logs',
  'notifications',
  'user_badges',
  'points_transactions',
  'complaint_verifications',
  'complaint_assignments',
  'complaint_status_history',
  'complaint_comments',
  'complaint_images',
  'complaints',
  'departments',
  'badges',
  'users',
];

/** Truncate all application tables so each test run starts from a clean slate. */
export async function resetDb(): Promise<void> {
  for (const table of TABLES) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

export const SITE = 'http://localhost:8080/api/v1';

export interface ApiResponse {
  success: boolean;
  data: unknown;
  error?: { code: string; message: string };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Extracts the access token from the Set-Cookie header of a supertest
 * response. With httpOnly cookie auth, tokens are no longer in the response
 * body — they're only in cookies. Tests use this to get a Bearer token for
 * the auth middleware's header fallback.
 */
export function extractAccessToken(res: {
  headers: Record<string, string | string[] | undefined>;
}): string {
  const cookies = res.headers['set-cookie'] as string[] | undefined;
  if (!cookies || cookies.length === 0) throw new Error('No Set-Cookie header in login response');
  const accessCookie = cookies.find((c: string) => c.startsWith('jm_access='));
  if (!accessCookie) throw new Error('No jm_access cookie in Set-Cookie');
  return accessCookie.split(';')[0].split('=').slice(1).join('=');
}