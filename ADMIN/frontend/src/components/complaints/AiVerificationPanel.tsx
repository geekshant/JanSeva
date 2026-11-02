import { useState, useMemo } from 'react';
import { useTranslation } from '@/i18n/translate';
import {
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAiVerification, useOfficerReviewComplaint } from '@/hooks/useAiVerification';
import { useSignedImageUrls } from '@/hooks/useSignedImageUrls';
import type {
  AiDecision,
  AiMatchLevel,
  AiEvidenceQuality,
  AiImageDiversity,
  ComplaintImageRow,
  ComplaintStatus,
  OfficerAiDecision,
  ReviewReasonType,
} from '@/types';

interface AiVerificationPanelProps {
  complaintId: string;
  status: ComplaintStatus;
}

type DialogMode = 'verify' | 'reject' | 'evidence';

const aiDecisionConfig: Record<
  AiDecision,
  { variant: 'success' | 'warning' | 'destructive'; labelKey: string }
> = {
  PASS: { variant: 'success', labelKey: 'aiVerification.pass' },
  REVIEW: { variant: 'warning', labelKey: 'aiVerification.review' },
  FAIL: { variant: 'destructive', labelKey: 'aiVerification.fail' },
};

const matchLevelKey: Record<AiMatchLevel, string> = {
  HIGH: 'aiVerification.matchHigh',
  MEDIUM: 'aiVerification.matchMedium',
  LOW: 'aiVerification.matchLow',
  NONE: 'aiVerification.matchNone',
};

const qualityKey: Record<AiEvidenceQuality, string> = {
  HIGH: 'aiVerification.qualityHigh',
  MEDIUM: 'aiVerification.qualityMedium',
  LOW: 'aiVerification.qualityLow',
  INSUFFICIENT: 'aiVerification.qualityInsufficient',
};

const diversityKey: Record<AiImageDiversity, string> = {
  GOOD: 'aiVerification.diversityGood',
  MODERATE: 'aiVerification.diversityModerate',
  POOR: 'aiVerification.diversityPoor',
};

const matchVariant: Record<AiMatchLevel, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  HIGH: 'success',
  MEDIUM: 'warning',
  LOW: 'secondary',
  NONE: 'destructive',
};

const qualityVariant: Record<AiEvidenceQuality, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  HIGH: 'success',
  MEDIUM: 'warning',
  LOW: 'secondary',
  INSUFFICIENT: 'destructive',
};

const diversityVariant: Record<AiImageDiversity, 'success' | 'warning' | 'destructive'> = {
  GOOD: 'success',
  MODERATE: 'warning',
  POOR: 'destructive',
};

// ---------------------------------------------------------------------------
// Structured reason options per decision mode.
// Each option maps a machine-readable `type` to its i18n label key.
// ---------------------------------------------------------------------------
const VERIFY_REASONS: { type: ReviewReasonType; labelKey: string }[] = [
  { type: 'evidence_match', labelKey: 'aiVerification.verifyReasonEvidenceMatch' },
  { type: 'ai_support', labelKey: 'aiVerification.verifyReasonAiSupport' },
  { type: 'sufficient_evidence', labelKey: 'aiVerification.verifyReasonSufficientEvidence' },
  { type: 'details_consistent', labelKey: 'aiVerification.verifyReasonDetailsConsistent' },
];

const REJECT_REASONS: { type: ReviewReasonType; labelKey: string }[] = [
  { type: 'evidence_mismatch', labelKey: 'aiVerification.rejectReasonEvidenceMismatch' },
  { type: 'category_mismatch', labelKey: 'aiVerification.rejectReasonCategoryMismatch' },
  { type: 'insufficient_evidence', labelKey: 'aiVerification.rejectReasonInsufficientEvidence' },
  { type: 'duplicate', labelKey: 'aiVerification.rejectReasonDuplicate' },
];

