import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getAutomationStats,
  getAutomationRules,
  getAutomationRulesWithStats,
  updateAutomationRule,
  toggleAutomationRule,
  getComplaintAutomationHistory,
  getAutomationExecutionLog,
  getFailedAutomations,
  retryAutomationExecution,
} from '@/services/automation';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';
import type { AutomationExecutionStatus } from '@/types';

const automationKey = ['automation'] as const;

export function useAutomationStats() {
  return useQuery({
    queryKey: [...automationKey, 'stats'],
    queryFn: () => getAutomationStats(),
    refetchInterval: 30_000,
  });
}

export function useAutomationRules() {
  return useQuery({
    queryKey: [...automationKey, 'rules'],
    queryFn: () => getAutomationRules(),
  });
}

/** Rules with per-rule execution/success/failure counts. */
export function useAutomationRulesWithStats() {
  return useQuery({
    queryKey: [...automationKey, 'rules-with-stats'],
    queryFn: () => getAutomationRulesWithStats(),
    refetchInterval: 30_000,
  });
}

export function useUpdateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof updateAutomationRule>[1];
    }) => updateAutomationRule(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...automationKey, 'rules'] });
      void qc.invalidateQueries({ queryKey: [...automationKey, 'rules-with-stats'] });
      void qc.invalidateQueries({ queryKey: [...automationKey, 'stats'] });
    },
  });
}

export function useToggleAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      toggleAutomationRule(id, enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...automationKey, 'rules'] });
      void qc.invalidateQueries({ queryKey: [...automationKey, 'rules-with-stats'] });
      void qc.invalidateQueries({ queryKey: [...automationKey, 'stats'] });
    },
  });
}

export function useComplaintAutomationHistory(complaintId: string | undefined) {
  return useQuery({
    queryKey: [...automationKey, 'history', complaintId],
    queryFn: () => getComplaintAutomationHistory(complaintId!),
    enabled: !!complaintId,
  });
}

/** Execution log with optional status + rule filters. */
export function useAutomationExecutionLog(
  status?: AutomationExecutionStatus | null,
  ruleId?: string | null,
  limit = 50,
) {
  return useQuery({
    queryKey: [...automationKey, 'executions', status ?? 'all', ruleId ?? 'all', limit],
    queryFn: () => getAutomationExecutionLog({ status, ruleId, limit }),
    refetchInterval: 30_000,
  });
}

/** Most recent failed automations. */
export function useFailedAutomations(limit = 20) {
  return useQuery({
    queryKey: [...automationKey, 'failed', limit],
    queryFn: () => getFailedAutomations(limit),
    refetchInterval: 30_000,
  });
}

/** Retry a failed execution. */
export function useRetryAutomationExecution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (executionId: string) => retryAutomationExecution(executionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...automationKey] });
      toastSuccess('Automation retry queued');
    },
    onError: (err) => toastError('Failed to retry automation', errMessage(err)),
  });
}

/**
 * Realtime subscription for the Automation Center. Listens for changes on
 * automation_executions + automation_audit_log + complaints and
 * invalidates the automation query cache so the dashboard updates
 * automatically when:
 *   - a new execution starts/completes/fails
 *   - a new audit log entry is written
 *   - a complaint's status changes (which may trigger new automation)
 *
 * Combined with the 30s refetchInterval on the stats/rules hooks, this
 * gives near-real-time updates without requiring a manual refresh.
 */
export function useAutomationRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('automation-center-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'automation_executions' },
        () => {
          void qc.invalidateQueries({ queryKey: [...automationKey, 'stats'] });
          void qc.invalidateQueries({ queryKey: [...automationKey, 'executions'] });
          void qc.invalidateQueries({ queryKey: [...automationKey, 'failed'] });
          void qc.invalidateQueries({ queryKey: [...automationKey, 'rules-with-stats'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'automation_audit_log' },
        () => {
          void qc.invalidateQueries({ queryKey: [...automationKey, 'stats'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        () => {
          // Complaint status changes can trigger automation events — refresh stats.
          void qc.invalidateQueries({ queryKey: [...automationKey, 'stats'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'automation_rules' },
        () => {
          void qc.invalidateQueries({ queryKey: [...automationKey, 'rules'] });
          void qc.invalidateQueries({ queryKey: [...automationKey, 'rules-with-stats'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
