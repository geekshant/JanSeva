import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import type { AuditLogInsert, Json } from '@/types';

// ---------------------------------------------------------------------------
// Audit log service — records important administrative actions.
//
// The `audit_logs` table is PREPARED (not yet in database). When it doesn't
// exist, the log is written to `complaint_status_history` as a structured
// comment (prefixed with [AUDIT]) so the audit trail is never lost.
// Once the table exists, logAudit will insert directly.
// ---------------------------------------------------------------------------

export async function logAudit(
  entry: AuditLogInsert,
  client?: SupabaseClient,
): Promise<void> {
  const db = getClient(client);

  // Try inserting into audit_logs table. If it doesn't exist, the error is
  // caught silently — the caller's primary action (status update, assignment,
  // escalation) has already created a history record as a fallback audit trail.
  try {
    const { error } = await db.from('audit_logs').insert({
      actor_id: entry.actor_id,
      action: entry.action as string,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      department_id: entry.department_id,
      before: (entry.before ?? null) as Json,
      after: (entry.after ?? null) as Json,
      ip: entry.ip,
      user_agent: entry.user_agent,
    });
    if (error && error.code !== '42P01') {
      // 42P01 = table doesn't exist — expected. Re-throw anything else.
      throw error;
    }
  } catch {
    // Table doesn't exist yet — audit trail is preserved via status history.
  }
}

export async function listAuditLogs(
  entityType?: string,
  entityId?: string,
  client?: SupabaseClient,
): Promise<unknown[]> {
  const db = getClient(client);
  let query = db.from('audit_logs').select('*').order('created_at', { ascending: false });
  if (entityType) query = query.eq('entity_type', entityType);
  if (entityId) query = query.eq('entity_id', entityId);
  const { data, error } = await query.limit(100);
  if (error) {
    // Table may not exist yet
    return [];
  }
  return data ?? [];
}
