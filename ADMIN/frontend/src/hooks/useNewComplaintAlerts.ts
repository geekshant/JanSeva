import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useRealtimeSubscription } from './useRealtimeSubscription';

// ---------------------------------------------------------------------------
// useNewComplaintAlerts — shows a toast when a new complaint is created
// from the mobile app (or any source). Mounted globally in AppShell.
// ---------------------------------------------------------------------------

interface ComplaintEventPayload {
  new?: {
    id?: string;
    complaint_number?: string;
    title?: string;
    severity?: string;
    status?: string;
  };
}

export function useNewComplaintAlerts(onNewComplaint?: () => void) {
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useRealtimeSubscription({
    channelName: 'alert-new-complaints',
    event: 'INSERT',
    table: 'complaints',
    onEvent: (payload) => {
      const row = (payload as ComplaintEventPayload).new;
      if (!row?.id) return;

      if (!initialized.current) {
        seenIds.current.add(row.id);
        return;
      }

      if (seenIds.current.has(row.id)) return;
      seenIds.current.add(row.id);

      if (seenIds.current.size > 100) {
        const first = seenIds.current.values().next().value;
        if (first) seenIds.current.delete(first);
      }

      // Play small complaint chime
      onNewComplaint?.();

      toast.success('New complaint reported', {
        description: `${row.complaint_number ?? 'Unknown'}: ${row.title ?? 'Untitled'}`,
        action: {
          label: 'View',
          onClick: () => window.location.assign(`/complaints/${row.id}`),
        },
      });
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      initialized.current = true;
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
}
