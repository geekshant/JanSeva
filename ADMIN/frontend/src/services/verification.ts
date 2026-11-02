import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import { logAudit } from './audit';
import type {
  ResolutionEvidenceRow,
  ResolutionEvidenceInsert,
  CommunityVerificationWithProfile,
  ComplaintRow,
  ReopenedComplaintItem,
  ReopenReasonType,
  VerificationStatus,
  Json,
} from '@/types';

// ---------------------------------------------------------------------------
// Verification service — resolution evidence + community verification workflow.
//
// Workflow:
//   1. Officer resolves complaint → status = RESOLVED
//   2. Officer uploads resolution evidence (before/after images)
//   3. Community verification opens (verification_status = 'pending')
//   4. Nearby citizens respond (verified = true/false)
//   5. Admin reviews results → confirmed / reopened / needs_review
// ---------------------------------------------------------------------------

// --- Resolution Evidence ----------------------------------------------------

export async function getResolutionEvidence(
  complaintId: string,
  client?: SupabaseClient,
): Promise<ResolutionEvidenceRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('resolution_evidence')
    .select('*')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ResolutionEvidenceRow[];
}

export async function addResolutionEvidence(
  input: ResolutionEvidenceInsert,
  client?: SupabaseClient,
): Promise<ResolutionEvidenceRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('resolution_evidence')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as ResolutionEvidenceRow;
}

export async function deleteResolutionEvidence(
  id: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db.from('resolution_evidence').delete().eq('id', id);
  if (error) throw error;
}

// --- Community Verifications ------------------------------------------------

export async function getCommunityVerifications(
  complaintId: string,
  client?: SupabaseClient,
): Promise<CommunityVerificationWithProfile[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('community_verifications')
    .select(
      `
      *,
      profiles ( id, name, avatar_url )
    `,
    )
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CommunityVerificationWithProfile[];
}

export interface VerificationSummary {
  total: number;
  verified: number;
  rejected: number;
  verification_rate: number;
  status: VerificationStatus | null;
}

export async function getVerificationSummary(
  complaintId: string,
  client?: SupabaseClient,
): Promise<VerificationSummary> {
  const db = getClient(client);

  const { data: verifications, error } = await db
    .from('community_verifications')
    .select('verified')
    .eq('complaint_id', complaintId);
  if (error) throw error;

  const all = (verifications ?? []) as { verified: boolean }[];
  const total = all.length;
  const verifiedCount = all.filter((v) => v.verified).length;
  const rejectedCount = total - verifiedCount;

  // Get the complaint's verification_status.
  const { data: complaint } = await db
    .from('complaints')
    .select('verification_status')
    .eq('id', complaintId)
    .single();

  return {
    total,
    verified: verifiedCount,
    rejected: rejectedCount,
    verification_rate: total > 0 ? Math.round((verifiedCount / total) * 100) : 0,
    status: (complaint as { verification_status: VerificationStatus | null })?.verification_status ?? null,
  };
}

// --- Verification Status Management -----------------------------------------

/**
 * Opens community verification for a resolved complaint.
 * Sets verification_status = 'pending'.
 */
export async function openVerification(
  complaintId: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db
    .from('complaints')
    .update({ verification_status: 'pending' })
    .eq('id', complaintId);
  if (error) throw error;
}

/**
 * Confirms the resolution — verification_status = 'confirmed'.
 */
export async function confirmResolution(
  complaintId: string,
  adminId: string | null = null,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db
    .from('complaints')
    .update({ verification_status: 'confirmed' })
    .eq('id', complaintId);
  if (error) throw error;

  await logAudit(
    {
      actor_id: adminId,
      action: 'CONFIG_CHANGED',
      entity_type: 'complaint',
      entity_id: complaintId,
      before: { verification_status: 'pending' } as unknown as Json,
      after: { verification_status: 'confirmed' } as unknown as Json,
    },
    client,
  );
}

/**
 * Reopens a resolved/closed/rejected complaint via the `reopen_complaint` RPC.
 *
 * Sets status = REOPENED, records reopened_at / reopened_by / reopen_reason,
 * inserts a status-history entry (via the existing trigger), writes an audit
 * log row, and notifies the citizen. The previous client-side implementation
 * set status = IN_PROGRESS + verification_status = 'reopened', which made
 * the complaint invisible to a status-based "Reopened Cases" query — this
 * RPC-based version is the single source of truth.
 */
export async function reopenComplaint(
  complaintId: string,
  reason: string,
  adminId: string | null = null,
  client?: SupabaseClient,
): Promise<ComplaintRow> {
  const db = getClient(client);
  // `adminId` is kept for signature compatibility with the old hook, but the
  // RPC derives the actor from auth.uid() so we don't pass it through.
  void adminId;
  const { data, error } = await db.rpc('reopen_complaint', {
    p_complaint_id: complaintId,
    p_reason: reason,
    p_reopen_reason_type: 'other',
  });
  if (error) throw error;
  return data as ComplaintRow;
}

/**
 * Reopens a complaint with a structured reason type. Used by the new
 * ReopenComplaintDialog which collects both a reason category and an
 * optional free-text explanation.
 */
export async function reopenComplaintTyped(
  complaintId: string,
  reasonType: ReopenReasonType,
  reason: string,
  client?: SupabaseClient,
): Promise<ComplaintRow> {
  const db = getClient(client);
  const { data, error } = await db.rpc('reopen_complaint', {
    p_complaint_id: complaintId,
    p_reason: reason,
    p_reopen_reason_type: reasonType,
  });
  if (error) throw error;
  return data as ComplaintRow;
}

/**
 * Marks verification as needing further review.
 */
export async function markNeedsReview(
  complaintId: string,
  adminId: string | null = null,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db
    .from('complaints')
    .update({ verification_status: 'needs_review' })
    .eq('id', complaintId);
  if (error) throw error;

  await logAudit(
    {
      actor_id: adminId,
      action: 'CONFIG_CHANGED',
      entity_type: 'complaint',
      entity_id: complaintId,
      before: { verification_status: 'pending' } as unknown as Json,
      after: { verification_status: 'needs_review' } as unknown as Json,
    },
    client,
  );
}

// --- Reopened cases (for admin dashboard) -----------------------------------

/**
 * Lists complaints that are currently in REOPENED status (or that have ever
 * been reopened, via the `reopened_at` column). Uses the
 * `get_reopened_complaints` RPC so the list and the sidebar count share the
 * exact same filter.
 *
 * Returns the rich row shape needed by the Reopened Cases table — including
 * `previous_status`, `previous_resolution`, `reopener_name`, `reopen_reason`,
 * and `reopened_at`.
 */
export async function getReopenedComplaints(
  limit = 100,
  offset = 0,
  client?: SupabaseClient,
): Promise<ReopenedComplaintItem[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_reopened_complaints', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as ReopenedComplaintItem[];
}

/** Exact count of reopened complaints — same filter as `getReopenedComplaints`. */
export async function getReopenedComplaintsCount(
  client?: SupabaseClient,
): Promise<number> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_reopened_complaints_count');
  if (error) throw error;
  return (data ?? 0) as number;
}
