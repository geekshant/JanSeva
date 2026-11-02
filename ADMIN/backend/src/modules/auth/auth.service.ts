import bcrypt from 'bcryptjs';
import { prisma } from '../../db/prisma';
import { ApiError } from '../../utils/ApiError';
import { signAccessToken } from './jwt';
import { generateOpaqueToken, hashToken } from './token';
import { verifyFirebaseToken } from './firebase';
import { RegisterInput, LoginInput, FirebaseLoginInput } from './auth.schemas';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  avatarUrl: true,
  points: true,
  departmentId: true,
  isActive: true,
  createdAt: true,
} as const;

async function createRefreshSession(userId: string): Promise<string> {
  const { token, digest } = generateOpaqueToken();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshSession.create({
    data: { userId, digest: `sha256:${digest}`, expiresAt: expires },
  });
  return token;
}

async function issueTokens(user: {
  id: string;
  email?: string | null;
  role: string;
  name: string;
  departmentId?: string | null;
}): Promise<AuthTokens> {
  const refreshToken = await createRefreshSession(user.id);
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email ?? undefined,
    role: user.role,
    name: user.name,
    departmentId: user.departmentId ?? undefined,
    jti: crypto.randomUUID(),
  });
  return { accessToken, refreshToken, expiresIn: 24 * 60 * 60 };
}

function assertActive(user: { isActive: boolean; deletedAt: Date | null }) {
  if (!user.isActive || user.deletedAt) {
    throw ApiError.forbidden('This account is deactivated');
  }
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists', 'EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      passwordHash,
      role: input.role ?? 'CITIZEN',
    },
    select: safeUserSelect,
  });

  return user;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findFirst({
    where: { email: input.email, deletedAt: null },
  });
  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }
  assertActive(user);

  const tokens = await issueTokens(user);
  return { user: pickSafe(user), tokens };
}

export async function loginWithFirebase(input: FirebaseLoginInput) {
  const claims = await verifyFirebaseToken(input.idToken);
  const firebaseUid = claims.uid;
  const email = (claims.email as string | undefined)?.toLowerCase();

  let user = await prisma.user.findFirst({
    where: { firebaseUid, deletedAt: null },
  });

  if (!user && email) {
    user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: (claims.name as string) ?? email ?? 'Citizen',
        email,
        firebaseUid,
        role: 'CITIZEN',
      },
    });
  } else if (!user.firebaseUid && firebaseUid) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { firebaseUid },
    });
  }

  assertActive(user);
  const tokens = await issueTokens(user);
  return { user: pickSafe(user), tokens };
}

export async function refreshSession(refreshToken?: string) {
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token required', 'REFRESH_TOKEN_REQUIRED');
  }
  const session = await prisma.refreshSession.findUnique({
    where: { digest: `sha256:${hashToken(refreshToken)}` },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw ApiError.unauthorized('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const user = session.user;
  assertActive(user);

  // Rotate the refresh token: revoke current, issue a fresh pair.
  await prisma.refreshSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokens(user);
  return { user: pickSafe(user), tokens };
}

export async function revokeRefreshToken(refreshToken: string) {
  const digest = `sha256:${hashToken(refreshToken)}`;
  await prisma.refreshSession.updateMany({
    where: { digest, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessions(userId: string) {
  await prisma.refreshSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { ...safeUserSelect, userBadges: { include: { badge: true } } },
  });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found');
  if (!user.passwordHash) {
    throw ApiError.badRequest(
      'This account has no password set (Firebase account). Use Firebase to manage credentials.',
      'NO_PASSWORD',
    );
  }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw ApiError.badRequest('Current password is incorrect', 'WRONG_PASSWORD');
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await revokeAllSessions(userId);
}

export async function updateProfile(userId: string, data: { name?: string; phone?: string; avatarUrl?: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
      ...(data.avatarUrl ? { avatarUrl: data.avatarUrl } : {}),
    },
    select: safeUserSelect,
  });
  return user;
}

function pickSafe(user: {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  avatarUrl?: string | null;
  points: number;
  departmentId?: string | null;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
    points: user.points,
    departmentId: user.departmentId,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}