const EVIDENCE_REASONS: { type: ReviewReasonType; labelKey: string }[] = [
  { type: 'image_quality', labelKey: 'aiVerification.evidenceReasonImageQuality' },
  { type: 'missing_angles', labelKey: 'aiVerification.evidenceReasonMissingAngles' },
  { type: 'not_visible', labelKey: 'aiVerification.evidenceReasonNotVisible' },
  { type: 'additional_required', labelKey: 'aiVerification.evidenceReasonAdditionalRequired' },
];

function getReasonOptions(mode: DialogMode): { type: ReviewReasonType; labelKey: string }[] {
  if (mode === 'verify') return VERIFY_REASONS;
  if (mode === 'reject') return REJECT_REASONS;
  return EVIDENCE_REASONS;
}

function getDecisionFromMode(mode: DialogMode): OfficerAiDecision {
  if (mode === 'verify') return 'VERIFIED';
  if (mode === 'reject') return 'REJECTED';
  return 'EVIDENCE_REQUIRED';
}

function getReasonLabelKey(): string {
  return 'aiVerification.reasonOther';
}

export function AiVerificationPanel({ complaintId, status }: AiVerificationPanelProps) {
  const { t } = useTranslation();
  const verificationQuery = useAiVerification(complaintId);
  const reviewMutation = useOfficerReviewComplaint();

  // Dialog state
  const [dialogMode, setDialogMode] = useState<null | DialogMode>(null);
  const [selectedReasonType, setSelectedReasonType] = useState<ReviewReasonType | ''>('');
  const [otherReasonText, setOtherReasonText] = useState('');
  const [evidenceMessage, setEvidenceMessage] = useState('');

  // The complaint can be reviewed from any "needs human review" state —
  // AI_REVIEW_REQUIRED (AI was uncertain) and AI_FAILED (AI crashed or the
  // complaint was moved out of AI_CHECKING prematurely). EVIDENCE_REQUIRED
  // means the officer already acted and is waiting on the citizen, so we
  // do NOT show the review buttons there. The backend RPC independently
  // rejects stale reviews for VERIFIED/REJECTED/RESOLVED/CLOSED.
  const canReview =
    status === 'AI_REVIEW_REQUIRED' || status === 'AI_FAILED';

  const analysis = verificationQuery.data;

  const openDialog = (mode: DialogMode) => {
    setSelectedReasonType('');
    setOtherReasonText('');
    setEvidenceMessage('');
    setDialogMode(mode);
  };

  const closeDialog = () => {
    if (reviewMutation.isPending) return; // don't allow closing mid-submit
    setDialogMode(null);
    setSelectedReasonType('');
    setOtherReasonText('');
    setEvidenceMessage('');
  };

  // Validation: Confirm is enabled only when a valid reason selection exists.
  const canConfirm = useMemo(() => {
    if (!selectedReasonType) return false;
    if (selectedReasonType === 'other') return otherReasonText.trim().length > 0;
    return true;
  }, [selectedReasonType, otherReasonText]);

  const handleSubmit = async () => {
    if (!canConfirm || reviewMutation.isPending) return;
    const decision = getDecisionFromMode(dialogMode!);
    const options = getReasonOptions(dialogMode!);
    const reasonType = selectedReasonType as ReviewReasonType;

    // For predefined reasons, use the human-readable label as the text.
    // For "other", use the reviewer's custom text.
    let reasonText: string;
    if (reasonType === 'other') {
      reasonText = otherReasonText.trim();
    } else {
      const opt = options.find((o) => o.type === reasonType);
      reasonText = opt ? t(opt.labelKey) : otherReasonText.trim();
    }

    const msg = dialogMode === 'evidence' ? evidenceMessage.trim() || null : null;

    await reviewMutation.mutateAsync({
      complaintId,
      decision,
      reasonType,
      reason: reasonText,
      evidenceMessage: msg,
    });

    closeDialog();
  };

  // Determine the submit button label + loading state
  const submitLabelKey = dialogMode === 'verify'
    ? 'aiVerification.verifyComplaint'
    : dialogMode === 'reject'
      ? 'aiVerification.rejectComplaint'
      : 'aiVerification.requestEvidence';

  const loadingLabelKey = dialogMode === 'verify'
    ? 'aiVerification.verifying'
    : dialogMode === 'reject'
      ? 'aiVerification.rejecting'
      : 'aiVerification.requestingEvidence';

  const reasonLabelKey = dialogMode === 'verify'
    ? 'aiVerification.reasonLabel'
    : dialogMode === 'reject'
      ? 'aiVerification.reasonLabelReject'
      : 'aiVerification.reasonLabelEvidence';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuit className="h-4 w-4 text-primary" />
          {t('aiVerification.aiAnalysis')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {verificationQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : verificationQuery.error ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('aiVerification.couldNotLoad')}
          </p>
        ) : analysis ? (
          <>
            {/* AI Decision + metrics */}
            <div className="space-y-3">
              {analysis.ai_decision && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('aiVerification.aiDecision')}:
                  </span>
                  <Badge variant={aiDecisionConfig[analysis.ai_decision].variant}>
                    {t(aiDecisionConfig[analysis.ai_decision].labelKey)}
                  </Badge>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {analysis.category_match && (
                  <MetricRow
                    label={t('aiVerification.categoryMatch')}
                    value={t(matchLevelKey[analysis.category_match])}
                    variant={matchVariant[analysis.category_match]}
                  />
                )}
                {analysis.evidence_quality && (
                  <MetricRow
                    label={t('aiVerification.evidenceQuality')}
                    value={t(qualityKey[analysis.evidence_quality])}
                    variant={qualityVariant[analysis.evidence_quality]}
                  />
                )}
                {analysis.image_diversity && (
                  <MetricRow
                    label={t('aiVerification.imageDiversity')}
                    value={t(diversityKey[analysis.image_diversity])}
                    variant={diversityVariant[analysis.image_diversity]}
                  />
                )}
                {analysis.description_match && (
                  <MetricRow
                    label={t('aiVerification.descriptionMatch')}
                    value={t(matchLevelKey[analysis.description_match])}
                    variant={matchVariant[analysis.description_match]}
                  />
                )}
              </div>

              {analysis.reason && (
                <div className="rounded-md border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('aiVerification.reason')}
                  </p>
                  <p className="mt-1 text-sm">{analysis.reason}</p>
                </div>
              )}
            </div>

            {/* Citizen evidence images */}
            {analysis.evidence_images && analysis.evidence_images.length > 0 && (
              <EvidenceImages images={analysis.evidence_images} />
            )}

            {/* Officer/admin decision buttons */}
            {canReview && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <BrainCircuit className="h-4 w-4 shrink-0 text-amber-600" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    {t('aiVerification.overrideNotice')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    onClick={() => openDialog('verify')}
                    disabled={reviewMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t('aiVerification.verifyComplaint')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => openDialog('reject')}
                    disabled={reviewMutation.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                    {t('aiVerification.rejectComplaint')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openDialog('evidence')}
                    disabled={reviewMutation.isPending}
                  >
                    <ImageIcon className="h-4 w-4" />
                    {t('aiVerification.requestEvidence')}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('aiVerification.couldNotLoad')}
          </p>
        )}
      </CardContent>

      {/* ============================================================ */}
      {/* Structured decision dialog                                    */}
      {/* ============================================================ */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'verify' && t('aiVerification.verifyComplaint')}
              {dialogMode === 'reject' && t('aiVerification.rejectComplaint')}
              {dialogMode === 'evidence' && t('aiVerification.requestEvidence')}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'verify' && t('aiVerification.verifyConfirm')}
              {dialogMode === 'reject' && t('aiVerification.rejectConfirm')}
              {dialogMode === 'evidence' && t('aiVerification.requestEvidenceDesc')}
            </DialogDescription>
          </DialogHeader>

          {/* ---- AI Evidence Check context ---- */}
          {analysis && analysis.ai_decision && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('aiVerification.aiContextTitle')}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">{t('aiVerification.aiContextCategory')}</span>
                <span className="font-medium">
                  {analysis.category_match
                    ? t(matchLevelKey[analysis.category_match])
                    : '—'}
                </span>
                <span className="text-muted-foreground">{t('aiVerification.aiContextAssessment')}</span>
                <span>
                  <Badge variant={aiDecisionConfig[analysis.ai_decision].variant}>
                    {t(aiDecisionConfig[analysis.ai_decision].labelKey)}
                  </Badge>
                </span>
                {analysis.evidence_quality && (
                  <>
                    <span className="text-muted-foreground">{t('aiVerification.aiContextImagesAnalyzed')}</span>
                    <span className="font-medium">
                      {analysis.evidence_images?.length ?? 0}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">{t('aiVerification.aiContextRecommendation')}</span>
                <span className="font-medium">{t('aiVerification.aiRecommendationManual')}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* ---- Evidence request message (only for evidence mode) ---- */}
            {dialogMode === 'evidence' && (
              <div className="space-y-2">
                <Label htmlFor="evidence-message">{t('aiVerification.evidenceRequestMessage')}</Label>
                <Textarea
                  id="evidence-message"
                  placeholder={t('aiVerification.evidenceRequestPlaceholder')}
                  value={evidenceMessage}
                  onChange={(e) => setEvidenceMessage(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            )}

            {/* ---- Structured reason radio buttons ---- */}
            <div className="space-y-3">
              <Label>{t(reasonLabelKey)}</Label>
              <RadioGroup
                value={selectedReasonType}
                onValueChange={(val) => setSelectedReasonType(val as ReviewReasonType)}
                className="space-y-2"
              >
                {dialogMode &&
                  getReasonOptions(dialogMode).map((opt) => (
                    <div
                      key={opt.type}
                      className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={opt.type} id={`reason-${opt.type}`} className="mt-0.5" />
                      <Label
                        htmlFor={`reason-${opt.type}`}
                        className="cursor-pointer text-sm font-normal leading-snug"
                      >
                        {t(opt.labelKey)}
                      </Label>
                    </div>
                  ))}
                {/* Other option */}
                <div
                  className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem value="other" id="reason-other" className="mt-0.5" />
                  <Label
                    htmlFor="reason-other"
                    className="cursor-pointer text-sm font-normal leading-snug"
                  >
                    {t(getReasonLabelKey())}
                  </Label>
                </div>
              </RadioGroup>

              {/* Conditional text field for "Other" */}
              {selectedReasonType === 'other' && (
                <div className="space-y-2 pl-1">
                  <Label htmlFor="other-reason-text">{t('aiVerification.otherReasonLabel')}</Label>
                  <Textarea
                    id="other-reason-text"
                    placeholder={t('aiVerification.otherReasonPlaceholder')}
                    value={otherReasonText}
                    onChange={(e) => setOtherReasonText(e.target.value)}
                    rows={3}
                    className="resize-none"
                    autoFocus
                  />
                  {!otherReasonText.trim() && (
                    <p className="text-xs text-muted-foreground">
                      {t('aiVerification.otherReasonRequired')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={reviewMutation.isPending}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={dialogMode === 'reject' ? 'destructive' : 'default'}
              onClick={handleSubmit}
              disabled={!canConfirm || reviewMutation.isPending}
            >
              {reviewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t(loadingLabelKey)}
                </>
              ) : dialogMode === 'verify' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {t(submitLabelKey)}
                </>
              ) : dialogMode === 'reject' ? (
                <>
                  <XCircle className="h-4 w-4" />
                  {t(submitLabelKey)}
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" />
                  {t(submitLabelKey)}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helper sub-components
// ---------------------------------------------------------------------------

function MetricRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'success' | 'warning' | 'destructive' | 'secondary';
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={variant}>{value}</Badge>
    </div>
  );
}

function EvidenceImages({ images }: { images: ComplaintImageRow[] }) {
  const { t } = useTranslation();
  const signedUrls = useSignedImageUrls(images);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('aiVerification.citizenEvidence')}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => {
          const src = signedUrls[img.id];
          return (
            <div
              key={img.id}
              className="flex h-28 items-center justify-center overflow-hidden rounded-md border bg-muted"
            >
              {src ? (
                <img
                  src={src}
                  alt={t('complaints.evidenceImgAlt')}
                  className="h-28 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
