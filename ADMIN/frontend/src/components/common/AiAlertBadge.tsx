import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/translate';
import { AlertTriangle, AlertOctagon } from 'lucide-react';
import type { AiMatchLevel, AiEvidenceQuality, AiDecision } from '@/types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// AiAlertBadge — shows AI-derived alerts for a complaint.
//
// Alerts are derived from actual AI verification data:
//   - category_match = NONE / LOW     → "Category Mismatch"
//   - evidence_quality = INSUFFICIENT  → "Insufficient Evidence"
//   - ai_decision = FAIL               → "Not Supported"
//   - ai_status = 'pending' (stale)    → "Analysis Pending"
//   - image_count = 0                   → "No Images"
//
// Multiple alerts are aggregated into "N Alerts" with a tooltip listing them.
// ---------------------------------------------------------------------------

export type AiAlertLevel = 'info' | 'warning' | 'critical';

export interface AiAlert {
  level: AiAlertLevel;
  labelKey: string;
}

export function deriveAiAlerts(params: {
  aiDecision?: AiDecision | null;
  aiStatus?: string | null;
  categoryMatch?: AiMatchLevel | null;
  evidenceQuality?: AiEvidenceQuality | null;
  imageCount?: number | null;
}): AiAlert[] {
  const { aiDecision, aiStatus, categoryMatch, evidenceQuality, imageCount } = params;
  const alerts: AiAlert[] = [];

  // --- While AI is still processing, do NOT derive alerts from partial
  // data (imageCount=0, categoryMatch=null are meaningless before AI
  // runs). Show a single "Processing" info alert instead.
  const isProcessing =
    (aiStatus === 'pending' || aiStatus === 'analyzing') && !aiDecision;
  if (isProcessing) {
    alerts.push({ level: 'info', labelKey: 'aiAlert.processing' });
    return alerts;
  }

  // --- AI analysis failed (final state, not transient)
  if (aiStatus === 'error' && !aiDecision) {
    alerts.push({ level: 'critical', labelKey: 'aiAlert.analysisFailed' });
    return alerts;
  }

  // --- AI completed — derive alerts from the final results.
  if (aiDecision === 'FAIL') {
    alerts.push({ level: 'critical', labelKey: 'aiAlert.analysisFailed' });
  }

  // Category mismatch
  if (categoryMatch === 'NONE' || categoryMatch === 'LOW') {
    alerts.push({ level: 'warning', labelKey: 'aiAlert.categoryMismatch' });
  }

  // Insufficient evidence
  if (evidenceQuality === 'INSUFFICIENT') {
    alerts.push({ level: 'warning', labelKey: 'aiAlert.insufficientEvidence' });
  }

  // No images (only meaningful if AI actually ran and found 0 images)
  if (imageCount === 0 && aiStatus === 'completed') {
    alerts.push({ level: 'warning', labelKey: 'aiAlert.noImages' });
  }

  return alerts;
}

const levelVariant: Record<AiAlertLevel, 'secondary' | 'warning' | 'destructive'> = {
  info: 'secondary',
  warning: 'warning',
  critical: 'destructive',
};

export function AiAlertBadge({
  alerts,
  className,
}: {
  alerts: AiAlert[];
  className?: string;
}) {
  const { t } = useTranslation();

  if (alerts.length === 0) {
    return <span className={cn('text-xs text-muted-foreground', className)}>—</span>;
  }

  // Single alert — show it directly
  if (alerts.length === 1) {
    const alert = alerts[0];
    const Icon = alert.level === 'critical' ? AlertOctagon : AlertTriangle;
    return (
      <Badge
        variant={levelVariant[alert.level]}
        className={cn('text-xs gap-1', className)}
        title={t(alert.labelKey)}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{t(alert.labelKey)}</span>
      </Badge>
    );
  }

  // Multiple alerts — aggregate with tooltip
  const tooltip = alerts.map((a, i) => `${i + 1}. ${t(a.labelKey)}`).join('\n');
  const hasCritical = alerts.some((a) => a.level === 'critical');
  const Icon = hasCritical ? AlertOctagon : AlertTriangle;

  return (
    <Badge
      variant={levelVariant[hasCritical ? 'critical' : 'warning']}
      className={cn('text-xs gap-1', className)}
      title={tooltip}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {t('aiAlert.alertsCount', { count: alerts.length })}
    </Badge>
  );
}
