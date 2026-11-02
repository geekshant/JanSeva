import { z } from 'zod';
import { COMPLAINT_CATEGORY } from '../../constants';

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers or underscores'),
  description: z.string().max(500).optional(),
  categoryMapping: z.array(z.enum(COMPLAINT_CATEGORY)).max(10).default([]),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const listDepartmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  includeStats: z.enum(['true', 'false']).default('true'),
});

export const listDepartmentComplaintsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  priority: z.string().optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;