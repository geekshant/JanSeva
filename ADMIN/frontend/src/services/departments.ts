import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import type {
  DepartmentRow,
  DepartmentInsert,
  DepartmentUpdate,
  ComplaintRow,
  ComplaintStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Departments service — real database access (table now exists).
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES: ComplaintStatus[] = [
  'SUBMITTED',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
];

export async function listDepartments(
  client?: SupabaseClient,
): Promise<DepartmentRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('departments')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data as DepartmentRow[];
}

export async function listActiveDepartments(
  client?: SupabaseClient,
): Promise<DepartmentRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('departments')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return data as DepartmentRow[];
}

export async function getDepartment(
  id: string,
  client?: SupabaseClient,
): Promise<DepartmentRow | null> {
  const db = getClient(client);
  const { data, error } = await db
    .from('departments')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as DepartmentRow | null;
}

export async function createDepartment(
  input: DepartmentInsert,
  client?: SupabaseClient,
): Promise<DepartmentRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('departments')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as DepartmentRow;
}

export async function updateDepartment(
  id: string,
  patch: DepartmentUpdate,
  client?: SupabaseClient,
): Promise<DepartmentRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('departments')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DepartmentRow;
}

export async function deactivateDepartment(
  id: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db
    .from('departments')
    .update({ active: false })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Department stats — for the detail page
// ---------------------------------------------------------------------------

export interface DepartmentStats {
  active_complaints: number;
  resolved_complaints: number;
  sla_breaches: number;
  avg_resolution_hours: number | null;
  officer_count: number;
}

export async function getDepartmentStats(
  departmentId: string,
  client?: SupabaseClient,
): Promise<DepartmentStats> {
  const db = getClient(client);

  // Get all complaints assigned to this department
  const { data: complaints, error } = await db
    .from('complaints')
    .select('status, sla_deadline, created_at, resolved_at')
    .eq('assigned_department_id', departmentId);
  if (error) throw error;

  let active = 0;
  let resolved = 0;
  let slaBreaches = 0;
  let totalResolutionHours = 0;
  let resolvedCount = 0;

  const now = Date.now();
  for (const c of complaints ?? []) {
    if (ACTIVE_STATUSES.includes(c.status)) {
      active++;
      if (c.sla_deadline && new Date(c.sla_deadline).getTime() < now) {
        slaBreaches++;
      }
    }
    if (c.status === 'RESOLVED') {
      resolved++;
      if (c.resolved_at) {
        totalResolutionHours +=
          (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) /
          (1000 * 60 * 60);
        resolvedCount++;
      }
    }
  }

  // Count officers in this department
  const { count: officerCount, error: oErr } = await db
    .from('officers')
    .select('*', { count: 'exact', head: true })
    .eq('department_id', departmentId)
    .eq('active', true)
    .is('deleted_at', null);
  if (oErr) throw oErr;

  return {
    active_complaints: active,
    resolved_complaints: resolved,
    sla_breaches: slaBreaches,
    avg_resolution_hours:
      resolvedCount > 0 ? Math.round((totalResolutionHours / resolvedCount) * 10) / 10 : null,
    officer_count: officerCount ?? 0,
  };
}

export async function getDepartmentComplaints(
  departmentId: string,
  limit = 10,
  client?: SupabaseClient,
): Promise<ComplaintRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaints')
    .select('*')
    .eq('assigned_department_id', departmentId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ComplaintRow[];
}

// ---------------------------------------------------------------------------
// Department SLA rules — per-department SLA configuration (4 severity tiers)
// ---------------------------------------------------------------------------

export interface SlaRuleRow {
  id: string;
  department_id: string | null;
  category_id: string | null;
  severity: string;
  deadline_hours: number;
  warning_hours: number;
  critical_hours: number;
  active: boolean;
}

export async function getDepartmentSlaRules(
  departmentId: string,
  client?: SupabaseClient,
): Promise<SlaRuleRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('sla_rules')
    .select('id, department_id, category_id, severity, deadline_hours, warning_hours, critical_hours, active')
    .eq('department_id', departmentId)
    .eq('active', true)
    .order('severity', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SlaRuleRow[];
}
