import type { ComplaintStatus } from '@/types';

// ===========================================================================
// Complaint Workflow Rules
//
// Defines the legal status transitions and which roles are permitted to
// perform each transition. The workflow is:
//
//   SUBMITTED → VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED
//                                                    ↗
//   Any active status → REJECTED
//
// NOTES:
// - The existing Supabase enum has 6 statuses (no REOPENED). If a complaint
//   needs to go back from RESOLVED, it transitions to IN_PROGRESS.
// - Role checks here are the FRONTEND gate. RLS + service-level checks are
//   the real security boundary. Frontend checks improve UX by hiding
//   unauthorized actions.
// ===========================================================================

export type AdminRole = 'SYSTEM_ADMIN' | 'DEPARTMENT_ADMIN' | 'OFFICER';

/** Legal status transitions — from → [allowed next statuses]. */
export const STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['VERIFIED', 'REJECTED', 'AUTO_VALIDATING'],
  AUTO_VALIDATING: ['VERIFIED', 'NEEDS_REVIEW', 'REJECTED', 'AI_CHECKING', 'AI_FAILED'],
  NEEDS_REVIEW: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['ASSIGNED', 'REJECTED', 'IN_PROGRESS'],
  ASSIGNED: ['ACKNOWLEDGED', 'IN_PROGRESS', 'REJECTED'],
  ACKNOWLEDGED: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['RESOLUTION_SUBMITTED', 'RESOLVED', 'REJECTED'],
  RESOLUTION_SUBMITTED: ['RESOLUTION_UNDER_REVIEW', 'COMMUNITY_VERIFICATION', 'REJECTED'],
  RESOLUTION_UNDER_REVIEW: ['RESOLUTION_SUBMITTED', 'COMMUNITY_VERIFICATION', 'REJECTED'],
  COMMUNITY_VERIFICATION: ['RESOLVED', 'REOPENED', 'REJECTED'],
  RESOLVED: ['IN_PROGRESS', 'REOPENED', 'CLOSED'],
  REOPENED: ['IN_PROGRESS', 'ASSIGNED', 'REJECTED'],
  ESCALATED: ['ACKNOWLEDGED', 'IN_PROGRESS', 'ASSIGNED', 'RESOLVED', 'REJECTED'],
  REJECTED: ['SUBMITTED'],
  CLOSED: ['REOPENED'],
  // AI verification statuses — SYSTEM_ADMIN can manually transition out of
  // any AI state (e.g. when AI analysis failed and the admin wants to
  // verify/reject/review manually).
  AI_CHECKING: ['AI_VERIFIED', 'AI_REVIEW_REQUIRED', 'AI_FAILED', 'EVIDENCE_REQUIRED'],
  AI_VERIFIED: ['ASSIGNED', 'REJECTED', 'VERIFIED'],
  AI_REVIEW_REQUIRED: ['VERIFIED', 'REJECTED', 'EVIDENCE_REQUIRED', 'AI_FAILED', 'ASSIGNED'],
  AI_FAILED: ['AI_REVIEW_REQUIRED', 'VERIFIED', 'REJECTED', 'EVIDENCE_REQUIRED', 'SUBMITTED', 'ASSIGNED'],
  EVIDENCE_REQUIRED: ['AI_CHECKING', 'VERIFIED', 'REJECTED', 'AI_REVIEW_REQUIRED'],
};

/** Which roles can perform each transition. */
export const ROLE_PERMISSIONS: Record<
  AdminRole,
  Partial<Record<ComplaintStatus, ComplaintStatus[]>>
