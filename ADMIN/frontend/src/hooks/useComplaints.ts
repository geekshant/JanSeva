import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { ComplaintStatus } from '@/types';
import {
  listComplaints,
  getComplaint,
  getComplaintByNumber,
  updateComplaintStatus,
  addComplaintNote,
  escalateComplaint,
  getComplaintHistory,
  getComplaintImages,
  bulkDeleteComplaints,
  type ListComplaintsParams,
} from '@/services/complaints';
import { assignComplaint, reassignComplaint, type AssignComplaintInput } from '@/services/assignment';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';

// ---------------------------------------------------------------------------
// Complaints hooks — TanStack Query wrappers around the service layer.
// ---------------------------------------------------------------------------

const complaintsKey = ['complaints'] as const;

export function useComplaints(params: ListComplaintsParams = {}) {
  return useQuery({
    queryKey: [...complaintsKey, 'list', params],
    queryFn: () => listComplaints(params),
    placeholderData: (prev) => prev,
  });
}

export function useComplaint(id: string) {
  return useQuery({
    queryKey: [...complaintsKey, 'detail', id],
    queryFn: () => getComplaint(id),
    enabled: !!id,
  });
}

export function useComplaintByNumber(complaintNumber: string) {
  return useQuery({
    queryKey: [...complaintsKey, 'number', complaintNumber],
    queryFn: () => getComplaintByNumber(complaintNumber),
    enabled: !!complaintNumber,
  });
}

export function useComplaintHistory(complaintId: string) {
  return useQuery({
    queryKey: [...complaintsKey, 'history', complaintId],
    queryFn: () => getComplaintHistory(complaintId),
    enabled: !!complaintId,
  });
}

export function useComplaintImages(complaintId: string) {
  return useQuery({
    queryKey: [...complaintsKey, 'images', complaintId],
    queryFn: () => getComplaintImages(complaintId),
    enabled: !!complaintId,
  });
}

export function useUpdateComplaintStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      comment,
      updatedBy,
    }: {
      id: string;
      status: ComplaintStatus;
      comment?: string | null;
      updatedBy?: string | null;
    }) => updateComplaintStatus(id, status, comment ?? null, updatedBy ?? null),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: complaintsKey });
      void qc.invalidateQueries({ queryKey: [...complaintsKey, 'detail', vars.id] });
      toastSuccess(`Status changed to ${vars.status}`);
    },
    onError: (err) => toastError('Failed to update status', errMessage(err)),
  });
}

export function useAddComplaintNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      complaintId,
      note,
      updatedBy,
    }: {
      complaintId: string;
      note: string;
      updatedBy?: string | null;
    }) => addComplaintNote(complaintId, note, updatedBy ?? null),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...complaintsKey, 'history', vars.complaintId] });
      void qc.invalidateQueries({ queryKey: [...complaintsKey, 'detail', vars.complaintId] });
      toastSuccess('Note added');
    },
    onError: (err) => toastError('Failed to add note', errMessage(err)),
  });
}

export function useEscalateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reason,
      updatedBy,
    }: {
      id: string;
      reason: string;
      updatedBy?: string | null;
    }) => escalateComplaint(id, reason, updatedBy ?? null),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: complaintsKey });
      void qc.invalidateQueries({ queryKey: [...complaintsKey, 'detail', vars.id] });
      toastSuccess('Complaint escalated');
    },
    onError: (err) => toastError('Failed to escalate', errMessage(err)),
  });
}

export function useAssignComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignComplaintInput) => assignComplaint(input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: complaintsKey });
      void qc.invalidateQueries({ queryKey: [...complaintsKey, 'detail', vars.complaintId] });
      void qc.invalidateQueries({ queryKey: [...complaintsKey, 'history', vars.complaintId] });
      toastSuccess('Complaint assigned');
    },
    onError: (err) => toastError('Failed to assign complaint', errMessage(err)),
  });
}

export function useReassignComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignComplaintInput) => reassignComplaint(input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: complaintsKey });
      void qc.invalidateQueries({ queryKey: [...complaintsKey, 'detail', vars.complaintId] });
      void qc.invalidateQueries({ queryKey: [...complaintsKey, 'history', vars.complaintId] });
      toastSuccess('Complaint reassigned');
    },
    onError: (err) => toastError('Failed to reassign', errMessage(err)),
  });
}

export function useBulkDeleteComplaints() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      complaintIds,
      reason,
      deletedBy,
    }: {
      complaintIds: string[];
      reason: string;
      deletedBy?: string | null;
    }) => bulkDeleteComplaints(complaintIds, reason, deletedBy ?? null),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: complaintsKey });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toastSuccess(`Deleted ${data.deleted_count} complaint(s)`);
    },
    onError: (err) => toastError('Failed to delete complaints', errMessage(err)),
  });
}
