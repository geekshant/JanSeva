import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { verifyToken, AccessTokenClaims, toUserClaims, JwtUserClaims } from '../modules/auth/jwt';
import { getAccessToken } from '../modules/auth/cookies';
import { UserRole } from '../constants';

/**
 * Verifies the access token (from Bearer header or httpOnly cookie), confirms
 * the account is still active, then attaches the principal to req.user.
 */
export const requireAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = getAccessToken(req);
    if (!token) {
      throw ApiError.unauthorized('Access token is required', 'ACCESS_TOKEN_REQUIRED');
    }

    let claims: AccessTokenClaims;
    try {
      claims = verifyToken<AccessTokenClaims>(token);
    } catch {
      throw ApiError.unauthorized('Invalid or expired access token', 'INVALID_ACCESS_TOKEN');
    }

    if (claims.type !== 'access' || !claims.sub) {
      throw ApiError.unauthorized('Expected an access token', 'INVALID_TOKEN_TYPE');
    }

    const user = await prisma.user.findUnique({ where: { id: claims.sub } });
    if (!user || !user.isActive || user.deletedAt) {
      throw ApiError.unauthorized('Account is disabled or no longer exists', 'ACCOUNT_DISABLED');
    }

    req.user = toUserClaims({ ...claims, sub: claims.sub });
    next();
  },
);

/** Restrict access to a set of roles. */
export function requireRole(...roles: UserRole[]): (req: Request, res: Response, next: NextFunction) => void {
  const allowed = new Set<string>(roles);
  return (req: Request, _res: Response, next: NextFunction) => {
    const principal: JwtUserClaims | undefined = req.user;
    if (!principal) {
      next(ApiError.unauthorized());
      return;
    }
    if (!allowed.has(principal.role)) {
      next(ApiError.forbidden(`Requires role(s): ${roles.join(', ')}`));
      return;
    }
    next();
  };
}

/** Restrict access to admin-level roles only. */
export const requireAdmin = requireRole('SYSTEM_ADMIN', 'DEPARTMENT_ADMIN');

/** Restrict access to official+ dashboard roles. */
export const requireOfficial = requireRole('SYSTEM_ADMIN', 'DEPARTMENT_ADMIN', 'OFFICIAL');

export type { JwtUserClaims };