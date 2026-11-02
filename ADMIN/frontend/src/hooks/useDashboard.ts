import { useQuery } from '@tanstack/react-query';
import {
  getDashboardKpis,
  getRecentComplaints,
  getRecentActivity,
  getDashboardComplaints,
} from '@/services/dashboard';
import type { DashboardFilters } from '@/types/map';
import { DEFAULT_DASHBOARD_FILTERS, defaultDateRange } from '@/types/map';

const dashboardKey = ['dashboard'] as const;

export function useDashboardKpis() {
  return useQuery({
    queryKey: [...dashboardKey, 'kpis'],
    queryFn: () => getDashboardKpis(),
    refetchInterval: 60_000, // refresh every minute
  });
}

export function useRecentComplaints(limit = 8) {
  return useQuery({
    queryKey: [...dashboardKey, 'recent-complaints', limit],
    queryFn: () => getRecentComplaints(limit),
  });
}

export function useRecentActivity(limit = 15) {
  // Realtime invalidation is handled by useActivityFeedRealtime() and
  // useNewComplaintsRealtime() called from DashboardPage.
  return useQuery({
    queryKey: [...dashboardKey, 'activity', limit],
    queryFn: () => getRecentActivity(limit),
  });
}

/** Fetches ALL complaints with filters for the dashboard map + KPIs + list. */
export function useDashboardComplaints(filters: DashboardFilters) {
  // Initialize date range from the default preset
  const effectiveFilters: DashboardFilters = {
    ...DEFAULT_DASHBOARD_FILTERS,
    ...filters,
    dateFrom: filters.dateFrom || defaultDateRange().dateFrom,
    dateTo: filters.dateTo || defaultDateRange().dateTo,
  };

  return useQuery({
    queryKey: [...dashboardKey, 'complaints', effectiveFilters],
    queryFn: () => getDashboardComplaints({ filters: effectiveFilters }),
    staleTime: 15_000,
  });
}
