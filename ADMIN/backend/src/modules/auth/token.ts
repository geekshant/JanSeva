import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/**
 * Opaque refresh tokens with a server-side SHA-256 digest so a database
 * breach does not leak usable session tokens.
 */
export function generateOpaqueToken(): { token: string; digest: string } {
  const token = randomBytes(48).toString('hex');
  return { token, digest: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function digestMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(hashToken(provided), 'hex');
  const b = Buffer.from(expected.replace(/^sha256:/, ''), 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function generateSessionId(): string {
  return randomBytes(16).toString('hex');
}