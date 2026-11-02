import { Badge, type BadgeProps } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/translate';
import type { ComplaintStatus, ComplaintSeverity } from '@/types';
import { cn } from '@/lib/utils';

const statusConfig: Record<ComplaintStatus, { variant: BadgeProps['variant']; key: string }> = {
  SUBMITTED: { variant: 'secondary', key: 'status.submitted' },
  AUTO_VALIDATING: { variant: 'secondary', key: 'status.autoValidating' },
  NEEDS_REVIEW: { variant: 'warning', key: 'status.needsReview' },
  VERIFIED: { variant: 'success', key: 'status.verified' },
  ASSIGNED: { variant: 'warning', key: 'status.assigned' },
  ACKNOWLEDGED: { variant: 'default', key: 'status.acknowledged' },
  IN_PROGRESS: { variant: 'default', key: 'status.inProgress' },
  RESOLUTION_SUBMITTED: { variant: 'default', key: 'status.resolutionSubmitted' },
  RESOLUTION_UNDER_REVIEW: { variant: 'warning', key: 'status.underReview' },
  COMMUNITY_VERIFICATION: { variant: 'warning', key: 'status.communityVerification' },
  RESOLVED: { variant: 'success', key: 'status.resolved' },
  REOPENED: { variant: 'destructive', key: 'status.reopened' },
  ESCALATED: { variant: 'destructive', key: 'status.escalated' },
  REJECTED: { variant: 'destructive', key: 'status.rejected' },
  CLOSED: { variant: 'secondary', key: 'status.closed' },
  AI_CHECKING: { variant: 'warning', key: 'status.aiChecking' },
  AI_VERIFIED: { variant: 'success', key: 'status.aiVerified' },
  AI_REVIEW_REQUIRED: { variant: 'warning', key: 'status.aiReviewRequired' },
  AI_FAILED: { variant: 'destructive', key: 'status.aiFailed' },
  EVIDENCE_REQUIRED: { variant: 'default', key: 'status.evidenceRequired' },
};

export function StatusBadge({ status, className }: { status: ComplaintStatus; className?: string }) {
  const { t } = useTranslation();
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className={cn('text-xs', className)}>
      {t(config.key)}
    </Badge>
  );
}

const severityConfig: Record<ComplaintSeverity, { variant: BadgeProps['variant']; key: string }> = {
  LOW: { variant: 'secondary', key: 'severity.low' },
  MEDIUM: { variant: 'warning', key: 'severity.medium' },
  HIGH: { variant: 'default', key: 'severity.high' },
  CRITICAL: { variant: 'destructive', key: 'severity.critical' },
};

export function SeverityBadge({ severity, className }: { severity: ComplaintSeverity; className?: string }) {
  const { t } = useTranslation();
  const config = severityConfig[severity];
  return (
    <Badge variant={config.variant} className={cn('text-xs', className)}>
      {t(config.key)}
    </Badge>
  );
}
