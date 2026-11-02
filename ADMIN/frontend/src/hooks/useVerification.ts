import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getResolutionEvidence,
  addResolutionEvidence,
  deleteResolutionEvidence,
  getCommunityVerifications,
  getVerificationSummary,
  openVerification,
  confirmResolution,
  reopenComplaint,
  reopenComplaintTyped,
  markNeedsReview,
  getReopenedComplaints,
  getReopenedComplaintsCount,
} from '@/services/verification';
import { getAiReviewQueueCount } from '@/services/aiVerification';
import { useActiveSafetyAlertsCount } from '@/hooks/useSafety';
import { supabase } from '@/lib/supabase';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';
import { useEffect } from 'react';
import type { ReopenReasonType, ResolutionEvidenceInsert } from '@/types';

const verificationKey = ['verification'] as const;

export function useResolutionEvidence(complaintId: string) {
  return useQuery({
    queryKey: [...verificationKey, 'evidence', complaintId],
    queryFn: () => getResolutionEvidence(complaintId),
    enabled: !!complaintId,
  });
}

export function useAddResolutionEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ResolutionEvidenceInsert) => addResolutionEvidence(input),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...verificationKey, 'evidence', vars.complaint_id] });
      void qc.invalidateQueries({ queryKey: ['complaints', 'detail', vars.complaint_id] });
    },
  });
}

export function useDeleteResolutionEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, complaintId: _complaintId }: { id: string; complaintId: string }) =>
      deleteResolutionEvidence(id),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...verificationKey, 'evidence', vars.complaintId] });
    },
  });
}

export function useCommunityVerifications(complaintId: string) {
  return useQuery({
    queryKey: [...verificationKey, 'community', complaintId],
    queryFn: () => getCommunityVerifications(complaintId),
    enabled: !!complaintId,
  });
}

export function useVerificationSummary(complaintId: string) {
  return useQuery({
    queryKey: [...verificationKey, 'summary', complaintId],
    queryFn: () => getVerificationSummary(complaintId),
    enabled: !!complaintId,
  });
}

export function useOpenVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (complaintId: string) => openVerification(complaintId),
    onSuccess: (_data, complaintId) => {
      void qc.invalidateQueries({ queryKey: [...verificationKey, 'summary', complaintId] });
      void qc.invalidateQueries({ queryKey: ['complaints', 'detail', complaintId] });
    },
  });
}

export function useConfirmResolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      complaintId,
      adminId,
    }: {
      complaintId: string;
      adminId: string | null;
    }) => confirmResolution(complaintId, adminId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...verificationKey, 'summary', vars.complaintId] });
      void qc.invalidateQueries({ queryKey: ['complaints', 'detail', vars.complaintId] });
      toastSuccess('Resolution confirmed');
    },
    onError: (err) => toastError('Failed to confirm resolution', errMessage(err)),
  });
}

export function useReopenComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      complaintId,
      reason,
      adminId,
    }: {
      complaintId: string;
      reason: string;
      adminId: string | null;
    }) => reopenComplaint(complaintId, reason, adminId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...verificationKey, 'summary', vars.complaintId] });
      void qc.invalidateQueries({ queryKey: [...verificationKey, 'reopened'] });
      void qc.invalidateQueries({ queryKey: ['navCounts'] });
      void qc.invalidateQueries({ queryKey: ['complaints', 'detail', vars.complaintId] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toastSuccess('Complaint reopened');
    },
    onError: (err) => toastError('Failed to reopen complaint', errMessage(err)),
  });
}

/**
 * Reopens a complaint with a structured reason type (used by the
 * ReopenComplaintDialog). Calls the `reopen_complaint` RPC which sets
 * status = REOPENED and records reopened_at / reopened_by / reopen_reason.
 */
export function useReopenComplaintTyped() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      complaintId,
      reasonType,
      reason,
    }: {
      complaintId: string;
      reasonType: ReopenReasonType;
      reason: string;
    }) => reopenComplaintTyped(complaintId, reasonType, reason),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...verificationKey, 'summary', vars.complaintId] });
      void qc.invalidateQueries({ queryKey: [...verificationKey, 'reopened'] });
      void qc.invalidateQueries({ queryKey: ['navCounts'] });
      void qc.invalidateQueries({ queryKey: ['complaints', 'detail', vars.complaintId] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toastSuccess('Complaint reopened');
    },
    onError: (err) => toastError('Failed to reopen complaint', errMessage(err)),
  });
}

