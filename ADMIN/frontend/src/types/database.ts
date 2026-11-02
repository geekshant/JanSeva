// ===========================================================================
// JanMitra — Supabase Database Contract
// ===========================================================================
//
// This file is the single source of truth for the database schema types used
// across the admin dashboard. It is split into two sections:
//
// 1. EXISTING TABLES — auto-generated from the live Supabase database via
//    `supabase gen types typescript`. These match the shared project that the
//    JanMitra mobile app also uses. Do NOT hand-edit the generated section.
//
// 2. PREPARED TABLES — type definitions for tables that will be added to the
//    shared schema in a later step (departments, officers, sla_rules, etc.).
//    Services reference these types now so the UI can be built against the
//    intended contract before the migrations land. Each prepared table is
//    clearly marked with a "PREPARED — not yet in database" comment.
//
// ===========================================================================

// ---------------------------------------------------------------------------
// Shared JSON helper (from Supabase generated types)
// ---------------------------------------------------------------------------
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Enums (from the live database)
// ---------------------------------------------------------------------------
export type ComplaintStatus =
  | 'SUBMITTED'
  | 'AUTO_VALIDATING'
  | 'NEEDS_REVIEW'
  | 'VERIFIED'
  | 'ASSIGNED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'RESOLUTION_SUBMITTED'
  | 'RESOLUTION_UNDER_REVIEW'
  | 'COMMUNITY_VERIFICATION'
  | 'RESOLVED'
  | 'REOPENED'
  | 'ESCALATED'
  | 'REJECTED'
  | 'CLOSED'
  | 'AI_CHECKING'
  | 'AI_VERIFIED'
  | 'AI_REVIEW_REQUIRED'
  | 'AI_FAILED'
  | 'EVIDENCE_REQUIRED';

export type ComplaintSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Platform = 'android' | 'ios' | 'web' | 'unknown';

/** Verification status for community verification workflow. */
export type VerificationStatus = 'pending' | 'confirmed' | 'reopened' | 'needs_review';

export const COMPLAINT_STATUSES: ComplaintStatus[] = [
  'SUBMITTED',
  'AUTO_VALIDATING',
  'NEEDS_REVIEW',
  'VERIFIED',
  'ASSIGNED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'RESOLUTION_SUBMITTED',
  'RESOLUTION_UNDER_REVIEW',
  'COMMUNITY_VERIFICATION',
  'RESOLVED',
  'REOPENED',
  'ESCALATED',
  'REJECTED',
  'CLOSED',
  'AI_CHECKING',
  'AI_VERIFIED',
  'AI_REVIEW_REQUIRED',
  'AI_FAILED',
  'EVIDENCE_REQUIRED',
];

export const COMPLAINT_SEVERITIES: ComplaintSeverity[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

// ---------------------------------------------------------------------------
// EXISTING TABLES — Row types (from the live database)
// ---------------------------------------------------------------------------

/** public.profiles */
export interface ProfileRow {
  id: string;
  auth_user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  points: number;
  level: number;
  is_suspended: boolean;
  suspended_at: string | null;
  suspended_by: string | null;
  suspension_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  auth_user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  points?: number;
  level?: number;
}

export interface ProfileUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_suspended?: boolean;
  suspended_at?: string | null;
  suspended_by?: string | null;
  suspension_reason?: string | null;
}

/** public.categories */
export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  created_at: string;
}

export interface CategoryInsert {
  name: string;
  description?: string | null;
  icon?: string | null;
  active?: boolean;
}

export interface CategoryUpdate {
  name?: string;
  description?: string | null;
  icon?: string | null;
  active?: boolean;
}

/** public.complaints */
export interface ComplaintRow {
  id: string;
  complaint_number: string;
  user_id: string;
  category_id: string;
  title: string;
  description: string | null;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  location: unknown;
  address: string | null;
  ward: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  sla_deadline: string | null;
  assigned_department_id: string | null;
  assigned_officer_id: string | null;
  verification_status: VerificationStatus | null;
  incident_id: string | null;
  idempotency_key: string | null;
  auto_verified: boolean | null;
  auto_assigned: boolean | null;
  ai_category_confidence: number | null;
  resolution_confidence: number | null;
  escalation_level: number | null;
  routing_confidence: number | null;
  routing_method: string | null;
}

