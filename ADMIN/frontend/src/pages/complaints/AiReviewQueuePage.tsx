import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { CheckCircle2, AlertTriangle, BrainCircuit, ImageOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/common/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAiReviewQueue } from '@/hooks/useAiVerification';
import type {
  AiDecision,
  AiMatchLevel,
  AiReviewQueueItem,
  ComplaintStatus,
} from '@/types';

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// AI Decision badge — maps the AI's verdict to a colored badge + label.
// Distinct from the complaint StatusBadge: a complaint can be in AI_FAILED
// status while the AI's own decision was REVIEW (e.g. the citizen moved it
// out of AI_CHECKING before AI finished). Showing both gives the reviewer
// the full picture.
// ---------------------------------------------------------------------------
const aiDecisionConfig: Record<
  AiDecision,
  { variant: 'success' | 'warning' | 'destructive'; labelKey: string }
> = {
  PASS: { variant: 'success', labelKey: 'aiVerification.aiDecisionVerified' },
  REVIEW: { variant: 'warning', labelKey: 'aiVerification.aiDecisionNeedsReview' },
  FAIL: { variant: 'destructive', labelKey: 'aiVerification.aiDecisionRejected' },
};

// ---------------------------------------------------------------------------
// AI Alert — the most important reason this complaint landed in the queue.
// Derived from ai_decision, ai_status, evidence_quality, category_match,
// and image_count. Shown as a small colored alert badge in its own column
// so a reviewer can scan the queue for the most urgent cases first.
// ---------------------------------------------------------------------------
function deriveAiAlert(
  item: AiReviewQueueItem,
): { variant: 'warning' | 'destructive' | 'secondary'; labelKey: string } {
  // AI crashed or never finished — most urgent.
  if (item.ai_status === 'error' || (item.status as ComplaintStatus) === 'AI_FAILED') {
    return { variant: 'destructive', labelKey: 'aiVerification.alertAnalysisFailed' };
  }
  // No evidence at all.
  if (!item.image_count || item.image_count === 0) {
    return { variant: 'warning', labelKey: 'aiVerification.alertNoImages' };
  }
  // Category mismatch — high priority, the citizen picked the wrong category.
  if (item.category_match === 'NONE') {
    return { variant: 'destructive', labelKey: 'aiVerification.alertCategoryMismatch' };
  }
  // Insufficient evidence quality.
  if (item.evidence_quality === 'INSUFFICIENT') {
    return { variant: 'warning', labelKey: 'aiVerification.alertInsufficientEvidence' };
  }
  // Low category match — borderline, needs human eyes.
  if (item.category_match === 'LOW') {
    return { variant: 'warning', labelKey: 'aiVerification.alertLowConfidence' };
  }
  // AI said FAIL but it's not a hard mismatch — still flagged.
  if (item.ai_decision === 'FAIL') {
    return { variant: 'destructive', labelKey: 'aiVerification.aiDecisionAiFailed' };
  }
  // Default: review required, no specific alert.
  return { variant: 'secondary', labelKey: 'aiVerification.alertNone' };
}

// ---------------------------------------------------------------------------
// AI Confidence — we display the category_match level (HIGH/MEDIUM/LOW/NONE)
// as the confidence proxy, since the AI edge function doesn't emit a numeric
// confidence score. The edge function's `ai_category_confidence` column on
// complaints is unused, so category_match is the authoritative signal.
// ---------------------------------------------------------------------------
const aiConfidenceConfig: Record<
  AiMatchLevel,
  { variant: 'success' | 'warning' | 'destructive' | 'secondary'; labelKey: string }
> = {
  HIGH: { variant: 'success', labelKey: 'aiVerification.aiConfidenceHigh' },
  MEDIUM: { variant: 'warning', labelKey: 'aiVerification.aiConfidenceMedium' },
  LOW: { variant: 'secondary', labelKey: 'aiVerification.aiConfidenceLow' },
  NONE: { variant: 'destructive', labelKey: 'aiVerification.aiConfidenceNone' },
};

function EvidenceCount({ item }: { item: AiReviewQueueItem }) {
  const { t } = useTranslation();
  const count = item.image_count ?? 0;
  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ImageOff className="h-3.5 w-3.5" />
        {t('aiVerification.evidenceCountZero')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium">
      <BrainCircuit className="h-3.5 w-3.5 text-muted-foreground" />
      {t('aiVerification.evidenceCount', { count })}
    </span>
  );
}