export function useMarkNeedsReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      complaintId,
      adminId,
    }: {
      complaintId: string;
      adminId: string | null;
    }) => markNeedsReview(complaintId, adminId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...verificationKey, 'summary', vars.complaintId] });
      void qc.invalidateQueries({ queryKey: ['complaints', 'detail', vars.complaintId] });
      toastSuccess('Marked for review');
    },
    onError: (err) => toastError('Failed to mark for review', errMessage(err)),
  });
}

export function useReopenedComplaints(limit = 100, offset = 0) {
  return useQuery({
    queryKey: [...verificationKey, 'reopened', limit, offset],
    queryFn: () => getReopenedComplaints(limit, offset),
  });
}

/** Live count of reopened complaints — used by the sidebar badge. */
export function useReopenedComplaintsCount() {
  return useQuery({
    queryKey: [...verificationKey, 'reopenedCount'],
    queryFn: () => getReopenedComplaintsCount(),
  });
}

/** Live count of complaints in the AI Review Queue — used by the sidebar badge. */
export function useAiReviewQueueCount() {
  return useQuery({
    queryKey: ['aiVerification', 'queueCount'],
    queryFn: () => getAiReviewQueueCount(),
  });
}

/**
 * Aggregated sidebar badge counts for AI Review Queue + Reopened Cases.
 *
 * Subscribes to Supabase Realtime `postgres_changes` on the `complaints`
 * table so the counts refresh instantly when:
 *   - a new complaint is flagged for review (requires_human_review = true)
 *   - AI analysis fails or returns low confidence
 *   - an officer completes a review (requires_human_review := false)
 *   - a complaint is reopened (status -> REOPENED, reopened_at set)
 *   - a reopened complaint is re-resolved
 *
 * Both counts come from the SAME RPCs the list pages use, so the badge
 * numbers always match the page contents.
 */
export function useNavCounts() {
  const qc = useQueryClient();
  const aiReviewCount = useAiReviewQueueCount();
  const reopenedCount = useReopenedComplaintsCount();
  const safetyCount = useActiveSafetyAlertsCount();

  useEffect(() => {
    // One channel handles both counts — any UPDATE or INSERT on complaints
    // could change either number, so we invalidate the whole navCounts family.
    const channel = supabase
      .channel('nav-counts-complaints')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        () => {
          void qc.invalidateQueries({ queryKey: ['aiVerification', 'queueCount'] });
          void qc.invalidateQueries({ queryKey: [...verificationKey, 'reopenedCount'] });
          void qc.invalidateQueries({ queryKey: [...verificationKey, 'reopened'] });
          void qc.invalidateQueries({ queryKey: ['aiVerification', 'queue'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaint_ai_verification' },
        () => {
          // AI verification status changes (e.g. AI just failed) flip
          // requires_human_review via the edge function, but the row update
          // arrives on this table slightly before the complaints update —
          // invalidate proactively.
          void qc.invalidateQueries({ queryKey: ['aiVerification', 'queueCount'] });
          void qc.invalidateQueries({ queryKey: ['aiVerification', 'queue'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'safety_alerts' },
        () => {
          void qc.invalidateQueries({ queryKey: ['safety', 'count'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'safety_incidents' },
        () => {
          void qc.invalidateQueries({ queryKey: ['safety', 'count'] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  return {
    aiReviewCount: aiReviewCount.data ?? 0,
    reopenedCount: reopenedCount.data ?? 0,
    safetyCount: safetyCount.data ?? 0,
    isLoading:
      aiReviewCount.isLoading || reopenedCount.isLoading || safetyCount.isLoading,
    isError:
      aiReviewCount.isError || reopenedCount.isError || safetyCount.isError,
    refetch: () => {
      void aiReviewCount.refetch();
      void reopenedCount.refetch();
      void safetyCount.refetch();
    },
  };
}