export interface ComplaintInsert {
  user_id: string;
  category_id: string;
  title: string;
  description?: string | null;
  severity?: ComplaintSeverity;
  status?: ComplaintStatus;
  address?: string | null;
  location?: unknown;
  sla_deadline?: string | null;
}

export interface ComplaintUpdate {
  title?: string;
  description?: string | null;
  severity?: ComplaintSeverity;
  status?: ComplaintStatus;
  address?: string | null;
  resolved_at?: string | null;
  sla_deadline?: string | null;
}

/** public.complaint_images */
export interface ComplaintImageRow {
  id: string;
  complaint_id: string;
  storage_path: string;
  image_url: string;
  created_at: string;
}

export interface ComplaintImageInsert {
  complaint_id: string;
  storage_path: string;
  image_url: string;
}

/** public.complaint_status_history */
export interface ComplaintStatusHistoryRow {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  comment: string | null;
  updated_by: string | null;
  created_at: string;
}

export interface ComplaintStatusHistoryInsert {
  complaint_id: string;
  status: ComplaintStatus;
  comment?: string | null;
  updated_by?: string | null;
}

/** public.rewards */
export interface RewardRow {
  id: string;
  user_id: string;
  complaint_id: string | null;
  activity_type: string;
  points: number;
  description: string | null;
  created_at: string;
}

export interface RewardInsert {
  user_id: string;
  activity_type: string;
  complaint_id?: string | null;
  points?: number;
  description?: string | null;
}

/** public.badges */
export interface BadgeRow {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  criteria: string | null;
  active: boolean;
  created_at: string;
}

export interface BadgeInsert {
  name: string;
  description?: string | null;
  icon?: string | null;
  criteria?: string | null;
  active?: boolean;
}

export interface BadgeUpdate {
  name?: string;
  description?: string | null;
  icon?: string | null;
  criteria?: string | null;
  active?: boolean;
}

/** public.user_badges */
export interface UserBadgeRow {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface UserBadgeInsert {
  user_id: string;
  badge_id: string;
}

/** public.notifications */
export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  complaint_id: string | null;
  data: Json | null;
  push_sent: boolean;
}

export interface NotificationUpdate {
  is_read?: boolean;
  read_at?: string | null;
}

