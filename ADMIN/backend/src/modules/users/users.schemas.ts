import { z } from 'zod';
import { USER_ROLES } from '../../constants';

export const createUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,15}$/).optional(),
  password: z.string().min(8).max(72),
  role: z.enum(USER_ROLES),
  departmentId: z.string().cuid().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().regex(/^\+?[0-9\s\-()]{7,15}$/).optional(),
  role: z.enum(USER_ROLES).optional(),
  departmentId: z.string().cuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(USER_ROLES).optional(),
  search: z.string().max(80).optional(),
  departmentId: z.string().cuid().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const changeRoleSchema = z.object({
  role: z.enum(USER_ROLES),
  departmentId: z.string().cuid().nullable().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;