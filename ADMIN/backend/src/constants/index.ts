export const API_BASE_PATH = '/api/v1';

export const TOKEN_COOKIE_NAME = 'jm_access';
export const REFRESH_COOKIE_NAME = 'jm_refresh';

/** Complaint lifecycle statuses (see README Section 24). */
export const COMPLAINT_STATUS = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'VERIFIED',
  'REOPENED',
  'REJECTED',
  'DUPLICATE',
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUS)[number];

/** Priorities used by authorities for triage. */
export const COMPLAINT_PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type ComplaintPriority = (typeof COMPLAINT_PRIORITY)[number];

/** Complaint categories that map to departments. */
export const COMPLAINT_CATEGORY = [
  'POTHOLES',
  'ROAD_DAMAGE',
  'GARBAGE',
  'WATER_LEAKAGE',
  'STREETLIGHT',
  'PARK_MAINTENANCE',
  'SAFETY_HAZARD',
  'SEWAGE',
  'DRAINAGE',
  'ELECTRICITY',
  'OTHER',
] as const;
export type ComplaintCategory = (typeof COMPLAINT_CATEGORY)[number];

/** SLA states reported against the category SLA deadline. */
export const SLA_STATE = ['ON_TRACK', 'DUE_SOON', 'OVERDUE', 'RESOLVED'] as const;
export type SlaState = (typeof SLA_STATE)[number];

/** Point values awarded for actions (README Section 21). */
export const POINTS = {
  COMPLAINT_SUBMITTED: 10,
  USEFUL_PHOTO: 5,
  RESOLUTION_VERIFIED: 5,
  DUPLICATE_IDENTIFIED: 3,
  HELPFUL_COMMENT: 2,
  PENALTY_FALSE_REPORT: -10,
} as const;

/** Badges (README Section 21). */
export const BADGE_NAMES = [
  'FIRST_REPORT',
  'CIVIC_STARTER',
  'NEIGHBORHOOD_HELPER',
  'VERIFIED_CONTRIBUTOR',
  'CLEAN_STREETS_CHAMPION',
  'COMMUNITY_WATCHER',
  'CONSISTENT_CITIZEN',
] as const;
export type BadgeName = (typeof BADGE_NAMES)[number];

/** User roles. */
export const USER_ROLES = ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN', 'OFFICIAL', 'CITIZEN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Comment visibility. */
export const COMMENT_VISIBILITY = ['PUBLIC', 'INTERNAL'] as const;
export type CommentVisibility = (typeof COMMENT_VISIBILITY)[number];

/** Notification event types. */
export const NOTIFICATION_TYPE = [
  'COMPLAINT_SUBMITTED',
  'COMPLAINT_ASSIGNED',
  'STATUS_CHANGED',
  'OFFICIAL_COMMENT',
  'MARKED_RESOLVED',
  'VERIFICATION_REQUESTED',
  'REOPENED',
  'REWARD_EARNED',
  'BADGE_UNLOCKED',
  'SLA_WARNING',
  'VERIFIED',
  'REJECTED',
  'DUPLICATE',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPE)[number];

/** Points transaction types. */
export const POINTS_TRANSACTION_TYPE = ['EARN', 'SPEND', 'PENALTY'] as const;
export type PointsTransactionType = (typeof POINTS_TRANSACTION_TYPE)[number];