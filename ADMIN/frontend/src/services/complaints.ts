import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient, paginate, buildPage } from './base';
import { logAudit } from './audit';
import type {
  ComplaintRow,
  ComplaintUpdate,
  ComplaintImageRow,
  ComplaintStatusHistoryRow,
  ComplaintStatusHistoryInsert,
  ComplaintWithRelations,
  ComplaintStatus,
  ComplaintSeverity,
  Json,
  Paged,
  ListParams,
} from '@/types';
import { computeSlaState } from '@/types';

// ---------------------------------------------------------------------------
// Complaints service — all complaint-related database access.
// ---------------------------------------------------------------------------

export type SortField = 'newest' | 'oldest' | 'priority' | 'sla';
export type SlaFilter = 'all' | 'on_track' | 'due_soon' | 'overdue' | 'resolved';

export interface ListComplaintsParams extends ListParams {
  status?: ComplaintStatus;
  severity?: ComplaintSeverity;
  categoryId?: string;
  search?: string;
  sort?: SortField;
  sla?: SlaFilter;
  dateFrom?: string;
  dateTo?: string;
}

export async function listComplaints(
  params: ListComplaintsParams = {},
  client?: SupabaseClient,
): Promise<Paged<ComplaintWithRelations>> {
  const db = getClient(client);
  const { page, limit, rangeFrom, rangeTo } = paginate(params);

  let query = db
    .from('complaints')
    .select(
      `
      *,
      profiles:profiles!complaints_user_id_fkey ( id, name, avatar_url ),
      categories ( id, name, icon ),
      complaint_images ( id, storage_path, image_url, created_at ),
      complaint_ai_verification (
        ai_decision,
        reason,
        status,
        category_match,
        evidence_quality,
        image_count,
        detected_category,
        selected_category,
        description_match,
        review_decision
      )
    `,
      { count: 'exact' },
    )
    .range(rangeFrom, rangeTo);

  // --- Sorting ---
  switch (params.sort) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'priority':
      query = query.order('severity', { ascending: false });
      break;
    case 'sla':
      query = query.order('sla_deadline', { ascending: true, nullsFirst: false });
      break;
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  // --- Text search ---
  if (params.search) {
    query = query.or(
      `title.ilike.%${params.search}%,complaint_number.ilike.%${params.search}%`,
    );
  }

  // --- Status filter ---
  if (params.status) query = query.eq('status', params.status);

  // --- Severity filter ---
  if (params.severity) query = query.eq('severity', params.severity);

  // --- Category filter ---
  if (params.categoryId) query = query.eq('category_id', params.categoryId);

  // --- Date filters ---
  if (params.dateFrom) query = query.gte('created_at', params.dateFrom);
  if (params.dateTo) query = query.lte('created_at', params.dateTo);

  // --- SLA filter ---
  if (params.sla && params.sla !== 'all') {
    const now = new Date().toISOString();
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    if (params.sla === 'overdue') {
      query = query
        .lt('sla_deadline', now)
        .neq('status', 'RESOLVED')
        .neq('status', 'REJECTED');
    } else if (params.sla === 'due_soon') {
      query = query
        .gte('sla_deadline', now)
        .lte('sla_deadline', soon)
        .neq('status', 'RESOLVED')
        .neq('status', 'REJECTED');
    } else if (params.sla === 'resolved') {
      query = query.eq('status', 'RESOLVED');
    }
    // on_track: no server-side filter, handled client-side below
  }

  const { data, count, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as unknown as ComplaintWithRelations[];

  // Client-side SLA "on_track" filter (can't express easily in PostgREST)
  if (params.sla === 'on_track') {
    rows = rows.filter((r) => {
      const state = computeSlaState(r.sla_deadline, r.status);
      return state === 'ON_TRACK';
    });
  }

  return buildPage(rows, count ?? 0, page, limit);
}

export async function getComplaint(
  id: string,
  client?: SupabaseClient,
): Promise<ComplaintWithRelations | null> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaints')
    .select(
      `
      *,
      profiles:profiles!complaints_user_id_fkey ( id, name, avatar_url ),
      categories ( id, name, icon ),
      departments ( id, name, code ),
      officers ( id, title, profile_id, availability_status, ward, profiles ( id, name ) ),
      complaint_images ( id, storage_path, image_url, created_at ),
      complaint_ai_verification (
        ai_decision,
        reason,
        status,
        category_match,
        evidence_quality,
        image_count,
        detected_category,
        selected_category,
        description_match,
        review_decision
      )
    `,
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as ComplaintWithRelations | null;
}

export async function getComplaintByNumber(
  complaintNumber: string,
  client?: SupabaseClient,
): Promise<ComplaintWithRelations | null> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaints')
    .select(
      `
      *,
      profiles:profiles!complaints_user_id_fkey ( id, name, avatar_url ),
      categories ( id, name, icon ),
      complaint_images ( id, storage_path, image_url, created_at )
    `,
    )
    .eq('complaint_number', complaintNumber)
    .single();
  if (error) throw error;
  return data as ComplaintWithRelations | null;
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus,
  comment: string | null = null,
  updatedBy: string | null = null,
  client?: SupabaseClient,
): Promise<ComplaintRow> {
  const db = getClient(client);

  const patch: ComplaintUpdate = { status };
  if (status === 'RESOLVED') patch.resolved_at = new Date().toISOString();
  const { data: complaint, error: updErr } = await db
    .from('complaints')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (updErr) throw updErr;

  const historyEntry: ComplaintStatusHistoryInsert = {
    complaint_id: id,
    status,
    comment,
    updated_by: updatedBy,
  };
  const { error: histErr } = await db
    .from('complaint_status_history')
    .insert(historyEntry);
  if (histErr) throw histErr;

  // Audit log
  await logAudit(
    {
      actor_id: updatedBy,
      action: 'COMPLAINT_STATUS_CHANGED',
      entity_type: 'complaint',
      entity_id: id,
      before: { status: (complaint as ComplaintRow).status } as unknown as Json,
      after: { status } as unknown as Json,
    },
    client,
  );

  return complaint as ComplaintRow;
}