> = {
  SYSTEM_ADMIN: {
    SUBMITTED: ['VERIFIED', 'REJECTED', 'AUTO_VALIDATING'],
    AUTO_VALIDATING: ['VERIFIED', 'NEEDS_REVIEW', 'REJECTED'],
    NEEDS_REVIEW: ['VERIFIED', 'REJECTED'],
    VERIFIED: ['ASSIGNED', 'REJECTED', 'IN_PROGRESS'],
    ASSIGNED: ['ACKNOWLEDGED', 'IN_PROGRESS', 'REJECTED'],
    ACKNOWLEDGED: ['IN_PROGRESS', 'REJECTED'],
    IN_PROGRESS: ['RESOLUTION_SUBMITTED', 'RESOLVED', 'REJECTED'],
    RESOLUTION_SUBMITTED: ['RESOLUTION_UNDER_REVIEW', 'COMMUNITY_VERIFICATION', 'REJECTED'],
    RESOLUTION_UNDER_REVIEW: ['RESOLUTION_SUBMITTED', 'COMMUNITY_VERIFICATION', 'REJECTED'],
    COMMUNITY_VERIFICATION: ['RESOLVED', 'REOPENED', 'REJECTED'],
    RESOLVED: ['IN_PROGRESS', 'REOPENED', 'CLOSED'],
    REOPENED: ['IN_PROGRESS', 'ASSIGNED', 'REJECTED'],
    ESCALATED: ['ACKNOWLEDGED', 'IN_PROGRESS', 'ASSIGNED', 'RESOLVED', 'REJECTED'],
    REJECTED: ['SUBMITTED'],
    CLOSED: ['REOPENED'],
    // SYSTEM_ADMIN has full control over AI verification statuses — can
    // manually verify, reject, request evidence, or move to review when AI
    // analysis has failed or is inconclusive.
    AI_CHECKING: ['AI_VERIFIED', 'AI_REVIEW_REQUIRED', 'AI_FAILED', 'EVIDENCE_REQUIRED'],
    AI_VERIFIED: ['ASSIGNED', 'REJECTED', 'VERIFIED'],
    AI_REVIEW_REQUIRED: ['VERIFIED', 'REJECTED', 'EVIDENCE_REQUIRED', 'AI_FAILED', 'ASSIGNED'],
    AI_FAILED: ['AI_REVIEW_REQUIRED', 'VERIFIED', 'REJECTED', 'EVIDENCE_REQUIRED', 'SUBMITTED', 'ASSIGNED'],
    EVIDENCE_REQUIRED: ['AI_CHECKING', 'VERIFIED', 'REJECTED', 'AI_REVIEW_REQUIRED'],
  },
  DEPARTMENT_ADMIN: {
    SUBMITTED: ['VERIFIED'],
    NEEDS_REVIEW: ['VERIFIED'],
    VERIFIED: ['ASSIGNED', 'REJECTED'],
    ASSIGNED: ['ACKNOWLEDGED', 'IN_PROGRESS'],
    ACKNOWLEDGED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLUTION_SUBMITTED', 'RESOLVED'],
    RESOLUTION_SUBMITTED: ['RESOLUTION_UNDER_REVIEW', 'COMMUNITY_VERIFICATION'],
    RESOLUTION_UNDER_REVIEW: ['RESOLUTION_SUBMITTED', 'COMMUNITY_VERIFICATION'],
    COMMUNITY_VERIFICATION: ['RESOLVED', 'REOPENED'],
    RESOLVED: ['IN_PROGRESS', 'REOPENED'],
    REOPENED: ['IN_PROGRESS', 'ASSIGNED'],
    ESCALATED: ['ACKNOWLEDGED', 'IN_PROGRESS'],
    // Department admins can verify/reject/request-evidence after AI review
    // or AI failure, but cannot override to arbitrary statuses.
    AI_REVIEW_REQUIRED: ['VERIFIED', 'REJECTED', 'EVIDENCE_REQUIRED'],
    AI_FAILED: ['VERIFIED', 'REJECTED', 'EVIDENCE_REQUIRED', 'AI_REVIEW_REQUIRED'],
    AI_VERIFIED: ['ASSIGNED', 'VERIFIED'],
    EVIDENCE_REQUIRED: ['VERIFIED', 'REJECTED'],
  },
  OFFICER: {
    ASSIGNED: ['ACKNOWLEDGED', 'IN_PROGRESS'],
    ACKNOWLEDGED: ['IN_PROGRESS'],
    IN_PROGRESS: ['RESOLUTION_SUBMITTED', 'RESOLVED'],
    RESOLUTION_SUBMITTED: ['RESOLUTION_UNDER_REVIEW'],
    RESOLUTION_UNDER_REVIEW: ['RESOLUTION_SUBMITTED'],
    REOPENED: ['IN_PROGRESS'],
    ESCALATED: ['ACKNOWLEDGED', 'IN_PROGRESS'],
  },
};

/**
 * Returns the list of statuses the given role is allowed to transition to
 * from the current status. Returns an empty array if no transitions are
 * permitted (e.g., OFFICER viewing a SUBMITTED complaint).
 */
export function getAllowedTransitions(
  currentStatus: ComplaintStatus,
  role: AdminRole,
): ComplaintStatus[] {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return [];
  return rolePerms[currentStatus] ?? [];
}

/**
 * Checks whether a specific transition is allowed for the role.
 */
export function isTransitionAllowed(
  from: ComplaintStatus,
  to: ComplaintStatus,
  role: AdminRole,
): boolean {
  return getAllowedTransitions(from, role).includes(to);
}

/** Whether the role can assign/reassign complaints. */
export function canAssign(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'DEPARTMENT_ADMIN';
}

/** Whether the role can escalate complaints. */
export function canEscalate(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'DEPARTMENT_ADMIN';
}

/** Whether the role can add internal notes. */
export function canAddNote(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'DEPARTMENT_ADMIN' || role === 'OFFICER';
}

/** Whether the role can view citizen contact info (email, phone). */
export function canViewCitizenContact(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'DEPARTMENT_ADMIN';
}

/** Whether the role can suspend a citizen account. */
export function canSuspendCitizen(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN';
}

/** Whether the role can restore a suspended citizen account. */
export function canRestoreCitizen(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN';
}

/** Whether the role can delete a citizen account (irreversible). */
export function canDeleteCitizen(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN';
}

/** Whether the role can upload resolution evidence (officers + admins). */
export function canUploadEvidence(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'DEPARTMENT_ADMIN' || role === 'OFFICER';
}

/** Whether the role can reopen a resolved complaint based on community verification. */
export function canReopenComplaint(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'DEPARTMENT_ADMIN';
}

/** Whether the role can view resolution evidence + community verifications. */
export function canViewVerification(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'DEPARTMENT_ADMIN' || role === 'OFFICER';
}

/**
 * Whether the role can manage civic incidents — create incidents, link/unlink
 * complaints, mark duplicates, and merge incidents. Officers can view
 * incidents but only admins can modify them.
 */
export function canManageIncidents(role: AdminRole): boolean {
  return role === 'SYSTEM_ADMIN' || role === 'DEPARTMENT_ADMIN';
}

/** The full ordered workflow for the timeline visual. */
export const WORKFLOW_ORDER: ComplaintStatus[] = [
  'SUBMITTED',
  'AUTO_VALIDATING',
  'VERIFIED',
  'ASSIGNED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLUTION_SUBMITTED',
  'RESOLUTION_UNDER_REVIEW',
  'COMMUNITY_VERIFICATION',
  'RESOLVED',
  'CLOSED',
];
