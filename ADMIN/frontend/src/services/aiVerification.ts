import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import type {
  AiReviewQueueItem,
  AiVerificationResult,
  CategoryAiConfigRow,
  OfficerAiDecision,
  ReviewReasonType,
  UpdateCategoryAiConfigInput,
} from '@/types';

// ---------------------------------------------------------------------------
// AI Evidence Verification service — wraps the RPCs that power the AI
// review queue, per-complaint AI analysis, officer decisions, and per-category
// AI config management.
// ---------------------------------------------------------------------------

/**
 * Fetches complaints that need human review — driven by
 * `requires_human_review = TRUE` (primary) with a status fallback for
 * AI_FAILED / AI_REVIEW_REQUIRED / EVIDENCE_REQUIRED. Returns a JSONB array
 * from the `get_complaints_for_ai_review` RPC.
 */
export async function getComplaintsForAiReview(
  limit = 50,
  offset = 0,
  client?: SupabaseClient,
): Promise<AiReviewQueueItem[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_complaints_for_ai_review', {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data ?? []) as AiReviewQueueItem[];
}

/**
 * Exact count of complaints in the AI Review Queue — uses the SAME filter
 * as `getComplaintsForAiReview` (via the `get_ai_review_queue_count` RPC)
 * so the sidebar badge always matches the page contents.
 */
export async function getAiReviewQueueCount(
  client?: SupabaseClient,
): Promise<number> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_ai_review_queue_count');
  if (error) throw error;
  return (data ?? 0) as number;
}

/**
 * Fetches the full AI verification analysis for a single complaint.
 * Returns a JSONB object from the `get_ai_verification` RPC (or null if none).
 */
export async function getAiVerification(
  complaintId: string,
  client?: SupabaseClient,
): Promise<AiVerificationResult | null> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_ai_verification', {
    p_complaint_id: complaintId,
  });
  if (error) throw error;
  return (data as AiVerificationResult | null) ?? null;
}

/**
 * Submits an officer's/admin's decision on a complaint in AI_REVIEW_REQUIRED
 * status. Calls the `officer_review_complaint` RPC.
 *
 * `reasonType` is the machine-readable enum (e.g. "evidence_match").
 * `reason` is the human-readable text — the predefined label for a fixed
 * option, or the reviewer's custom explanation when `reasonType === 'other'`.
 */
export async function officerReviewComplaint(
  complaintId: string,
  decision: OfficerAiDecision,
  reasonType: ReviewReasonType,
  reason: string,
  evidenceMessage: string | null = null,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db.rpc('officer_review_complaint', {
    p_complaint_id: complaintId,
    p_decision: decision,
    p_reason: reason,
    p_evidence_message: evidenceMessage,
    p_reason_type: reasonType,
  });
  if (error) throw error;
}

/**
 * Lists all categories with their AI verification config.
 * The `category_ai_config` table is joined with `categories`.
 */
export async function listCategoryAiConfigs(
  client?: SupabaseClient,
): Promise<CategoryAiConfigRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('category_ai_config')
    .select(
      `
      *,
      categories ( id, name )
    `,
    )
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CategoryAiConfigRow[];
}

/**
 * Updates the AI verification config for a category.
 * Calls the `update_category_ai_config` RPC.
 */
export async function updateCategoryAiConfig(
  input: UpdateCategoryAiConfigInput,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db.rpc('update_category_ai_config', input);
  if (error) throw error;
}
