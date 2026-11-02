import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import type {
  SafetyAlertEntry,
  SafetyLocationShare,
} from '@/types';

// ---------------------------------------------------------------------------
// Women Safety service — admin dashboard functions for safety alerts.
// ---------------------------------------------------------------------------

/** Lists active safety alerts for the admin dashboard. */
export async function getActiveSafetyAlerts(
  limit = 50,
  client?: SupabaseClient,
): Promise<SafetyAlertEntry[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_active_safety_alerts', {
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as SafetyAlertEntry[];
}

/** Live count of active safety alerts — used by the sidebar badge. */
export async function getActiveSafetyAlertsCount(
  client?: SupabaseClient,
): Promise<number> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_active_safety_alerts_count');
  if (error) throw error;
  return (data ?? 0) as number;
}

/** Acknowledges a safety alert — admin confirms they are responding. */
export async function acknowledgeSos(
  incidentId: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db.rpc('acknowledge_sos', {
    p_incident_id: incidentId,
  });
  if (error) throw error;
}

/** Assigns an officer/responder to an SOS incident. */
export async function assignSosResponder(
  incidentId: string,
  officerId: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db.rpc('assign_sos_responder', {
    p_incident_id: incidentId,
    p_officer_id: officerId,
  });
  if (error) throw error;
}

/** Starts the response phase for an SOS incident. */
export async function startSosResponse(
  incidentId: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db.rpc('start_sos_response', {
    p_incident_id: incidentId,
  });
  if (error) throw error;
}

/** Resolves an SOS incident — ends tracking, auto-closes the case. */
export async function resolveSos(
  incidentId: string,
  note?: string | null,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db.rpc('resolve_sos', {
    p_incident_id: incidentId,
    p_note: note ?? null,
  });
  if (error) throw error;
}

/** Manually closes an SOS incident (for TRACKING_EXPIRED cases). */
export async function closeSos(
  incidentId: string,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);
  const { error } = await db.rpc('close_sos', {
    p_incident_id: incidentId,
  });
  if (error) throw error;
}

/** Gets live location shares for a safety incident (the user's location trail). */
export async function getSafetyIncidentLocationShares(
  incidentId: string,
  limit = 50,
  client?: SupabaseClient,
): Promise<SafetyLocationShare[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_safety_incident_location_shares', {
    p_incident_id: incidentId,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as SafetyLocationShare[];
}

/** Gets detailed info for a single SOS incident. */
export async function getSosIncidentDetail(
  incidentId: string,
  client?: SupabaseClient,
): Promise<Record<string, unknown> | null> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_sos_incident_detail', {
    p_incident_id: incidentId,
  });
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

/** Gets audit logs for an SOS incident. */
export async function getSosAuditLogs(
  incidentId: string,
  client?: SupabaseClient,
): Promise<Record<string, unknown>[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_sos_audit_logs', {
    p_incident_id: incidentId,
  });
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

// Legacy aliases for backward compatibility
export { acknowledgeSos as acknowledgeSafetyAlert };
export { resolveSos as resolveSafetyIncident };