export function AiReviewQueuePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // 200 rows is plenty for the queue — the partial index on
  // requires_human_review keeps this fast even on large installs.
  const queueQuery = useAiReviewQueue(200, 0);

  return (
    <PageContainer
      title={t('aiVerification.reviewQueue')}
      description={t('aiVerification.reviewQueueDesc')}
    >
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {queueQuery.error ? (
              <ErrorState
                title={t('aiVerification.couldNotLoad')}
                message={
                  queueQuery.error instanceof Error
                    ? queueQuery.error.message
                    : t('aiVerification.couldNotLoadMsg')
                }
                onRetry={() => void queueQuery.refetch()}
              />
            ) : queueQuery.isLoading ? (
              <LoadingState message={t('aiVerification.loadingQueue')} />
            ) : !queueQuery.data || queueQuery.data.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={t('aiVerification.empty')}
                description={t('aiVerification.emptyMsg')}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('aiVerification.tableId')}</TableHead>
                    <TableHead>{t('aiVerification.tableCategory')}</TableHead>
                    <TableHead>{t('aiVerification.tableTitle')}</TableHead>
                    <TableHead>{t('aiVerification.tableLocation')}</TableHead>
                    <TableHead>{t('aiVerification.tableAiResult')}</TableHead>
                    <TableHead>{t('aiVerification.tableAiConfidence')}</TableHead>
                    <TableHead>{t('aiVerification.tableAiAlert')}</TableHead>
                    <TableHead>{t('aiVerification.tableEvidence')}</TableHead>
                    <TableHead>{t('aiVerification.tablePriority')}</TableHead>
                    <TableHead>{t('aiVerification.tableSubmitted')}</TableHead>
                    <TableHead className="text-right">
                      {t('aiVerification.tableActions')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queueQuery.data.map((item: AiReviewQueueItem) => {
                    const alert = deriveAiAlert(item);
                    return (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/40">
                        <TableCell
                          className="font-mono text-xs"
                          onClick={() =>
                            navigate(`/complaints/${item.id}?ai-review=true`)
                          }
                        >
                          {item.complaint_number}
                        </TableCell>
                        <TableCell
                          className="text-sm"
                          onClick={() =>
                            navigate(`/complaints/${item.id}?ai-review=true`)
                          }
                        >
                          {item.category_name ?? '—'}
                        </TableCell>
                        <TableCell
                          className="max-w-[220px] truncate text-sm font-medium"
                          onClick={() =>
                            navigate(`/complaints/${item.id}?ai-review=true`)
                          }
                        >
                          {item.title}
                        </TableCell>
                        <TableCell
                          className="max-w-[140px] truncate text-sm text-muted-foreground"
                          onClick={() =>
                            navigate(`/complaints/${item.id}?ai-review=true`)
                          }
                        >
                          {item.address ?? '—'}
                        </TableCell>
                        <TableCell>
                          {item.ai_decision ? (
                            <Badge variant={aiDecisionConfig[item.ai_decision].variant}>
                              {t(aiDecisionConfig[item.ai_decision].labelKey)}
                            </Badge>
                          ) : item.ai_status === 'error' ? (
                            <Badge variant="destructive">
                              {t('aiVerification.aiDecisionAiFailed')}
                            </Badge>
                          ) : item.ai_status === 'analyzing' || item.ai_status === 'pending' ? (
                            <Badge variant="secondary">
                              {t('aiVerification.aiDecisionPending')}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.ai_confidence ? (
                            <Badge variant={aiConfidenceConfig[item.ai_confidence].variant}>
                              {t(aiConfidenceConfig[item.ai_confidence].labelKey)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {t('aiVerification.aiConfidenceUnknown')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={alert.variant}>
                            {alert.variant !== 'secondary' && (
                              <AlertTriangle className="mr-1 h-3 w-3" />
                            )}
                            {t(alert.labelKey)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <EvidenceCount item={item} />
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={item.severity} />
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap text-xs text-muted-foreground"
                          onClick={() =>
                            navigate(`/complaints/${item.id}?ai-review=true`)
                          }
                        >
                          {formatTimeAgo(item.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(`/complaints/${item.id}?ai-review=true`)
                            }
                          >
                            {t('aiVerification.review')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
