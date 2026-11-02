import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  unreadOnly: z.enum(['true', 'false']).default('false'),
});

export const markReadParamsSchema = z.object({
  id: z.string().cuid(),
});

export const registerDeviceTokenSchema = z.object({
  token: z.string().min(20).max(512),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});

export const deviceTokenParamsSchema = z.object({
  token: z.string().min(20).max(512),
});