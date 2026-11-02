import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { env } from '../../config/env';

export interface AccessTokenClaims extends JwtPayload {
  sub: string;
  email?: string;
  role: string;
  name?: string;
  /** Delegate identity when an official acts on behalf of a department token. */
  departmentId?: string;
  type: 'access';
  jti: string;
}

export interface RefreshTokenClaims extends JwtPayload {
  sub: string;
  type: 'refresh';
  jti: string;
}

/** Claims attached to Express.Request.user after requireAuth runs. */
export interface JwtUserClaims {
  userId: string;
  email?: string;
  role: string;
  name?: string;
  departmentId?: string;
  jti: string;
}

const accessOptions: SignOptions = {
  issuer: env.jwtIssuer,
  expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
};

const refreshOptions: SignOptions = {
  issuer: env.jwtIssuer,
  expiresIn: env.jwtRefreshExpiresIn as SignOptions['expiresIn'],
};

export function signAccessToken(
  claims: Omit<AccessTokenClaims, 'type'>,
): string {
  return jwt.sign({ ...claims, type: 'access' }, env.jwtSecret, accessOptions);
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, type: 'refresh', jti }, env.jwtSecret, refreshOptions);
}

export function verifyToken<T extends JwtPayload>(token: string): T {
  return jwt.verify(token, env.jwtSecret, { issuer: env.jwtIssuer }) as T;
}

export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}

/** Human-readable JWT expiry modifier without narrowing TS literal type. */
export function accessExpiresMs(): number {
  const text = env.jwtExpiresIn;
  const match = /^(\d+)(.[smhdw])?$/.exec(text);
  if (!match) return 24 * 60 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2] ?? 'h';
  const ms = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 }[
    unit as 's' | 'm' | 'h' | 'd' | 'w'
  ];
  return value * (ms ?? 3_600_000);
}

/** Map verified access claims onto the principal object used in requests. */
export function toUserClaims(claims: AccessTokenClaims): JwtUserClaims {
  return {
    userId: claims.sub,
    email: claims.email,
    role: claims.role,
    name: claims.name,
    departmentId: claims.departmentId,
    jti: claims.jti,
  };
}