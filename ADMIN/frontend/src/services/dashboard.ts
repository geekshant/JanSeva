import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import type {
  ComplaintStatus,
  ComplaintWithRelations,
} from '@/types';
import type { DashboardMapComplaint, DashboardFilters } from '@/types/map';
import { dateRangeFromPreset } from '@/types/map';

// ---------------------------------------------------------------------------
// Dashboard service — KPI data and live activity feed.
// Works entirely from existing tables (complaints + complaint_status_history).
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES: ComplaintStatus[] = [
  'SUBMITTED',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
];

export interface DashboardKpis {
  total: number;
  active: number;
  pending_verification: number;
  due_soon: number;
  sla_breached: number;
  resolved: number;
  reopened: number;
  avg_resolution_hours: number | null;
}

export async function getDashboardKpis(
  client?: SupabaseClient,
): Promise<DashboardKpis> {
  const db = getClient(client);

  // Fetch all complaints (status + dates + severity + verification_status) in one query
  const { data: complaints, error } = await db
    .from('complaints')
    .select('id, status, severity, created_at, resolved_at, sla_deadline, verification_status');
  if (error) throw error;

  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  let total = 0;
  let active = 0;
  let pendingVerification = 0;
  let dueSoon = 0;
  let slaBreached = 0;
  let resolved = 0;
  let reopened = 0;

  for (const c of complaints ?? []) {
    total++;
    if (ACTIVE_STATUSES.includes(c.status)) active++;
    // "Pending Verification" = resolved complaints awaiting community verification.
    if ((c as { verification_status?: string | null }).verification_status === 'pending') {
      pendingVerification++;
    }
    if (c.status === 'RESOLVED') resolved++;

    // SLA checks only for active complaints
    if (ACTIVE_STATUSES.includes(c.status) && c.sla_deadline) {
      const due = new Date(c.sla_deadline).getTime();
      if (due < now) slaBreached++;
      else if (due < now + twentyFourHours) dueSoon++;
    }
  }

  // "Reopened" = complaints the community disputed and an admin reopened.
  // Driven by `verification_status='reopened'` (the source of truth), with a
  // fallback to the resolved_at heuristic for any legacy rows.
  for (const c of complaints ?? []) {
    if ((c as { verification_status?: string | null }).verification_status === 'reopened') {
      reopened++;
    } else if (c.resolved_at && c.status !== 'RESOLVED') {
      reopened++;
    }
  }

  // Avg resolution hours
  const resolvedWithDates = (complaints ?? []).filter(
    (c) => c.status === 'RESOLVED' && c.resolved_at,
  );
  let avgResolutionHours: number | null = null;
  if (resolvedWithDates.length > 0) {
    const totalHours = resolvedWithDates.reduce(
      (sum, c) =>
        sum +
        (new Date(c.resolved_at!).getTime() -
          new Date(c.created_at).getTime()) /
          (1000 * 60 * 60),
      0,
    );
    avgResolutionHours = Math.round((totalHours / resolvedWithDates.length) * 10) / 10;
  }

  return {
    total,
    active,
    pending_verification: pendingVerification,
    due_soon: dueSoon,
    sla_breached: slaBreached,
    resolved,
    reopened,
    avg_resolution_hours: avgResolutionHours,
  };
}

// ---------------------------------------------------------------------------
// Recent complaints — latest 8 with relations
// ---------------------------------------------------------------------------

export async function getRecentComplaints(
  limit = 8,
  client?: SupabaseClient,
): Promise<ComplaintWithRelations[]> {
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
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as ComplaintWithRelations[];
}

// ---------------------------------------------------------------------------
// Activity feed — recent status history entries with complaint info
// ---------------------------------------------------------------------------

export interface ActivityEntry {
  id: string;
  complaint_id: string;
  complaint_number: string;
  complaint_title: string;
  status: ComplaintStatus;
  comment: string | null;
  created_at: string;
  updated_by: string | null;
}

export async function getRecentActivity(
  limit = 15,
  client?: SupabaseClient,
): Promise<ActivityEntry[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaint_status_history')
    .select(
      `
      id,
      complaint_id,
      status,
      comment,
      updated_by,
      created_at,
      complaints!inner ( complaint_number, title )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const complaint = row.complaints as unknown as {
      complaint_number: string;
      title: string;
    };
    return {
      id: row.id,
      complaint_id: row.complaint_id,
      complaint_number: complaint.complaint_number,
      complaint_title: complaint.title,
      status: row.status,
      comment: row.comment,
      created_at: row.created_at,
      updated_by: row.updated_by,
    };
  });
}

// ---------------------------------------------------------------------------
// Dashboard complaints — ALL complaints with filters, for the integrated
// dashboard map + KPIs + complaint list. This is the single data source
// for the dashboard. Uses get_dashboard_complaints RPC (no viewport bound).
// ---------------------------------------------------------------------------

export interface DashboardComplaintQueryParams {
  filters: DashboardFilters;
}

export async function getDashboardComplaints(
  params: DashboardComplaintQueryParams,
  client?: SupabaseClient,
): Promise<DashboardMapComplaint[]> {
  const db = getClient(client);
  const { filters } = params;

  // Resolve date range from preset if not custom
  let dateFrom = filters.dateFrom;
  let dateTo = filters.dateTo;
  if (filters.datePreset !== 'custom' && filters.datePreset !== 'all') {
    const range = dateRangeFromPreset(filters.datePreset);
    dateFrom = range.dateFrom;
    dateTo = range.dateTo;
  }
  if (filters.datePreset === 'all') {
    dateFrom = '';
    dateTo = '';
  }

  const { data, error } = await db.rpc('get_dashboard_complaints', {
    p_status: filters.status || null,
    p_severity: filters.severity || null,
    p_category_id: filters.categoryId || null,
    p_department_id: filters.departmentId || null,
    p_ward: filters.ward || null,
    p_date_from: dateFrom ? new Date(dateFrom).toISOString() : null,
    p_date_to: dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : null,
    p_limit: 5000,
  });

  if (error) throw error;
  return (data ?? []) as unknown as DashboardMapComplaint[];
}

// ---------------------------------------------------------------------------
// Dashboard KPIs — computed from the dashboard complaints dataset
// (same data source as the map, ensuring KPI-map synchronization)
// ---------------------------------------------------------------------------

export interface DashboardKpiSummary {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  locationUnavailable: number;
}

export function computeDashboardKpis(
  complaints: DashboardMapComplaint[],
): DashboardKpiSummary {
  const PENDING_STATUSES: ComplaintStatus[] = ['SUBMITTED', 'AI_CHECKING', 'AI_REVIEW_REQUIRED', 'EVIDENCE_REQUIRED'];
  const IN_PROGRESS_STATUSES: ComplaintStatus[] = ['VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'AI_VERIFIED'];

  let total = 0;
  let pending = 0;
  let inProgress = 0;
  let resolved = 0;
  let locationUnavailable = 0;

  for (const c of complaints) {
    total++;
    if (PENDING_STATUSES.includes(c.status)) pending++;
    if (IN_PROGRESS_STATUSES.includes(c.status)) inProgress++;
    if (c.status === 'RESOLVED') resolved++;
    if (!c.has_location) locationUnavailable++;
  }

  return { total, pending, inProgress, resolved, locationUnavailable };
}
