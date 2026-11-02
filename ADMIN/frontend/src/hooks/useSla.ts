import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getSlaOverview,
  getBreachedComplaints,
  getEscalatedComplaints,
  getAtRiskComplaints,
  getDueSoonComplaints,
  listSlaRules,
  createSlaRule,
  updateSlaRule,
  deleteSlaRule,
} from '@/services/sla';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';
import type { SlaRuleInsert, SlaRuleUpdate } from '@/types';

const slaKey = ['sla'] as const;

// --- Overview ---

export function useSlaOverview() {
  return useQuery({
    queryKey: [...slaKey, 'overview'],
    queryFn: () => getSlaOverview(),
    refetchInterval: 60_000,
  });
}

// --- Breached / Escalated / At Risk / Due Soon ---

export function useBreachedComplaints() {
  return useQuery({
    queryKey: [...slaKey, 'breached'],
    queryFn: () => getBreachedComplaints(),
    refetchInterval: 60_000,
  });
}

export function useEscalatedComplaints() {
  return useQuery({
    queryKey: [...slaKey, 'escalated'],
    queryFn: () => getEscalatedComplaints(),
    refetchInterval: 60_000,
  });
}

export function useAtRiskComplaints() {
  return useQuery({
    queryKey: [...slaKey, 'at-risk'],
    queryFn: () => getAtRiskComplaints(),
    refetchInterval: 60_000,
  });
}

export function useDueSoonComplaints() {
  return useQuery({
    queryKey: [...slaKey, 'due-soon'],
    queryFn: () => getDueSoonComplaints(),
    refetchInterval: 60_000,
  });
}

// --- SLA Rules ---

export function useSlaRules() {
  return useQuery({
    queryKey: [...slaKey, 'rules'],
    queryFn: () => listSlaRules(),
  });
}

export function useCreateSlaRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SlaRuleInsert) => createSlaRule(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...slaKey, 'rules'] });
      toastSuccess('SLA rule created');
    },
    onError: (err) => toastError('Failed to create SLA rule', errMessage(err)),
  });
}

export function useUpdateSlaRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SlaRuleUpdate }) =>
      updateSlaRule(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...slaKey, 'rules'] });
      toastSuccess('SLA rule updated');
    },
    onError: (err) => toastError('Failed to update SLA rule', errMessage(err)),
  });
}

export function useDeleteSlaRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSlaRule(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...slaKey, 'rules'] });
      toastSuccess('SLA rule deleted');
    },
    onError: (err) => toastError('Failed to delete SLA rule', errMessage(err)),
  });
}