export async function addComplaintNote(
  complaintId: string,
  note: string,
  updatedBy: string | null = null,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  // Insert a history entry with the current status + a comment note.
  // This keeps the audit trail intact without changing the status.
  const { data: current } = await db
    .from('complaints')
    .select('status')
    .eq('id', complaintId)
    .single();

  const historyEntry: ComplaintStatusHistoryInsert = {
    complaint_id: complaintId,
    status: (current as { status: ComplaintStatus })?.status ?? 'SUBMITTED',
    comment: note,
    updated_by: updatedBy,
  };
  const { error } = await db
    .from('complaint_status_history')
    .insert(historyEntry);
  if (error) throw error;
}

export async function escalateComplaint(
  id: string,
  reason: string,
  updatedBy: string | null = null,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  // Escalation = set severity to HIGH and add a history note
  const { error: updErr } = await db
    .from('complaints')
    .update({ severity: 'HIGH' as ComplaintSeverity })
    .eq('id', id);
  if (updErr) throw updErr;

  const { data: current } = await db
    .from('complaints')
    .select('status')
    .eq('id', id)
    .single();

  const historyEntry: ComplaintStatusHistoryInsert = {
    complaint_id: id,
    status: (current as { status: ComplaintStatus })?.status ?? 'SUBMITTED',
    comment: `[ESCALATED] ${reason}`,
    updated_by: updatedBy,
  };
  const { error: histErr } = await db
    .from('complaint_status_history')
    .insert(historyEntry);
  if (histErr) throw histErr;

  // Audit log
  await logAudit(
    {
      actor_id: updatedBy,
      action: 'CONFIG_CHANGED',
      entity_type: 'complaint',
      entity_id: id,
      before: { severity: 'MEDIUM' } as unknown as Json,
      after: { severity: 'HIGH' } as unknown as Json,
    },
    client,
  );
}

export async function getComplaintHistory(
  complaintId: string,
  client?: SupabaseClient,
): Promise<ComplaintStatusHistoryRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaint_status_history')
    .select('*')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as ComplaintStatusHistoryRow[];
}

export async function getComplaintImages(
  complaintId: string,
  client?: SupabaseClient,
): Promise<ComplaintImageRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaint_images')
    .select('*')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as ComplaintImageRow[];
}

// ---------------------------------------------------------------------------
// Bulk delete — calls the `bulk_delete_complaints` SECURITY DEFINER RPC,
// which validates admin authorization, requires a reason, deletes the
// complaints (with cascade), and creates an audit log entry.
// ---------------------------------------------------------------------------

export interface BulkDeleteResult {
  success: boolean;
  deleted_count: number;
  skipped_count: number;
  skipped_ids: string[];
}

export async function bulkDeleteComplaints(
  complaintIds: string[],
  reason: string,
  deletedBy: string | null = null,
  client?: SupabaseClient,
): Promise<BulkDeleteResult> {
  const db = getClient(client);
  const { data, error } = await db.rpc('bulk_delete_complaints', {
    p_complaint_ids: complaintIds,
    p_reason: reason,
    p_deleted_by: deletedBy,
  });
  if (error) throw error;
  return data as BulkDeleteResult;
}
