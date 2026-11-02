import { ComplaintCategory } from '../constants';

/**
 * SLA deadlines per category (README Section 22).
 * Values are in hours. Critical safety hazard is the shortest, parks the longest.
 */
export const CATEGORY_SLA_HOURS: Record<ComplaintCategory, number> = {
  SAFETY_HAZARD: 24,
  WATER_LEAKAGE: 48,
  GARBAGE: 48,
  SEWAGE: 48,
  DRAINAGE: 48,
  STREETLIGHT: 72,
  ELECTRICITY: 72,
  POTHOLES: 168, // 7 days
  ROAD_DAMAGE: 168, // 7 days
  PARK_MAINTENANCE: 168, // 7 days
  OTHER: 168,
};

/** Default SLA hours when category is unknown. */
export const DEFAULT_SLA_HOURS = 168;

/**
 * Statutory/regulatory roles that may reach admin-level endpoints.
 */
export const ADMIN_ROLES = ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] as const;

export const OFFICIAL_ROLES = ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN', 'OFFICIAL'] as const;