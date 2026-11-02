import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getActiveSafetyAlerts,
  getActiveSafetyAlertsCount,
  acknowledgeSos,
  assignSosResponder,
  startSosResponse,
  resolveSos,
  closeSos,
  getSafetyIncidentLocationShares,
  getSosAuditLogs,
} from '@/services/safety';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';

const safetyKey = ['safety'] as const;

/** Active safety alerts list (15s refetch + realtime). */
export function useActiveSafetyAlerts(limit = 50) {
  return useQuery({
    queryKey: [...safetyKey, 'alerts', limit],
    queryFn: () => getActiveSafetyAlerts(limit),
    refetchInterval: 15_000,
  });
}

/** Live count of active safety alerts — for the sidebar badge. */
export function useActiveSafetyAlertsCount() {
  return useQuery({
    queryKey: [...safetyKey, 'count'],
    queryFn: () => getActiveSafetyAlertsCount(),
    refetchInterval: 15_000,
  });
}

/** Acknowledge an SOS incident. */
export function useAcknowledgeSos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: string) => acknowledgeSos(incidentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...safetyKey] });
      toastSuccess('SOS acknowledged — citizen notified that help is on the way');
    },
    onError: (err) => toastError('Failed to acknowledge SOS', errMessage(err)),
  });
}

/** Assign a responder to an SOS incident. */
export function useAssignSosResponder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, officerId }: { incidentId: string; officerId: string }) =>
      assignSosResponder(incidentId, officerId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...safetyKey] });
      toastSuccess('Responder assigned — citizen notified');
    },
    onError: (err) => toastError('Failed to assign responder', errMessage(err)),
  });
}

/** Start response for an SOS incident. */
export function useStartSosResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: string) => startSosResponse(incidentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...safetyKey] });
      toastSuccess('Response started — citizen notified');
    },
    onError: (err) => toastError('Failed to start response', errMessage(err)),
  });
}

/** Resolve an SOS incident (auto-closes). */
export function useResolveSos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, note }: { incidentId: string; note?: string | null }) =>
      resolveSos(incidentId, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...safetyKey] });
      toastSuccess('SOS resolved and closed — tracking stopped');
    },
    onError: (err) => toastError('Failed to resolve SOS', errMessage(err)),
  });
}

/** Close an SOS incident (for TRACKING_EXPIRED cases). */
export function useCloseSos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: string) => closeSos(incidentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...safetyKey] });
      toastSuccess('SOS case closed');
    },
    onError: (err) => toastError('Failed to close SOS', errMessage(err)),
  });
}

/** Location trail for an SOS incident. */
export function useSosLocationShares(incidentId: string | null, enabled = true) {
  return useQuery({
    queryKey: [...safetyKey, 'location-shares', incidentId],
    queryFn: () => getSafetyIncidentLocationShares(incidentId!),
    enabled: !!incidentId && enabled,
    refetchInterval: 10_000,
  });
}

/** Audit logs for an SOS incident. */
export function useSosAuditLogs(incidentId: string | null) {
  return useQuery({
    queryKey: [...safetyKey, 'audit-logs', incidentId],
    queryFn: () => getSosAuditLogs(incidentId!),
    enabled: !!incidentId,
  });
}

/**
 * Realtime subscription + polling fallback for safety alerts. Plays a buzzer
 * sound when a new active SOS alert is inserted, and invalidates the query
 * cache so the dashboard updates instantly.
 *
 * PRIMARY: Supabase Realtime postgres_changes on safety_alerts INSERT.
 * FALLBACK: Polls get_active_safety_alerts every 3s. If realtime misses an
 * event (e.g. table not in realtime publication, network hiccup), polling
 * still detects the new SOS and triggers the buzzer.
 *
 * Uses a ref for the onNewAlert callback so the channel is NOT torn down and
 * re-subscribed on every render. This prevents "cannot add postgres_changes
 * callbacks after subscribe()" errors and missed events.
 *
 * Deduplication: a shared Set of seen alert IDs prevents duplicate buzzers
 * from realtime + polling + initial fetch. An initial-load grace period
 * suppresses the buzzer for alerts that exist at mount time.
 */
