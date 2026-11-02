import { Badge, type BadgeProps } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/translate';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CircleDashed,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import type { AiDecision, AiMatchLevel, AiEvidenceQuality } from '@/types';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// AiDecisionBadge — displays the AI's evidence-verification decision.
//
// This is the AI's recommendation, NOT the human complaint status.
// States:
//   No record / ai_status = null       → Not Analyzed
//   ai_status = 'pending'              → Analyzing...
//   ai_decision = PASS                  → Supported
//   ai_decision = REVIEW                → Review Required
//   ai_decision = FAIL                  → Not Supported
// ---------------------------------------------------------------------------

interface AiDecisionInfo {
  variant: BadgeProps['variant'];
  icon: LucideIcon;
  labelKey: string;
}

const decisionConfig: Record<AiDecision, AiDecisionInfo> = {
  PASS: { variant: 'success', icon: CheckCircle2, labelKey: 'aiDecision.supported' },
  REVIEW: { variant: 'warning', icon: AlertTriangle, labelKey: 'aiDecision.reviewRequired' },
  FAIL: { variant: 'destructive', icon: XCircle, labelKey: 'aiDecision.notSupported' },
};

export interface AiDecisionBadgeProps {
  decision: AiDecision | null | undefined;
  aiStatus?: string | null;
  reason?: string | null;
  categoryMatch?: AiMatchLevel | null;
  evidenceQuality?: AiEvidenceQuality | null;
  imageCount?: number | null;
  detectedCategory?: string | null;
  selectedCategory?: string | null;
  className?: string;
}

export function AiDecisionBadge({
  decision,
  aiStatus,
  reason,
  categoryMatch,
  evidenceQuality,
  imageCount,
  detectedCategory,
  selectedCategory,
  className,
}: AiDecisionBadgeProps) {
  const { t } = useTranslation();

  // Build a tooltip with the full AI analysis context.
  const tooltipParts: string[] = [];
  if (decision) {
    tooltipParts.push(t(decisionConfig[decision].labelKey));
  }
  if (selectedCategory || detectedCategory) {
    tooltipParts.push(`${t('aiDecision.reported')}: ${selectedCategory ?? '—'}`);
    tooltipParts.push(`${t('aiDecision.detected')}: ${detectedCategory ?? '—'}`);
  }
  if (categoryMatch) {
    tooltipParts.push(`${t('aiDecision.categoryMatch')}: ${categoryMatch}`);
  }
  if (evidenceQuality) {
    tooltipParts.push(`${t('aiDecision.evidenceQuality')}: ${evidenceQuality}`);
  }
  if (imageCount != null && imageCount > 0) {
    tooltipParts.push(`${t('aiDecision.imagesAnalyzed', { count: imageCount })}`);
  }
  if (reason) {
    tooltipParts.push(reason);
  }
  const tooltip = tooltipParts.join('\n');

  // --- State: AI is still analyzing ---
  if (aiStatus === 'pending' && !decision) {
    return (
      <Badge variant="secondary" className={cn('text-xs gap-1', className)} title={tooltip}>
        <Loader2 className="h-3 w-3 animate-spin" />
        {t('aiDecision.analyzing')}
      </Badge>
    );
  }

  // --- State: AI made a decision ---
  if (decision && decisionConfig[decision]) {
    const config = decisionConfig[decision];
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className={cn('text-xs gap-1', className)} title={tooltip}>
        <Icon className="h-3 w-3" />
        {t(config.labelKey)}
      </Badge>
    );
  }

  // --- State: No AI analysis (no record or no decision) ---
  return (
    <Badge variant="outline" className={cn('text-xs gap-1 text-muted-foreground', className)} title={tooltip}>
      <CircleDashed className="h-3 w-3" />
      {t('aiDecision.notAnalyzed')}
    </Badge>
  );
}
