import bcrypt from 'bcryptjs';
import { prisma } from '../../db/prisma';
import { ApiError } from '../../utils/ApiError';
import { buildMeta } from '../../utils/pagination';
import { CreateUserInput, UpdateUserInput, ListUsersQuery } from './users.schemas';

const publicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  avatarUrl: true,
  points: true,
  isActive: true,
  departmentId: true,
  department: { select: { id: true, name: true, code: true } },
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers(
  query: ListUsersQuery,
  actor: { role: string; departmentId?: string | null },
) {
  const page = query.page;
  const limit = query.limit;

  const where: Record<string, unknown> = { deletedAt: null };

  if (query.role) where.role = query.role;
  // Department admins are scoped to their own department; any departmentId
  // filter they supply that isn't their own is ignored.
  if (actor.role === 'DEPARTMENT_ADMIN') {
    where.departmentId = actor.departmentId ?? null;
  } else if (query.departmentId) {
    where.departmentId = query.departmentId;
  }
  if (query.isActive) where.isActive = query.isActive === 'true';
  if (query.search) {
    const q = query.search;
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: publicSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { items, meta: buildMeta(total, page, limit) };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      ...publicSelect,
      userBadges: { select: { badge: { select: { name: true, slug: true, pointsThreshold: true } }, earnedAt: true } },
    },
  });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('A user with this email already exists', 'EMAIL_EXISTS');

  if (input.departmentId) {
    await ensureDepartment(input.departmentId);
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
      departmentId: input.departmentId,
    },
    select: publicSelect,
  });
  return user;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  actor: { userId: string; role: string; departmentId?: string | null },
) {
  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!target) throw ApiError.notFound('User not found');

  // Department admins are scoped to their own department: they may only
  // manage members of that department, cannot touch system admins, cannot
  // promote anyone to SYSTEM_ADMIN, and cannot reassign users to another
  // department. System admins are unrestricted.
  if (actor.role === 'DEPARTMENT_ADMIN') {
    const actorDept = actor.departmentId ?? null;
    if (target.role === 'SYSTEM_ADMIN') {
      throw ApiError.forbidden('Cannot modify a system administrator');
    }
    if (target.departmentId !== actorDept) {
      throw ApiError.forbidden('Department admins can only manage users in their own department');
    }
    if (input.role === 'SYSTEM_ADMIN') {
      throw ApiError.forbidden('Department admins cannot promote users to system administrator');
    }
    if (input.departmentId !== undefined && (input.departmentId ?? null) !== actorDept) {
      throw ApiError.forbidden('Department admins can only assign users to their own department');
    }
  }

  // Users cannot change their own role (prevents self-escalation / lockout).
  if (actor.userId === id && input.role !== undefined && input.role !== target.role) {
    throw ApiError.badRequest('You cannot change your own role', 'SELF_ROLE_CHANGE');
  }

  if (input.departmentId) {
    await ensureDepartment(input.departmentId);
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: publicSelect,
  });
  return user;
}

export async function removeUser(id: string, actorId: string) {
  if (id === actorId) {
    throw ApiError.badRequest('You cannot delete your own account', 'SELF_DELETE');
  }
  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!target) throw ApiError.notFound('User not found');

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

async function ensureDepartment(departmentId: string) {
  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept) throw ApiError.notFound('Department not found');
}