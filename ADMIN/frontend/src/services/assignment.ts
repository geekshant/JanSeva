import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import type { ComplaintAssignmentRow } from '@/types';

// ---------------------------------------------------------------------------
// Assignment service — uses the backend `manual_assign_complaint` RPC which
// validates officer-department matching, enforces availability, and creates
// audit logs. Automatic assignment is handled by the database trigger when a
// complaint becomes VERIFIED.
// ---------------------------------------------------------------------------

export interface AssignComplaintInput {
  complaintId: string;
  departmentId?: string;
  officerId?: string;
  note?: string;
  assignedBy: string | null;
}

/**
 * Manually assigns a complaint to a department + optional officer.
 * Calls the `manual_assign_complaint` SECURITY DEFINER RPC, which:
 *   - Validates the officer belongs to the specified department
 *   - Requires a reason (note)
 *   - Creates a complaint_assignments record
 *   - Creates an assignment_audit_logs record
 *   - Updates the complaint status to ASSIGNED if VERIFIED
 */
export async function assignComplaint(
  input: AssignComplaintInput,
  client?: SupabaseClient,
): Promise<ComplaintAssignmentRow> {
  const db = getClient(client);
  const { data, error } = await db.rpc('manual_assign_complaint', {
    p_complaint_id: input.complaintId,
    p_department_id: input.departmentId ?? null,
    p_officer_id: input.officerId ?? null,
    p_reason: input.note ?? 'Manual assignment by admin',
    p_assigned_by: input.assignedBy,
  });
  if (error) throw error;
  return data as ComplaintAssignmentRow;
}

/**
 * Reassigns a complaint — same RPC as assign, but the UI labels it differently.
 * The RPC handles marking the old assignment as REASSIGNED and creating the
 * audit log with the old officer/department captured.
 */
export async function reassignComplaint(
  input: AssignComplaintInput,
  client?: SupabaseClient,
): Promise<ComplaintAssignmentRow> {
  const db = getClient(client);
  const { data, error } = await db.rpc('manual_assign_complaint', {
    p_complaint_id: input.complaintId,
    p_department_id: input.departmentId ?? null,
    p_officer_id: input.officerId ?? null,
    p_reason: input.note ?? 'Manual reassignment by admin',
    p_assigned_by: input.assignedBy,
  });
  if (error) throw error;
  return data as ComplaintAssignmentRow;
}

/**
 * Fetches the latest active assignment for a complaint (for the detail page).
 */
export async function getComplaintAssignment(
  complaintId: string,
  client?: SupabaseClient,
): Promise<ComplaintAssignmentRow | null> {
  const db = getClient(client);
  const { data, error } = await db
    .from('complaint_assignments')
    .select('*')
    .eq('complaint_id', complaintId)
    .order('assigned_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as ComplaintAssignmentRow | null;
}

/**
 * Fetches the assignment audit log for a complaint.
 */
export async function getAssignmentAuditLogs(
  complaintId: string,
  client?: SupabaseClient,
): Promise<Array<{
  id: string;
  change_type: string;
  reason: string | null;
  created_at: string;
}>> {
  const db = getClient(client);
  const { data, error } = await db
    .from('assignment_audit_logs')
    .select('id, change_type, reason, created_at')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
