import { z } from 'zod';
import { COMPLAINT_CATEGORY, COMPLAINT_PRIORITY, COMMENT_VISIBILITY } from '../../constants';

const coords = z.number().min(-90).max(90);

export const createComplaintSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(140),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  category: z.enum(COMPLAINT_CATEGORY),
  suggestedPriority: z.enum(COMPLAINT_PRIORITY).optional(),
  latitude: coords,
  longitude: z.number().min(-180).max(180),
  address: z.string().min(5, 'Address is required').max(500),
  ward: z.string().max(100).optional(),
  isAnonymous: z.boolean().default(false),
  imageUrls: z.array(z.string().url()).max(5).default([]),
});

export const listComplaintsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.string().optional(),
  category: z.enum(COMPLAINT_CATEGORY).optional(),
  priority: z.enum(COMPLAINT_PRIORITY).optional(),
  departmentId: z.string().optional(),
  officerId: z.string().optional(),
  createdById: z.string().optional(),
  search: z.string().max(140).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sla: z.enum(['ON_TRACK', 'DUE_SOON', 'OVERDUE']).optional(),
  sort: z.enum(['newest', 'oldest', 'nearest']).default('newest'),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
});

export const updateComplaintSchema = z.object({
  title: z.string().min(5).max(140).optional(),
  description: z.string().min(20).max(5000).optional(),
  category: z.enum(COMPLAINT_CATEGORY).optional(),
  priority: z.enum(COMPLAINT_PRIORITY).optional(),
  address: z.string().min(5).max(500).optional(),
  ward: z.string().max(100).optional(),
});

export const changeStatusSchema = z.object({
  toStatus: z.enum([
    'UNDER_REVIEW',
    'IN_PROGRESS',
    'RESOLVED',
    'REJECTED',
    'DUPLICATE',
  ] as const),
  note: z.string().max(1000).optional(),
  rejectedReason: z.string().max(500).optional(),
  duplicateOfId: z.string().optional(),
  resolutionNote: z.string().max(1000).optional(),
  resolutionProofUrls: z.array(z.string().url()).max(5).optional(),
});

export const assignComplaintSchema = z.object({
  departmentId: z.string().cuid(),
  officerId: z.string().cuid().optional(),
  note: z.string().max(500).optional(),
});

export const createCommentSchema = z.object({
  text: z.string().min(1, 'Comment cannot be empty').max(1000),
  visibility: z.enum(COMMENT_VISIBILITY).default('PUBLIC'),
});

export const paramsSchema = z.object({
  id: z.string().cuid(),
});

export const verifyComplaintSchema = z.object({
  result: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().max(1000).optional(),
  proofUrls: z.array(z.string().url()).max(5).optional(),
});

export const reopenComplaintSchema = z.object({
  note: z.string().max(1000).optional(),
});

export const addImagesSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(5),
});

export const nearbyQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(100).default(3),
  limit: z.coerce.number().int().positive().max(50).default(20),
  status: z.string().optional(),
  category: z.enum(COMPLAINT_CATEGORY).optional(),
});

export const mapBoundsQuerySchema = z.object({
  neLat: z.coerce.number().min(-90).max(90),
  neLng: z.coerce.number().min(-180).max(180),
  swLat: z.coerce.number().min(-90).max(90),
  swLng: z.coerce.number().min(-180).max(180),
status: z.string().optional(),
    category: z.enum(COMPLAINT_CATEGORY).optional(),
    limit: z.coerce.number().int().positive().max(200).default(100),
    gridSize: z.coerce.number().positive().max(1).default(0.02),
  });

export const trackingParamsSchema = z.object({
  code: z
    .string()
    .toUpperCase()
    .regex(/^JM-[A-Z0-9]{6}-[A-Z0-9]{4}$/, 'Invalid tracking code format'),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type ListComplaintsQuery = z.infer<typeof listComplaintsQuerySchema>;
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type AssignComplaintInput = z.infer<typeof assignComplaintSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type VerifyComplaintInput = z.infer<typeof verifyComplaintSchema>;