import { JwtUserClaims } from '../modules/auth/jwt';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Authenticated principal populated by the requireAuth middleware. */
      user?: JwtUserClaims;
      /** Best-effort client IP (accounting for X-Forwarded-For). */
      requestIp?: string;
      requestId?: string;
    }
  }
}

export {};

/** Convenience alias already carrying the non-null principal. */
export interface AuthenticatedRequest extends Express.Request {
  user: JwtUserClaims;
}