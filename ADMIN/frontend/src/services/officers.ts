import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient, paginate } from './base';
import type {
  OfficerRow,
  OfficerWithRelations,
  OfficerInsert,
  OfficerUpdate,
  ComplaintRow,
  ComplaintStatus,
  Paged,
  ListParams,
} from '@/types';

// ---------------------------------------------------------------------------
// Officers service — real database access (table now exists).
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES: ComplaintStatus[] = [
  'SUBMITTED',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
];

export interface ListOfficersParams extends ListParams {
  departmentId?: string;
  role?: string;
  active?: boolean;
}

export async function listOfficers(
  params: ListOfficersParams = {},
  client?: SupabaseClient,
): Promise<Paged<OfficerWithRelations>> {
  const db = getClient(client);
  const { page, limit, rangeFrom, rangeTo } = paginate(params);

  let query = db
    .from('officers')
    .select(
      `
      *,
      profiles ( id, name, email, phone, avatar_url ),
      departments ( id, name, code )
    `,
      { count: 'exact' },
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo);

  if (params.departmentId) query = query.eq('department_id', params.departmentId);
  if (params.role) query = query.eq('role', params.role);
  if (params.active !== undefined) query = query.eq('active', params.active);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data ?? []) as unknown as OfficerWithRelations[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / limit)),
  };
}

export async function getOfficer(
  id: string,
  client?: SupabaseClient,
): Promise<OfficerWithRelations | null> {
  const db = getClient(client);
  const { data, error } = await db
    .from('officers')
    .select(
      `
      *,
      profiles ( id, name, email, phone, avatar_url ),
      departments ( id, name, code )
    `,
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as OfficerWithRelations | null;
}

export async function createOfficer(
  input: OfficerInsert,
  client?: SupabaseClient,
): Promise<OfficerRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('officers')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as OfficerRow;
}

export async function updateOfficer(
  id: string,
  patch: OfficerUpdate,
  client?: SupabaseClient,
): Promise<OfficerRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('officers')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as OfficerRow;
}

export async function deactivateOfficer(
  id: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db
    .from('officers')
    .update({ active: false })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Officer stats — for the detail page
// ---------------------------------------------------------------------------

export interface OfficerStats {
  assigned_complaints: number;
  completed_complaints: number;
  sla_breaches: number;
  avg_resolution_hours: number | null;
}

export async function getOfficerStats(
  officerId: string,
  client?: SupabaseClient,
): Promise<OfficerStats> {
  const db = getClient(client);

  const { data: complaints, error } = await db
    .from('complaints')
    .select('status, sla_deadline, created_at, resolved_at')
    .eq('assigned_officer_id', officerId);
  if (error) throw error;

  let assigned = 0;
  let completed = 0;
  let slaBreaches = 0;
  let totalResolutionHours = 0;
  let resolvedCount = 0;

  const now = Date.now();
  for (const c of complaints ?? []) {
    if (ACTIVE_STATUSES.includes(c.status)) {
      assigned++;
      if (c.sla_deadline && new Date(c.sla_deadline).getTime() < now) {
        slaBreaches++;
      }
    }
    if (c.status === 'RESOLVED') {
      completed++;
      if (c.resolved_at) {
        totalResolutionHours +=
          (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) /
          (1000 * 60 * 60);
        resolvedCount++;
      }
    }
  }

  return {
    assigned_complaints: assigned,
    completed_complaints: completed,
    sla_breaches: slaBreaches,
    avg_resolution_hours:
      resolvedCount > 0 ? Math.round((totalResolutionHours / resolvedCount) * 10) / 10 : null,
  };
}

export async function getOfficerComplaints(
  officerId: string,
  limit = 10,
  client?: SupabaseClient,
): Promise<ComplaintRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaints')
    .select('*')
    .eq('assigned_officer_id', officerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ComplaintRow[];
}
