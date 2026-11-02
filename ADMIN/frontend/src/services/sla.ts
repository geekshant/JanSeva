import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import type {
  ComplaintRow,
  ComplaintStatus,
  ComplaintSeverity,
  SlaSummary,
  SlaRuleRow,
  SlaRuleInsert,
  SlaRuleUpdate,
  SlaState,
} from '@/types';
import { computeSlaState } from '@/types';

// ---------------------------------------------------------------------------
// SLA service — monitoring + rule management.
//
// SLA state is computed from server-stored timestamps (sla_deadline on the
// complaints table) — NOT from browser timers. The deadline was set
// server-side when the complaint was created, so it's authoritative.
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES: ComplaintStatus[] = [
  'SUBMITTED',
  'VERIFIED',
  'ASSIGNED',
  'IN_PROGRESS',
];

// ---------------------------------------------------------------------------
// SLA Overview — summary counts by SLA state
// ---------------------------------------------------------------------------

export async function getSlaOverview(
  client?: SupabaseClient,
): Promise<SlaSummary> {
  const db = getClient(client);

  const { data, error } = await db
    .from('complaints')
    .select('status, sla_deadline, severity')
    .in('status', ACTIVE_STATUSES);
  if (error) throw error;

  let onTrack = 0;
  let dueSoon = 0;
  let atRisk = 0;
  let breached = 0;
  let escalated = 0;

  const now = Date.now();
  const warningMs = 24 * 60 * 60 * 1000;
  const criticalMs = 12 * 60 * 60 * 1000;

  for (const row of data ?? []) {
    const severity = row.severity as ComplaintSeverity | null;
    if (!row.sla_deadline) {
      onTrack++;
      continue;
    }
    const due = new Date(row.sla_deadline).getTime();
    if (due < now) {
      if (severity === 'HIGH' || severity === 'CRITICAL') escalated++;
      else breached++;
    } else if (due < now + criticalMs) {
      atRisk++;
    } else if (due < now + warningMs) {
      dueSoon++;
    } else {
      onTrack++;
    }
  }

  const { count, error: countErr } = await db
    .from('complaints')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'RESOLVED');
  if (countErr) throw countErr;

  return {
    on_track: onTrack,
    due_soon: dueSoon,
    at_risk: atRisk,
    breached,
    escalated,
    resolved: count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Breach detection — complaints past their SLA deadline
// ---------------------------------------------------------------------------

export async function getBreachedComplaints(
  client?: SupabaseClient,
): Promise<ComplaintRow[]> {
  const db = getClient(client);
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('complaints')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .lt('sla_deadline', now)
    .neq('severity', 'HIGH')
    .neq('severity', 'CRITICAL')
    .order('sla_deadline', { ascending: true });
  if (error) throw error;
  return data as ComplaintRow[];
}

// ---------------------------------------------------------------------------
// Escalation state — complaints that are both breached AND high/critical severity
// ---------------------------------------------------------------------------

export async function getEscalatedComplaints(
  client?: SupabaseClient,
): Promise<ComplaintRow[]> {
  const db = getClient(client);
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('complaints')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .lt('sla_deadline', now)
    .in('severity', ['HIGH', 'CRITICAL'])
    .order('sla_deadline', { ascending: true });
  if (error) throw error;
  return data as ComplaintRow[];
}

// ---------------------------------------------------------------------------
// At-risk — complaints within critical threshold (default 12h) of deadline
// ---------------------------------------------------------------------------

export async function getAtRiskComplaints(
  client?: SupabaseClient,
): Promise<ComplaintRow[]> {
  const db = getClient(client);
  const now = new Date();
  const critical = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const { data, error } = await db
    .from('complaints')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .gte('sla_deadline', now.toISOString())
    .lte('sla_deadline', critical.toISOString())
    .order('sla_deadline', { ascending: true });
  if (error) throw error;
  return data as ComplaintRow[];
}

// ---------------------------------------------------------------------------
// Due soon — within warning threshold (default 24h) but not yet critical
// ---------------------------------------------------------------------------

export async function getDueSoonComplaints(
  client?: SupabaseClient,
): Promise<ComplaintRow[]> {
  const db = getClient(client);
  const now = new Date();
  const warning = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const critical = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const { data, error } = await db
    .from('complaints')
    .select('*')
    .in('status', ACTIVE_STATUSES)
    .gte('sla_deadline', critical.toISOString())
    .lte('sla_deadline', warning.toISOString())
    .order('sla_deadline', { ascending: true });
  if (error) throw error;
  return data as ComplaintRow[];
}

/** Computes the SLA state for a single complaint (client-side from server data). */
export function complaintSlaState(complaint: {
  sla_deadline: string | null;
  status: ComplaintStatus;
  severity: ComplaintSeverity;
}): SlaState {
  return computeSlaState(complaint.sla_deadline, complaint.status, complaint.severity);
}

// ---------------------------------------------------------------------------
// SLA Rules — real CRUD (table now exists)
// ---------------------------------------------------------------------------

export async function listSlaRules(
  client?: SupabaseClient,
): Promise<SlaRuleRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('sla_rules')
    .select('*')
    .order('severity', { ascending: false });
  if (error) throw error;
  return data as SlaRuleRow[];
}

export async function createSlaRule(
  input: SlaRuleInsert,
  client?: SupabaseClient,
): Promise<SlaRuleRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('sla_rules')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as SlaRuleRow;
}

export async function updateSlaRule(
  id: string,
  patch: SlaRuleUpdate,
  client?: SupabaseClient,
): Promise<SlaRuleRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('sla_rules')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as SlaRuleRow;
}

export async function deleteSlaRule(
  id: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db.from('sla_rules').delete().eq('id', id);
  if (error) throw error;
}
