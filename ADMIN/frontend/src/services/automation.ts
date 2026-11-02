import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './base';
import type {
  AutomationRuleRow,
  AutomationRuleUpdate,
  AutomationRuleWithStats,
  AutomationStats,
  AutomationComplaintHistoryEntry,
  AutomationExecutionLogEntry,
  FailedAutomationEntry,
  RetryAutomationResult,
  AutomationExecutionStatus,
} from '@/types';

export async function getAutomationStats(
  client?: SupabaseClient,
): Promise<AutomationStats> {
  const db = getClient(client);
  const { data, error } = await db.rpc('automation_stats');
  if (error) throw error;
  return data as AutomationStats;
}

export async function getAutomationRules(
  client?: SupabaseClient,
): Promise<AutomationRuleRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('automation_rules')
    .select('*')
    .order('priority', { ascending: true });
  if (error) throw error;
  return data as AutomationRuleRow[];
}

export async function updateAutomationRule(
  id: string,
  patch: AutomationRuleUpdate,
  client?: SupabaseClient,
): Promise<AutomationRuleRow> {
  const db = getClient(client);
  const { data, error } = await db
    .from('automation_rules')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as AutomationRuleRow;
}

export async function toggleAutomationRule(
  id: string,
  enabled: boolean,
  client?: SupabaseClient,
): Promise<AutomationRuleRow> {
  return updateAutomationRule(id, { enabled }, client);
}

export async function getAutomationExecutions(
  complaintId: string,
  client?: SupabaseClient,
): Promise<AutomationRuleRow[]> {
  const db = getClient(client);
  const { data, error } = await db
    .from('automation_executions')
    .select('*')
    .eq('complaint_id', complaintId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as AutomationRuleRow[];
}

export async function getComplaintAutomationHistory(
  complaintId: string,
  client?: SupabaseClient,
): Promise<AutomationComplaintHistoryEntry[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('automation_complaint_history', {
    p_complaint_id: complaintId,
  });
  if (error) throw error;
  return data as AutomationComplaintHistoryEntry[];
}

// ---------------------------------------------------------------------------
// Automation Center — execution log, per-rule stats, failed executions, retry
// ---------------------------------------------------------------------------

/**
 * Lists automation executions with rule + complaint info, optionally filtered
 * by status and/or rule_id. Used by the Execution Log table in the Automation
 * Center.
 */
export async function getAutomationExecutionLog(
  params: {
    status?: AutomationExecutionStatus | null;
    ruleId?: string | null;
    limit?: number;
    offset?: number;
  } = {},
  client?: SupabaseClient,
): Promise<AutomationExecutionLogEntry[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_automation_execution_log', {
    p_status: params.status ?? null,
    p_rule_id: params.ruleId ?? null,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as AutomationExecutionLogEntry[];
}

/**
 * Lists all automation rules with their total/completed/failed/skipped
 * execution counts + last_executed_at. Used by the Automation Rules table
 * in the Automation Center (replaces the plain getAutomationRules call for
 * the Center page so each rule shows its live execution stats).
 */
export async function getAutomationRulesWithStats(
  client?: SupabaseClient,
): Promise<AutomationRuleWithStats[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_automation_rules_with_stats');
  if (error) throw error;
  return (data ?? []) as AutomationRuleWithStats[];
}

/**
 * Lists the most recent failed automation executions with rule + complaint
 * info, so the Automation Center can surface them for retry.
 */
export async function getFailedAutomations(
  limit = 20,
  client?: SupabaseClient,
): Promise<FailedAutomationEntry[]> {
  const db = getClient(client);
  const { data, error } = await db.rpc('get_failed_automations', {
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as FailedAutomationEntry[];
}

/**
 * Retries a failed automation execution by re-running
 * process_complaint_automation with the original event_type. Creates a NEW
 * execution row (preserving the failed one for audit) and relies on the
 * idempotency_key guard inside process_complaint_automation to prevent
 * duplicate side-effects.
 */
export async function retryAutomationExecution(
  executionId: string,
  client?: SupabaseClient,
): Promise<RetryAutomationResult> {
  const db = getClient(client);
  const { data, error } = await db.rpc('retry_automation_execution', {
    p_execution_id: executionId,
  });
  if (error) throw error;
  return data as RetryAutomationResult;
}
