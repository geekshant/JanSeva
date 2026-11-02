import { z } from 'zod';

export const presignQuerySchema = z.object({
  resourceType: z.enum(['image', 'video']).default('image'),
});

export const confirmSchema = z.object({
  complaintId: z.string().cuid(),
  publicId: z.string(),
  url: z.string().url().optional(),
});