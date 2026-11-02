import { useTranslation } from '@/i18n/translate';
import { cn } from '@/lib/utils';
import type { SlaState } from '@/types';

/**
 * SLA Countdown — displays time remaining until the SLA deadline.
 *
 * IMPORTANT: This component does NOT use browser timers (setInterval) for
 * authoritative SLA state. The SLA deadline is a server-stored timestamp
 * (`sla_deadline` on the complaints table). This component simply renders
 * the remaining time from that timestamp at render time. It re-renders when
 * the parent query refetches (via TanStack Query's refetchInterval).
 *
 * The color reflects the SLA state:
 *   ON_TRACK  — green
 *   DUE_SOON  — amber
 *   AT_RISK   — orange
 *   BREACHED  — red
 *   ESCALATED — red (pulsing)
 *   RESOLVED  — gray
 */

function useFormatRemaining(t: (k: string, o?: Record<string, unknown>) => string) {
  return (deadline: string): string => {
    const now = Date.now();
    const due = new Date(deadline).getTime();
    const diff = due - now;

    if (diff <= 0) {
      // Past deadline — show how long ago
      const overdue = Math.abs(diff);
      const hours = Math.floor(overdue / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (days > 0) return t('sla.countdownDaysOverdue', { days, hours: hours % 24 });
      if (hours > 0) return t('sla.countdownHoursOverdue', { hours });
      const mins = Math.floor(overdue / (1000 * 60));
      return t('sla.countdownMinsOverdue', { mins });
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return t('sla.countdownDaysRemaining', { days, hours: hours % 24 });
    if (hours > 0) return t('sla.countdownHoursRemaining', { hours, mins });
    return t('sla.countdownMinsRemaining', { mins });
  };
}

const stateColors: Record<SlaState, string> = {
  ON_TRACK: 'text-green-600',
  DUE_SOON: 'text-amber-600',
  AT_RISK: 'text-orange-600',
  BREACHED: 'text-red-600',
  ESCALATED: 'text-red-600 animate-pulse',
  RESOLVED: 'text-muted-foreground',
};

export function SlaCountdown({
  deadline,
  state,
  className,
}: {
  deadline: string | null;
  state: SlaState;
  className?: string;
}) {
  const { t } = useTranslation();
  const formatRemaining = useFormatRemaining(t);

  if (state === 'RESOLVED' || !deadline) {
    return <span className={cn('text-sm text-muted-foreground', className)}>—</span>;
  }

  return (
    <span className={cn('font-mono text-sm font-medium', stateColors[state], className)}>
      {formatRemaining(deadline)}
    </span>
  );
}
