import { ComplaintStatus, UserRole } from '../../constants';
import { ApiError } from '../../utils/ApiError';

/**
 * Allowed transitions per the complaint lifecycle (README Section 24).
 *
 * SUBMITTED → UNDER_REVIEW → ASSIGNED → IN_PROGRESS → RESOLVED → VERIFIED
 * SUBMITTED → REJECTED  |  SUBMITTED → DUPLICATE  |  RESOLVED → REOPENED → IN_PROGRESS
 */
export const TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED', 'DUPLICATE'],
  UNDER_REVIEW: ['ASSIGNED', 'IN_PROGRESS', 'REJECTED', 'DUPLICATE'],
  ASSIGNED: ['IN_PROGRESS', 'REJECTED', 'DUPLICATE', 'UNDER_REVIEW'],
  IN_PROGRESS: ['RESOLVED', 'REJECTED', 'DUPLICATE'],
  RESOLVED: ['VERIFIED', 'REOPENED'],
  VERIFIED: [],
  REOPENED: ['IN_PROGRESS'],
  REJECTED: [],
  DUPLICATE: [],
};

/** Who may perform each transition (README Section 24 status table). */
const TRANSITION_PERMISSIONS: Partial<Record<ComplaintStatus, UserRole[]>> = {
  UNDER_REVIEW: ['OFFICIAL', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'],
  ASSIGNED: ['OFFICIAL', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'],
  IN_PROGRESS: ['OFFICIAL', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'],
  RESOLVED: ['OFFICIAL', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'],
  REJECTED: ['OFFICIAL', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'],
  DUPLICATE: ['OFFICIAL', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'],
  VERIFIED: ['CITIZEN', 'SYSTEM_ADMIN'],
  // Reopening a resolved complaint mirrors VERIFIED: the complaining citizen
  // or an admin. Without this entry `TRANSITION_PERMISSIONS[REOPENED]` fell
  // back to `[]` and the transition was denied for everyone.
  REOPENED: ['CITIZEN', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'],
  // Resubmitting a rejected complaint (REJECTED → SUBMITTED) is citizen-driven.
  SUBMITTED: ['CITIZEN', 'OFFICIAL', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'],
};

export type PermissionGranted =
  | { allowed: true }
  | { allowed: false; reason: string };

export function canTransition(
  from: ComplaintStatus,
  to: ComplaintStatus,
  actorRole: UserRole,
  opts?: { isCreator?: boolean },
): PermissionGranted {
  const allowedTargets = TRANSITIONS[from] ?? [];
  if (!allowedTargets.includes(to)) {
    return { allowed: false, reason: `Cannot move a complaint from ${from} to ${to}` };
  }

  const allowedRoles = TRANSITION_PERMISSIONS[to] ?? [];
  if (!allowedRoles.includes(actorRole)) {
    return { allowed: false, reason: `Only ${allowedRoles.join(', ')} can set ${to}` };
  }

  if (to === 'VERIFIED' && !opts?.isCreator && actorRole === 'CITIZEN') {
    return { allowed: false, reason: 'Only the complaint author can verify on behalf of a citizen' };
  }

  if (to === 'REOPENED' && !opts?.isCreator && actorRole === 'CITIZEN') {
    return { allowed: false, reason: 'Only the complaint author can reopen a resolved complaint' };
  }

  return { allowed: true };
}

export function isTerminal(status: ComplaintStatus): boolean {
  return ['RESOLVED', 'VERIFIED', 'REJECTED', 'DUPLICATE'].includes(status);
}

export function isValidStatus(value: string): value is ComplaintStatus {
  return Object.keys(TRANSITIONS).includes(value);
}

export function assertTransitionAllowed(
  from: ComplaintStatus,
  to: ComplaintStatus,
  actorRole: UserRole,
  opts?: { isCreator?: boolean },
): void {
  const result = canTransition(from, to, actorRole, opts);
  if (!result.allowed) {
    throw ApiError.badRequest(result.reason, 'INVALID_STATUS_TRANSITION');
  }
}

/** Map a human-readable role to the closest ComplaintActor role constants. */
export function normalizeRole(role: UserRole): UserRole {
  return role;
}