import { Request, Response } from 'express';
import { env } from '../../config/env';
import { TOKEN_COOKIE_NAME, REFRESH_COOKIE_NAME } from '../../constants';

const ACCESS_MAX_AGE = 24 * 60 * 60 * 1000;   // 24 hours
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function commonOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

/** Sets httpOnly cookies for both access and refresh tokens. */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(TOKEN_COOKIE_NAME, accessToken, commonOptions(ACCESS_MAX_AGE));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, commonOptions(REFRESH_MAX_AGE));
}

/** Clears both auth cookies (used on logout). */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(TOKEN_COOKIE_NAME, { path: '/', httpOnly: true });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/', httpOnly: true });
}

/** Reads a single cookie value from the Cookie header (no external dep). */
export function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return undefined;
}

/**
 * Extracts the access token from the Authorization header (API clients) or
 * the httpOnly cookie (browser sessions). The Bearer header takes priority
 * so programmatic clients continue to work.
 */
export function getAccessToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return getCookie(req, TOKEN_COOKIE_NAME);
}

/**
 * Extracts the refresh token — cookie first (browser), then body fallback
 * (for API clients that pass it explicitly).
 */
export function getRefreshToken(req: Request): string | undefined {
  return getCookie(req, REFRESH_COOKIE_NAME) ?? (req.body?.refreshToken as string | undefined);
}
