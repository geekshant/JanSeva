import { useQuery } from '@tanstack/react-query';
import {
  getFullAnalytics,
  getAnalyticsSummary,
  getTrends,
  getByCategory,
  getByStatus,
  getBySeverity,
  getHotZones,
  getDepartmentAnalytics,
  getWardAnalytics,
  getCivicHealth,
  getAiAnalytics,
} from '@/services/analytics';

const analyticsKey = ['analytics'] as const;

export function useAiAnalytics() {
  return useQuery({
    queryKey: [...analyticsKey, 'ai'],
    queryFn: () => getAiAnalytics(),
  });
}

export function useFullAnalytics(days = 30) {
  return useQuery({
    queryKey: [...analyticsKey, 'full', days],
    queryFn: () => getFullAnalytics(days),
  });
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: [...analyticsKey, 'summary'],
    queryFn: () => getAnalyticsSummary(),
  });
}

export function useTrends(days = 30) {
  return useQuery({
    queryKey: [...analyticsKey, 'trends', days],
    queryFn: () => getTrends(days),
  });
}

export function useByCategory() {
  return useQuery({
    queryKey: [...analyticsKey, 'by-category'],
    queryFn: () => getByCategory(),
  });
}

export function useByStatus() {
  return useQuery({
    queryKey: [...analyticsKey, 'by-status'],
    queryFn: () => getByStatus(),
  });
}

export function useBySeverity() {
  return useQuery({
    queryKey: [...analyticsKey, 'by-severity'],
    queryFn: () => getBySeverity(),
  });
}

export function useHotZones() {
  return useQuery({
    queryKey: [...analyticsKey, 'hot-zones'],
    queryFn: () => getHotZones(),
  });
}

export function useDepartmentStats() {
  return useQuery({
    queryKey: [...analyticsKey, 'departments'],
    queryFn: () => getDepartmentAnalytics(),
  });
}

export function useWardStats() {
  return useQuery({
    queryKey: [...analyticsKey, 'wards'],
    queryFn: () => getWardAnalytics(),
  });
}

export function useCivicHealth() {
  return useQuery({
    queryKey: [...analyticsKey, 'civic-health'],
    queryFn: () => getCivicHealth(),
  });
}
