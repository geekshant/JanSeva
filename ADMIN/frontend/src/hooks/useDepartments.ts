import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listDepartments,
  listActiveDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  getDepartmentStats,
  getDepartmentComplaints,
  getDepartmentSlaRules,
} from '@/services/departments';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';
import type { DepartmentInsert, DepartmentUpdate } from '@/types';

const departmentsKey = ['departments'] as const;

export function useDepartments() {
  return useQuery({
    queryKey: [...departmentsKey, 'list'],
    queryFn: () => listDepartments(),
  });
}

export function useActiveDepartments() {
  return useQuery({
    queryKey: [...departmentsKey, 'active'],
    queryFn: () => listActiveDepartments(),
  });
}

export function useDepartment(id: string) {
  return useQuery({
    queryKey: [...departmentsKey, 'detail', id],
    queryFn: () => getDepartment(id),
    enabled: !!id,
  });
}

export function useDepartmentStats(id: string) {
  return useQuery({
    queryKey: [...departmentsKey, 'stats', id],
    queryFn: () => getDepartmentStats(id),
    enabled: !!id,
  });
}

export function useDepartmentComplaints(id: string, limit = 10) {
  return useQuery({
    queryKey: [...departmentsKey, 'complaints', id, limit],
    queryFn: () => getDepartmentComplaints(id, limit),
    enabled: !!id,
  });
}

export function useDepartmentSlaRules(id: string) {
  return useQuery({
    queryKey: [...departmentsKey, 'sla', id],
    queryFn: () => getDepartmentSlaRules(id),
    enabled: !!id,
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DepartmentInsert) => createDepartment(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: departmentsKey });
      toastSuccess('Department created');
    },
    onError: (err) => toastError('Failed to create department', errMessage(err)),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DepartmentUpdate }) =>
      updateDepartment(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: departmentsKey });
      toastSuccess('Department updated');
    },
    onError: (err) => toastError('Failed to update department', errMessage(err)),
  });
}

export function useDeactivateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateDepartment(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: departmentsKey });
      toastSuccess('Department deactivated');
    },
    onError: (err) => toastError('Failed to deactivate', errMessage(err)),
  });
}
