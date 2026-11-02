import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import {
  isDemoMode,
  toggleDemoMode,
  seedDemoComplaints,
  advanceDemoComplaints,
} from '@/services/demo';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';

const demoKey = ['demo'] as const;

/** Check if demo mode is enabled. */
export function useDemoModeStatus() {
  return useQuery({
    queryKey: [...demoKey, 'status'],
    queryFn: () => isDemoMode(),
    refetchInterval: 10_000,
  });
}

/** Toggle demo mode on/off. */
export function useToggleDemoMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => toggleDemoMode(enabled),
    onSuccess: (enabled) => {
      void qc.invalidateQueries({ queryKey: [...demoKey] });
      toastSuccess(enabled ? 'Demo Mode activated' : 'Demo Mode deactivated');
    },
    onError: (err) => toastError('Failed to toggle Demo Mode', errMessage(err)),
  });
}

/** Seed dummy complaints (one-time). */
export function useSeedDemoComplaints() {
  return useMutation({
    mutationFn: () => seedDemoComplaints(),
    onSuccess: (count) => toastSuccess(`${count} demo complaints seeded across Bhopal`),
    onError: (err) => toastError('Failed to seed complaints', errMessage(err)),
  });
}

/**
 * Auto-advance loop — when demo mode is ON, this hook polls
 * `advance_demo_complaints()` every 10 seconds to drive the workflow forward.
 * It also tracks the total number of advances for the UI counter.
 *
 * The loop only runs while demo mode is enabled; it stops automatically when
 * demo mode is turned off (detected via the status query refetch).
 */
export function useDemoModeRunner() {
  const statusQuery = useDemoModeStatus();
  const qc = useQueryClient();
  const totalAdvancedRef = useRef(0);

  const advance = useCallback(async () => {
    const count = await advanceDemoComplaints();
    if (count > 0) {
      totalAdvancedRef.current += count;
      // Invalidate complaint queries so the dashboard/lists update in real-time.
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
      void qc.invalidateQueries({ queryKey: ['verification'] });
      void qc.invalidateQueries({ queryKey: ['aiVerification'] });
    }
    return count;
  }, [qc]);

  useEffect(() => {
    const isEnabled = statusQuery.data === true;
    if (!isEnabled) return;

    // Advance immediately on activation, then every 10 seconds.
    void advance();
    const interval = setInterval(() => void advance(), 10_000);
    return () => clearInterval(interval);
  }, [statusQuery.data, advance]);

  return {
    isEnabled: statusQuery.data ?? false,
    totalAdvanced: totalAdvancedRef.current,
  };
}