export function useSafetyRealtime(onNewAlert?: () => void) {
  const qc = useQueryClient();
  const onNewAlertRef = useRef(onNewAlert);
  onNewAlertRef.current = onNewAlert;

  // Shared dedup set — used by BOTH realtime and polling so an SOS detected
  // by realtime is not re-triggered by polling (or vice versa).
  const seenAlertIds = useRef<Set<string>>(new Set());
  // Tracks the newest created_at we've seen, so polling only flags SOS
  // records created AFTER the last check.
  const lastSeenCreatedAt = useRef<string | null>(null);
  // Grace period: suppress buzzer for alerts that exist at mount time.
  const initialized = useRef(false);

  // Centralized handler — called by realtime OR polling when a genuinely new
  // active SOS is detected. Deduplicates and fires the buzzer callback.
  const handleNewSOS = useCallback((alertId: string, status: string, createdAt?: string) => {
    if (seenAlertIds.current.has(alertId)) return;
    seenAlertIds.current.add(alertId);
    if (seenAlertIds.current.size > 100) {
      const first = seenAlertIds.current.values().next().value;
      if (first) seenAlertIds.current.delete(first);
    }
    if (createdAt && (!lastSeenCreatedAt.current || createdAt > lastSeenCreatedAt.current)) {
      lastSeenCreatedAt.current = createdAt;
    }
    if (status === 'active') {
      console.log('[SOS] NEW SOS DETECTED — id:', alertId, 'status:', status);
      onNewAlertRef.current?.();
    }
  }, []);

  useEffect(() => {
    console.log('[SOS] Initializing SOS listener (realtime + polling fallback)');
    const initTimer = setTimeout(() => {
      initialized.current = true;
      console.log('[SOS] Initial grace period ended — now detecting new SOS');
    }, 3000);

    // --- PRIMARY: Realtime subscription ---
    const channel = supabase
      .channel('safety-alerts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'safety_alerts' },
        (payload) => {
          void qc.invalidateQueries({ queryKey: [...safetyKey] });
          const newAlert = payload.new as { id?: string; status?: string; created_at?: string };
          console.log('[SOS] REALTIME EVENT RECEIVED — event=INSERT id:', newAlert?.id, 'status:', newAlert?.status);
          if (!initialized.current) {
            if (newAlert?.id) seenAlertIds.current.add(newAlert.id);
            return;
          }
          if (newAlert?.id) {
            handleNewSOS(newAlert.id, newAlert.status ?? '', newAlert.created_at);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'safety_alerts' },
        () => {
          void qc.invalidateQueries({ queryKey: [...safetyKey] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'safety_incidents' },
        () => {
          void qc.invalidateQueries({ queryKey: [...safetyKey] });
        },
      )
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') {
          console.log('[SOS] REALTIME SUBSCRIBED');
        } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
          console.warn('[SOS] REALTIME channel state:', state, '— polling fallback remains active');
        }
      });

    // --- FALLBACK: Polling every 3 seconds ---
    // If realtime misses an event (table not published, network issue, etc.),
    // polling catches it. Uses get_active_safety_alerts RPC which is
    // SECURITY DEFINER and works with the admin's authenticated session.
    const pollInterval = setInterval(async () => {
      if (!initialized.current) return;
      try {
        const alerts = await getActiveSafetyAlerts(50);
        for (const alert of alerts) {
          const alertId = alert.id;
          const status = alert.status;
          const createdAt = alert.created_at;
          if (!alertId || seenAlertIds.current.has(alertId)) continue;
          // Only trigger for alerts newer than what we've seen
          if (createdAt && lastSeenCreatedAt.current && createdAt <= lastSeenCreatedAt.current) {
            seenAlertIds.current.add(alertId);
            continue;
          }
          console.log('[SOS] POLLING FALLBACK DETECTED SOS — id:', alertId, 'status:', status);
          handleNewSOS(alertId, status ?? '', createdAt);
        }
        // Update the query cache with fresh data
        void qc.invalidateQueries({ queryKey: [...safetyKey, 'alerts'] });
        void qc.invalidateQueries({ queryKey: [...safetyKey, 'count'] });
      } catch (err) {
        // Silently continue — polling errors are non-fatal
      }
    }, 3000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(pollInterval);
      void supabase.removeChannel(channel);
    };
    // Intentionally minimal deps — onNewAlert is via ref, handleNewSOS is stable.
  }, [qc, handleNewSOS]);
}

// Legacy aliases
export { useAcknowledgeSos as useAcknowledgeSafetyAlert };
export { useResolveSos as useResolveSafetyIncident };
