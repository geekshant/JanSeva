import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getComplaintsForAiReview,
  getAiVerification,
  officerReviewComplaint,
  listCategoryAiConfigs,
  updateCategoryAiConfig,
} from '@/services/aiVerification';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';
import type {
  OfficerAiDecision,
  ReviewReasonType,
  UpdateCategoryAiConfigInput,
} from '@/types';

const aiVerificationKey = ['aiVerification'] as const;

// ---------------------------------------------------------------------------
// AI Verification hooks — TanStack Query wrappers around the service layer.
// ---------------------------------------------------------------------------

/** Complaints in AI_REVIEW_REQUIRED status with their AI analysis. */
export function useAiReviewQueue(limit = 50, offset = 0) {
  return useQuery({
    queryKey: [...aiVerificationKey, 'queue', limit, offset],
    queryFn: () => getComplaintsForAiReview(limit, offset),
  });
}

/** Full AI analysis for a single complaint. */
export function useAiVerification(complaintId: string) {
  return useQuery({
    queryKey: [...aiVerificationKey, 'analysis', complaintId],
    queryFn: () => getAiVerification(complaintId),
    enabled: !!complaintId,
  });
}

/** Officer/admin decision mutation — VERIFIED / REJECTED / EVIDENCE_REQUIRED. */
export function useOfficerReviewComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      complaintId,
      decision,
      reasonType,
      reason,
      evidenceMessage,
    }: {
      complaintId: string;
      decision: OfficerAiDecision;
      reasonType: ReviewReasonType;
      reason: string;
      evidenceMessage?: string | null;
    }) =>
      officerReviewComplaint(
        complaintId,
        decision,
        reasonType,
        reason,
        evidenceMessage ?? null,
      ),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: aiVerificationKey });
      void qc.invalidateQueries({ queryKey: ['complaints', 'detail', vars.complaintId] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      toastSuccess('Decision recorded');
    },
    onError: (err) => {
      const msg = errMessage(err);
      // Surface actionable messages for the most common failure modes.
      if (/already been reviewed/i.test(msg)) {
        toastError(
          'Unable to record decision',
          'This complaint has already been reviewed. Please refresh the page to see the latest status.',
        );
      } else if (/authorized admins and officers/i.test(msg)) {
        toastError(
          'Unable to record decision',
          'You may not have permission to review this complaint.',
        );
      } else {
        toastError('Failed to record decision', msg);
      }
    },
  });
}

/** All categories with their AI config (joined). */
export function useCategoryAiConfigs() {
  return useQuery({
    queryKey: [...aiVerificationKey, 'configs'],
    queryFn: () => listCategoryAiConfigs(),
  });
}

/** Update a category's AI config via RPC. */
export function useUpdateCategoryAiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCategoryAiConfigInput) => updateCategoryAiConfig(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...aiVerificationKey, 'configs'] });
      toastSuccess('Configuration saved');
    },
    onError: (err) => toastError('Failed to save configuration', errMessage(err)),
  });
}
