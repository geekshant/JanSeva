import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listOfficers,
  getOfficer,
  createOfficer,
  updateOfficer,
  deactivateOfficer,
  getOfficerStats,
  getOfficerComplaints,
  type ListOfficersParams,
} from '@/services/officers';
import type { OfficerInsert, OfficerUpdate } from '@/types';

const officersKey = ['officers'] as const;

export function useOfficers(params: ListOfficersParams = {}) {
  return useQuery({
    queryKey: [...officersKey, 'list', params],
    queryFn: () => listOfficers(params),
    placeholderData: (prev) => prev,
  });
}

export function useOfficer(id: string) {
  return useQuery({
    queryKey: [...officersKey, 'detail', id],
    queryFn: () => getOfficer(id),
    enabled: !!id,
  });
}

export function useOfficerStats(id: string) {
  return useQuery({
    queryKey: [...officersKey, 'stats', id],
    queryFn: () => getOfficerStats(id),
    enabled: !!id,
  });
}

export function useOfficerComplaints(id: string, limit = 10) {
  return useQuery({
    queryKey: [...officersKey, 'complaints', id, limit],
    queryFn: () => getOfficerComplaints(id, limit),
    enabled: !!id,
  });
}

export function useCreateOfficer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OfficerInsert) => createOfficer(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: officersKey }),
  });
}

export function useUpdateOfficer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: OfficerUpdate }) =>
      updateOfficer(id, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: officersKey }),
  });
}

export function useDeactivateOfficer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateOfficer(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: officersKey }),
  });
}
