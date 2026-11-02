import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useSlaOverview } from '@/hooks/useSla';
import { useSlaRealtime } from '@/hooks/useRealtime';

// ---------------------------------------------------------------------------
// useSlaBreachAlerts — global SLA breach detection.
//
// Subscribes to complaints table changes via useSlaRealtime (which invalidates
// the SLA overview query). When the breach or escalation count increases
// (excluding the initial load), a toast notification is shown.
//
// This hook should be mounted once, globally — e.g. in AppShell.
// ---------------------------------------------------------------------------

export function useSlaBreachAlerts() {
  const overviewQuery = useSlaOverview();
  useSlaRealtime();

  const prevBreached = useRef<number | null>(null);
  const prevEscalated = useRef<number | null>(null);

  useEffect(() => {
    if (!overviewQuery.data) return;

    const { breached, escalated } = overviewQuery.data;

    // Skip the first render — don't toast for pre-existing breaches.
    if (prevBreached.current === null) {
      prevBreached.current = breached;
      prevEscalated.current = escalated;
      return;
    }

    if (breached > prevBreached.current) {
      const diff = breached - prevBreached.current;
      toast.error(`${diff} complaint${diff > 1 ? 's' : ''} breached SLA`, {
        description: 'Deadline passed — immediate action required.',
        action: {
          label: 'View',
          onClick: () => window.location.assign('/sla/breached'),
        },
      });
    }

    if (escalated > (prevEscalated.current ?? 0)) {
      const diff = escalated - (prevEscalated.current ?? 0);
      toast.error(`${diff} complaint${diff > 1 ? 's' : ''} escalated`, {
        description: 'High-priority SLA breach — needs immediate attention.',
        action: {
          label: 'View',
          onClick: () => window.location.assign('/sla/escalations'),
        },
      });
    }

    prevBreached.current = breached;
    prevEscalated.current = escalated;
  }, [overviewQuery.data]);
}