/** public.notification_config — admin-configured event-type preferences */
export interface NotificationConfigRow {
  id: string;
  event_type: string;
  label: string;
  description: string | null;
  in_app_enabled: boolean;
  push_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationConfigUpdate {
  in_app_enabled?: boolean;
  push_enabled?: boolean;
  label?: string;
  description?: string | null;
}

/** public.device_tokens */
export interface DeviceTokenRow {
  id: string;
  user_id: string;
  token: string;
  platform: Platform;
  created_at: string;
  last_used_at: string;
}

/** public.reward_rules */
export interface RewardRuleRow {
  activity_type: string;
  title: string;
  points: number;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RewardRuleInsert {
  activity_type: string;
  title: string;
  points: number;
  description?: string | null;
  active?: boolean;
}

export interface RewardRuleUpdate {
  title?: string;
  points?: number;
  description?: string | null;
  active?: boolean;
}

/** public.level_config */
export interface LevelConfigRow {
  level: number;
  title: string;
  min_points: number;
  created_at: string;
}

export interface LevelConfigInsert {
  level: number;
  title: string;
  min_points: number;
}

export interface LevelConfigUpdate {
  title?: string;
  min_points?: number;
}

// ---------------------------------------------------------------------------
// PREPARED TABLES — not yet in the database. Types are defined so services
// and UI can be built against the intended contract. Migrations will be
// applied in a later step. Each is clearly marked.
// ---------------------------------------------------------------------------

/** public.departments — NOW IN DATABASE */
export interface DepartmentRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  category_mappings: string[];
  service_area: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DepartmentInsert {
  name: string;
  code: string;
  description?: string | null;
  category_mappings?: string[];
  service_area?: string | null;
  active?: boolean;
}

export interface DepartmentUpdate {
  name?: string;
  code?: string;
  description?: string | null;
  category_mappings?: string[];
  service_area?: string | null;
  active?: boolean;
}

/** public.officers — NOW IN DATABASE */
export type OfficerRole = 'DEPARTMENT_ADMIN' | 'OFFICER';
export type OfficerAvailability = 'AVAILABLE' | 'BUSY' | 'ON_LEAVE' | 'INACTIVE';

export interface OfficerRow {
  id: string;
  profile_id: string;
  department_id: string | null;
  role: OfficerRole;
  title: string | null;
  employee_id: string | null;
  ward: string | null;
  service_area: string | null;
  availability_status: OfficerAvailability;
  max_active_complaints: number;
  active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfficerInsert {
  profile_id: string;
  department_id?: string | null;
  role: OfficerRole;
  title?: string | null;
  employee_id?: string | null;
  ward?: string | null;
  service_area?: string | null;
  availability_status?: OfficerAvailability;
  max_active_complaints?: number;
  active?: boolean;
}

export interface OfficerUpdate {
  department_id?: string | null;
  role?: OfficerRole;
  title?: string | null;
  employee_id?: string | null;
  ward?: string | null;
  service_area?: string | null;
  availability_status?: OfficerAvailability;
  max_active_complaints?: number;
  active?: boolean;
}

/** public.complaint_assignments — NOW IN DATABASE */
export interface ComplaintAssignmentRow {
  id: string;
  complaint_id: string;
  department_id: string;
  officer_id: string | null;
  assigned_by: string | null;
  assignment_method: 'AUTO' | 'ADMIN' | 'OFFICER_REASSIGNMENT' | 'ESCALATION' | 'SYSTEM_REASSIGNMENT';
  assignment_reason: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REASSIGNED';
  assigned_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** public.sla_rules — NOW IN DATABASE */
export interface SlaRuleRow {
  id: string;
  category_id: string | null;
  department_id: string | null;
  severity: ComplaintSeverity;
  deadline_hours: number;
  warning_hours: number;
  critical_hours: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlaRuleInsert {
  category_id?: string | null;
  department_id?: string | null;
  severity: ComplaintSeverity;
  deadline_hours: number;
  warning_hours?: number;
  critical_hours?: number;
  active?: boolean;
}

export interface SlaRuleUpdate {
  deadline_hours?: number;
  warning_hours?: number;
  critical_hours?: number;
  active?: boolean;
}

/** PREPARED — not yet in database. public.sla_events */
export interface SlaEventRow {
  id: string;
  complaint_id: string;
  event_type: 'CREATED' | 'DEADLINE_EXTENDED' | 'BREACHED' | 'RESOLVED';
  note: string | null;
  created_at: string;
}

export interface SlaEventInsert {
  complaint_id: string;
  event_type: SlaEventRow['event_type'];
  note?: string | null;
}

/** PREPARED — not yet in database. public.wards */
export interface WardRow {
  id: string;
  name: string;
  code: string;
  boundary: unknown; // PostGIS geography
  created_at: string;
  updated_at: string;
}

export interface WardInsert {
  name: string;
  code: string;
  boundary?: unknown;
}

/** public.civic_incidents — groups complaints about the same real-world problem */
export interface CivicIncidentRow {
  id: string;
  incident_number: string;
  title: string;
  description: string | null;
  category_id: string | null;
  assigned_department_id: string | null;
  status: 'active' | 'merged' | 'resolved' | 'closed';
  severity: ComplaintSeverity;
  location: unknown;
  address: string | null;
  ward: string | null;
  report_count: number;
  citizen_count: number;
  photo_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CivicIncidentInsert {
  title: string;
  description?: string | null;
  category_id?: string | null;
  assigned_department_id?: string | null;
  severity?: ComplaintSeverity;
  location?: unknown;
  address?: string | null;
  ward?: string | null;
  created_by?: string | null;
}

export interface CivicIncidentUpdate {
  title?: string;
  description?: string | null;
  category_id?: string | null;
  assigned_department_id?: string | null;
  status?: 'active' | 'merged' | 'resolved' | 'closed';
  severity?: ComplaintSeverity;
  location?: unknown;
  address?: string | null;
  ward?: string | null;
}

/** public.duplicate_links — links complaints to incidents */
export interface DuplicateLinkRow {
  id: string;
  complaint_id: string;
  incident_id: string;
  link_type: 'original' | 'duplicate' | 'merged';
  linked_by: string | null;
  linked_at: string;
}

export interface DuplicateLinkInsert {
  complaint_id: string;
  incident_id: string;
  link_type?: 'original' | 'duplicate' | 'merged';
  linked_by?: string | null;
}

/** Civic incident with joined relations for list/detail views. */
export interface CivicIncidentWithRelations extends CivicIncidentRow {
  categories: { id: string; name: string } | null;
  departments: { id: string; name: string; code: string } | null;
}

/** public.community_verifications — citizen responses on resolution validity */
export interface CommunityVerificationRow {
  id: string;
  complaint_id: string;
  user_id: string;
  verified: boolean;
  comment: string | null;
  created_at: string;
}

export interface CommunityVerificationInsert {
  complaint_id: string;
  user_id: string;
  verified: boolean;
  comment?: string | null;
}

/** Community verification with citizen profile joined. */
export interface CommunityVerificationWithProfile extends CommunityVerificationRow {
  profiles: { id: string; name: string; avatar_url: string | null } | null;
}

/** public.resolution_evidence — "after" images uploaded when a complaint is resolved */
export interface ResolutionEvidenceRow {
  id: string;
  complaint_id: string;
  storage_path: string;
  image_url: string;
  uploaded_by: string | null;
  caption: string | null;
  created_at: string;
}

export interface ResolutionEvidenceInsert {
  complaint_id: string;
  storage_path: string;
  image_url: string;
  uploaded_by: string | null;
  caption?: string | null;
}

/** public.audit_logs */
export type AuditAction =
  | 'COMPLAINT_STATUS_CHANGED'
  | 'COMPLAINT_ASSIGNED'
  | 'OFFICER_CREATED'
  | 'OFFICER_DEACTIVATED'
  | 'DEPARTMENT_CREATED'
  | 'DEPARTMENT_UPDATED'
  | 'DEPARTMENT_DEACTIVATED'
  | 'SLA_RULE_CREATED'
  | 'SLA_RULE_UPDATED'
  | 'SLA_RULE_DELETED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'BADGE_CREATED'
  | 'BADGE_UPDATED'
  | 'REWARD_RULE_CREATED'
  | 'REWARD_RULE_UPDATED'
  | 'NOTIFICATION_CONFIG_UPDATED'
  | 'USER_DEACTIVATED'
  | 'USER_SUSPENDED'
  | 'USER_RESTORED'
  | 'BADGE_AWARDED'
  | 'CONFIG_CHANGED';

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  department_id: string | null;
  before: Json | null;
  after: Json | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  actor_id?: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id?: string | null;
  department_id?: string | null;
  before?: Json | null;
  after?: Json | null;
  ip?: string | null;
  user_agent?: string | null;
}

// ---------------------------------------------------------------------------
// Composite / DTO types — for joined queries and UI convenience
// ---------------------------------------------------------------------------

/** Citizen aggregated stats (from get_citizen_stats RPC). */
export interface CitizenStats {
  total_complaints: number;
  verified_reports: number;
  resolved_reports: number;
  rejected_reports: number;
  badge_count: number;
  reward_count: number;
  total_points: number;
}

/** User badge with badge definition joined. */
export interface CitizenBadge extends UserBadgeRow {
  badges: { id: string; name: string; description: string | null; icon: string | null } | null;
}

/** Reward (points transaction) row for the participation history. */
export interface CitizenReward extends RewardRow {}

/** Complaint with its related profile + category + images + department + officer + AI verification */
export interface ComplaintWithRelations extends ComplaintRow {
  profiles: { id: string; name: string; avatar_url: string | null } | null;
  categories: { id: string; name: string; icon: string | null } | null;
  complaint_images: ComplaintImageRow[];
  departments: { id: string; name: string; code: string } | null;
  officers: {
    id: string;
    title: string | null;
    profile_id: string;
    availability_status: string | null;
    ward: string | null;
    profiles: { id: string; name: string } | null;
  } | null;
  complaint_ai_verification: ComplaintAiVerificationSummary[] | null;
}

/** AI verification summary as selected by the complaint list query. */
export interface ComplaintAiVerificationSummary {
  ai_decision: AiDecision | null;
  reason: string | null;
  status: string | null;
  category_match: AiMatchLevel | null;
  evidence_quality: AiEvidenceQuality | null;
  image_count: number | null;
  detected_category: string | null;
  selected_category: string | null;
  description_match: AiMatchLevel | null;
  review_decision: string | null;
}

/** Officer with joined profile + department info */
export interface OfficerWithRelations extends OfficerRow {
  profiles: { id: string; name: string; email: string | null; phone: string | null; avatar_url: string | null } | null;
  departments: { id: string; name: string; code: string } | null;
}

// ---------------------------------------------------------------------------
// SLA helper types
// ---------------------------------------------------------------------------
export type SlaState = 'ON_TRACK' | 'DUE_SOON' | 'AT_RISK' | 'BREACHED' | 'ESCALATED' | 'RESOLVED';

export interface SlaSummary {
  on_track: number;
  due_soon: number;
  at_risk: number;
  breached: number;
  escalated: number;
  resolved: number;
}

/**
 * Computes SLA state from the stored deadline timestamp and complaint status.
 * Does NOT use browser timers — relies on the server-stored `sla_deadline`
 * and the current time at render. The deadline is authoritative because it
 * was set server-side when the complaint was created.
 *
 * Stages:
 *   ON_TRACK  — more than warning_hours remaining
 *   DUE_SOON  — within warning_hours of deadline
 *   AT_RISK   — within critical_hours of deadline
 *   BREACHED  — past deadline, still active
 *   ESCALATED — severity has been set to HIGH (escalation flag)
 *   RESOLVED  — complaint is RESOLVED or REJECTED
 */
export function computeSlaState(
  deadline: string | null,
  status: ComplaintStatus,
  severity?: ComplaintSeverity | null,
  warningHours = 24,
  criticalHours = 12,
): SlaState {
  if (status === 'RESOLVED' || status === 'REJECTED') return 'RESOLVED';
  if (severity === 'HIGH' || severity === 'CRITICAL') {
    // Check if it was escalated (HIGH severity on an active complaint
    // that also has a breach is escalated; just HIGH alone may be original)
    // We check breach first — if breached AND high, it's escalated.
  }
  if (!deadline) return 'ON_TRACK';
  const now = Date.now();
  const due = new Date(deadline).getTime();
  const warningMs = warningHours * 60 * 60 * 1000;
  const criticalMs = criticalHours * 60 * 60 * 1000;
  if (due < now) {
    // Past deadline — breached or escalated
    if (severity === 'HIGH' || severity === 'CRITICAL') return 'ESCALATED';
    return 'BREACHED';
  }
  if (due < now + criticalMs) return 'AT_RISK';
  if (due < now + warningMs) return 'DUE_SOON';
  return 'ON_TRACK';
}

/** Officer/admin decision for AI review — passed to `officer_review_complaint` RPC. */
export type OfficerAiDecision = 'VERIFIED' | 'REJECTED' | 'EVIDENCE_REQUIRED';

/**
 * Machine-readable reason categories for each review decision.
 * Stored in `complaint_ai_verification.review_reason_type` and the audit log.
 * The UI maps these to human-readable labels; never use the UI text as the
 * stored value.
 */
export type VerifyReasonType =
  | 'evidence_match'
  | 'ai_support'
  | 'sufficient_evidence'
  | 'details_consistent'
  | 'other';

export type RejectReasonType =
  | 'evidence_mismatch'
  | 'category_mismatch'
  | 'insufficient_evidence'
  | 'duplicate'
  | 'other';

export type EvidenceReasonType =
  | 'image_quality'
  | 'missing_angles'
  | 'not_visible'
  | 'additional_required'
  | 'other';

export type ReviewReasonType = VerifyReasonType | RejectReasonType | EvidenceReasonType;

/** AI decision returned by `get_complaints_for_ai_review` / `get_ai_verification`. */
export type AiDecision = 'PASS' | 'REVIEW' | 'FAIL';

/** AI match level for category / description match. */
export type AiMatchLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

/** AI evidence quality level. */
export type AiEvidenceQuality = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';

/** AI image diversity level. */
export type AiImageDiversity = 'GOOD' | 'MODERATE' | 'POOR';

/** Manual review threshold. */
export type AiReviewThreshold = 'LOW' | 'MEDIUM' | 'HIGH';

/** Complaint row as returned by `get_complaints_for_ai_review` RPC (JSONB). */
export interface AiReviewQueueItem {
  id: string;
  complaint_number: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  address: string | null;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  requires_human_review: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
  submitter_name: string | null;
  // AI analysis (latest verification record, may be null if AI hasn't run).
  ai_decision: AiDecision | null;
  ai_status: string | null;            // 'pending' | 'analyzing' | 'completed' | 'error'
  ai_confidence: AiMatchLevel | null;  // alias for category_match (HIGH/MEDIUM/LOW/NONE)
  evidence_quality: AiEvidenceQuality | null;
  description_match: AiMatchLevel | null;
  category_match: AiMatchLevel | null;
  detected_category: string | null;
  selected_category: string | null;
  image_count: number | null;
  unique_image_count: number | null;
  ai_reason: string | null;
  ai_error: string | null;
  ai_reviewed: boolean;
  images: { id: string; url: string | null; path: string | null }[] | null;
}

/**
 * Reason categories for reopening a complaint. Stored in
 * `complaints.reopen_reason` (as the human-readable label) and in the
 * audit log `after.reopen_reason_type` (as the machine-readable enum).
 */
export type ReopenReasonType =
  | 'resolution_unsatisfactory'
  | 'issue_persists'
  | 'problem_returned'
  | 'incorrectly_resolved'
  | 'new_evidence'
  | 'other';

/** Complaint row as returned by `get_reopened_complaints` RPC (JSONB). */
export interface ReopenedComplaintItem {
  id: string;
  complaint_number: string;
  title: string;
  category_id: string | null;
  category_name: string | null;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  address: string | null;
  created_at: string;
  reopened_at: string | null;
  reopened_by: string | null;
  reopen_reason: string | null;
  previous_status: string | null;
  previous_resolution: string | null;
  reopener_name: string | null;
  submitter_name: string | null;
  images: { id: string; url: string | null; path: string | null }[] | null;
  resolution_evidence:
    | {
        id: string;
        url: string | null;
        path: string | null;
        caption: string | null;
        created_at: string;
      }[]
    | null;
}

/** AI verification analysis returned by `get_ai_verification` RPC (JSONB). */
export interface AiVerificationResult {
  complaint_id: string;
  ai_decision: AiDecision | null;
  reason: string | null;
  category_match: AiMatchLevel | null;
  evidence_quality: AiEvidenceQuality | null;
  image_diversity: AiImageDiversity | null;
  description_match: AiMatchLevel | null;
  evidence_images: ComplaintImageRow[] | null;
}

/** `category_ai_config` row joined with `categories`. */
export interface CategoryAiConfigRow {
  id: string;
  category_id: string;
  requires_images: boolean;
  min_images: number;
  max_images: number;
  requires_different_angles: boolean;
  ai_enabled: boolean;
  auto_pass: boolean;
  auto_fail: boolean;
  review_threshold: AiReviewThreshold;
  category_hints: string | null;
  created_at: string;
  updated_at: string;
  categories: { id: string; name: string } | null;
}

/** Parameters for `update_category_ai_config` RPC. */
export interface UpdateCategoryAiConfigInput {
  p_category_id: string;
  p_requires_images: boolean;
  p_min_images: number;
  p_max_images: number;
  p_requires_different_angles: boolean;
  p_ai_enabled: boolean;
  p_auto_pass: boolean;
  p_auto_fail: boolean;
  p_review_threshold: AiReviewThreshold;
  p_category_hints: string | null;
}

// ---------------------------------------------------------------------------
// Analytics types
// ---------------------------------------------------------------------------
export interface AnalyticsSummary {
  total: number;
  open: number;
  resolved: number;
  rejected: number;
  citizens: number;
  resolution_rate: number;
  avg_resolution_hours: number | null;
  median_resolution_hours: number | null;
  reopened_count: number;
  reopened_rate: number;
  escalation_count: number;
  escalation_rate: number;
  sla: SlaSummary;
  sla_compliance_rate: number;
}

export interface TrendBucket {
  date: string;
  submitted: number;
  resolved: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
}

export interface StatusBreakdown {
  status: ComplaintStatus;
  count: number;
}

export interface SeverityBreakdown {
  severity: ComplaintSeverity;
  count: number;
}

export interface HotZone {
  lat: number;
  lng: number;
  complaint_count: number;
  top_category: string | null;
  top_severity: string | null;
}

export interface DepartmentAnalytics {
  department_id: string | null;
  department_name: string;
  department_code: string;
  total: number;
  resolved: number;
  in_progress: number;
  pending: number;
  resolution_rate: number;
  avg_resolution_hours: number;
  sla_breached: number;
  sla_compliance_rate: number;
}

export interface WardAnalytics {
  ward: string;
  total: number;
  resolved: number;
  pending: number;
  active: number;
  resolution_rate: number;
  top_category: string | null;
  recurring_count: number;
}

export interface CivicHealth {
  total_citizens: number;
  active_citizens: number;
  total_complaints: number;
  resolution_rate: number;
  avg_resolution_hours: number | null;
  engagement_rate: number;
  civic_health_score: number;
}

export interface FullAnalytics {
  summary: AnalyticsSummary;
  by_category: CategoryBreakdown[];
  by_status: StatusBreakdown[];
  by_severity: SeverityBreakdown[];
  trends: TrendBucket[];
  hot_zones: HotZone[];
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

// ---------------------------------------------------------------------------
// Automation Engine types
// ---------------------------------------------------------------------------
export type AutomationEventType =
  | 'COMPLAINT_CREATED'
  | 'COMPLAINT_VERIFIED'
  | 'COMPLAINT_ASSIGNED'
  | 'COMPLAINT_ACKNOWLEDGED'
  | 'WORK_STARTED'
  | 'EVIDENCE_UPLOADED'
  | 'RESOLUTION_SUBMITTED'
  | 'COMMUNITY_RESPONSE_RECEIVED'
  | 'SLA_WARNING'
  | 'SLA_BREACHED'
  | 'COMPLAINT_REOPENED'
  | 'STATUS_CHANGED';

export type AutomationActionType =
  | 'AUTO_VERIFY'
  | 'AUTO_ASSIGN'
  | 'SET_SLA'
  | 'SLA_WARNING'
  | 'ESCALATE'
  | 'REQUEST_COMMUNITY_VERIFICATION'
  | 'AUTO_RESOLVE'
  | 'AUTO_REOPEN'
  | 'NOTIFY'
  | 'FLAG_FOR_REVIEW';

export type AutomationExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'retrying';

/** public.automation_rules */
export interface AutomationRuleRow {
  id: string;
  name: string;
  description: string | null;
  event_type: AutomationEventType;
  condition_json: Json;
  action_type: AutomationActionType;
  action_config: Json;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationRuleUpdate {
  name?: string;
  description?: string | null;
  condition_json?: Json;
  action_config?: Json;
  enabled?: boolean;
  priority?: number;
}

/** public.automation_executions */
export interface AutomationExecutionRow {
  id: string;
  complaint_id: string | null;
  incident_id: string | null;
  rule_id: string | null;
  event_type: string;
  status: AutomationExecutionStatus;
  idempotency_key: string;
  attempt: number;
  max_attempts: number;
  result: Json | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

/** public.automation_audit_log */
export interface AutomationAuditLogRow {
  id: string;
  complaint_id: string | null;
  incident_id: string | null;
  execution_id: string | null;
  rule_id: string | null;
  event_type: string;
  action_type: string;
  previous_status: string | null;
  new_status: string | null;
  reason: string | null;
  confidence: number | null;
  evidence: Json | null;
  actor: string;
  executed_at: string;
}

/** DTO for the automation_stats RPC response. */
export interface AutomationStats {
  executions: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    pending: number;
    exec_today: number;
    exec_this_week: number;
    avg_duration_ms: number;
    last_success_at: string | null;
    last_failed_at: string | null;
  };
  complaints: {
    total: number;
    auto_verified: number;
    auto_assigned: number;
    escalated: number;
    needs_review: number;
    community_verification: number;
    resolved: number;
    closed: number;
    reopened: number;
    sla_breached: number;
  };
  by_action_type: Record<string, number> | null;
  recent_activity: AutomationAuditLogEntry[];
  rules: AutomationRuleSummary[];
  rules_summary?: {
    total: number;
    active_rules: number;
    disabled_rules: number;
  };
}

export interface AutomationAuditLogEntry {
  id: string;
  complaint_id: string;
  complaint_number: string;
  event_type: string;
  action_type: string;
  previous_status: string | null;
  new_status: string | null;
  reason: string | null;
  confidence: number | null;
  executed_at: string;
}

export interface AutomationRuleSummary {
  id: string;
  name: string;
  event_type: AutomationEventType;
  action_type: AutomationActionType;
  enabled: boolean;
  priority: number;
}

/** Automation rule with per-rule execution stats (from get_automation_rules_with_stats RPC). */
export interface AutomationRuleWithStats extends AutomationRuleRow {
  execution_count: number;
  success_count: number;
  failure_count: number;
  skipped_count: number;
  last_executed_at: string | null;
}

/** Execution log row (from get_automation_execution_log RPC). */
export interface AutomationExecutionLogEntry {
  id: string;
  complaint_id: string | null;
  incident_id: string | null;
  rule_id: string | null;
  event_type: string;
  status: AutomationExecutionStatus;
  idempotency_key: string;
  attempt: number;
  max_attempts: number;
  result: Json | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  duration_ms: number | null;
  rule_name: string | null;
  rule_action_type: string | null;
  complaint_number: string | null;
  complaint_title: string | null;
  complaint_status: string | null;
}

/** Failed automation row (from get_failed_automations RPC). */
export interface FailedAutomationEntry {
  id: string;
  complaint_id: string | null;
  rule_id: string | null;
  event_type: string;
  status: string;
  attempt: number;
  max_attempts: number;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  rule_name: string | null;
  rule_action_type: string | null;
  complaint_number: string | null;
  complaint_title: string | null;
  complaint_status: string | null;
}

/** Retry RPC response. */
export interface RetryAutomationResult {
  retry_execution_id: string;
  original_execution_id: string;
  complaint_id: string;
  event_type: string;
  attempt: number;
}

// ---------------------------------------------------------------------------
// Women Safety types
// ---------------------------------------------------------------------------

/** Safety alert row from get_active_safety_alerts RPC. */
export interface SafetyAlertEntry {
  id: string;
  incident_id: string;
  user_id: string;
  user_name: string;
  user_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  contacts: Array<{ name: string; phone: string; relationship?: string }> | null;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  incident_type: string;
  incident_status: string;
  message: string | null;
  anonymous: boolean;
  reported_at: string;
  resolved_at: string | null;
  resolved_note: string | null;
  seconds_since_triggered: number;
  // New tracking + assignment fields
  incident_acknowledged_at: string | null;
  response_started_at: string | null;
  assigned_officer_id: string | null;
  assigned_department_id: string | null;
  tracking_started_at: string | null;
  tracking_expires_at: string | null;
  tracking_ended_at: string | null;
  tracking_end_reason: string | null;
  last_latitude: number | null;
  last_longitude: number | null;
  last_accuracy: number | null;
  last_location_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  tracking_seconds_remaining: number;
  tracking_active: boolean;
  assigned_officer_title: string | null;
  assigned_officer_name: string | null;
}

/** Location share row from get_safety_incident_location_shares RPC. */
export interface SafetyLocationShare {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  speed_mps: number | null;
  heading_deg: number | null;
  shared_at: string;
}

/** DTO for the automation_complaint_history RPC response. */
export interface AutomationComplaintHistoryEntry {
  id: string;
  event_type: string;
  action_type: string;
  previous_status: string | null;
  new_status: string | null;
  reason: string | null;
  confidence: number | null;
  evidence: Json | null;
  actor: string;
  executed_at: string;
  rule_name: string | null;
}
