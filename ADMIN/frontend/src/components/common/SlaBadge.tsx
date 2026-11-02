import { Badge, type BadgeProps } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/translate';
import type { SlaState } from '@/types';
import { cn } from '@/lib/utils';

const slaConfig: Record<SlaState, { variant: BadgeProps['variant']; key: string }> = {
  ON_TRACK: { variant: 'success', key: 'slaState.onTrack' },
  DUE_SOON: { variant: 'warning', key: 'slaState.dueSoon' },
  AT_RISK: { variant: 'default', key: 'slaState.atRisk' },
  BREACHED: { variant: 'destructive', key: 'slaState.breached' },
  ESCALATED: { variant: 'destructive', key: 'slaState.escalated' },
  RESOLVED: { variant: 'secondary', key: 'slaState.resolved' },
};

export function SlaBadge({ state, className }: { state: SlaState; className?: string }) {
  const { t } = useTranslation();
  const config = slaConfig[state];
  return (
    <Badge
      variant={config.variant}
      className={cn(
        'text-xs',
        state === 'ESCALATED' && 'animate-pulse',
        className,
      )}
    >
      {t(config.key)}
    </Badge>
  );
}
