import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listProfiles,
  getProfile,
  updateProfile,
  getLeaderboard,
  countCitizens,
  suspendCitizen,
  restoreCitizen,
  getCitizenStats,
  getCitizenBadges,
  getCitizenRewards,
  getCitizenComplaints,
  type ListUsersParams,
} from '@/services/users';
import type { ProfileUpdate } from '@/types';

const usersKey = ['users'] as const;

export function useProfiles(params: ListUsersParams = {}) {
  return useQuery({
    queryKey: [...usersKey, 'list', params],
    queryFn: () => listProfiles(params),
  });
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: [...usersKey, 'detail', id],
    queryFn: () => getProfile(id),
    enabled: !!id,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProfileUpdate }) =>
      updateProfile(id, patch),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: usersKey });
      void qc.invalidateQueries({ queryKey: [...usersKey, 'detail', vars.id] });
    },
  });
}

export function useSuspendCitizen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reason,
      suspendedBy,
    }: {
      id: string;
      reason: string;
      suspendedBy: string | null;
    }) => suspendCitizen(id, reason, suspendedBy),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: usersKey });
      void qc.invalidateQueries({ queryKey: [...usersKey, 'detail', vars.id] });
      void qc.invalidateQueries({ queryKey: [...usersKey, 'stats', vars.id] });
    },
  });
}

export function useRestoreCitizen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      restoredBy,
    }: {
      id: string;
      restoredBy: string | null;
    }) => restoreCitizen(id, restoredBy),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: usersKey });
      void qc.invalidateQueries({ queryKey: [...usersKey, 'detail', vars.id] });
      void qc.invalidateQueries({ queryKey: [...usersKey, 'stats', vars.id] });
    },
  });
}

export function useCitizenStats(userId: string) {
  return useQuery({
    queryKey: [...usersKey, 'stats', userId],
    queryFn: () => getCitizenStats(userId),
    enabled: !!userId,
  });
}

export function useCitizenBadges(userId: string) {
  return useQuery({
    queryKey: [...usersKey, 'badges', userId],
    queryFn: () => getCitizenBadges(userId),
    enabled: !!userId,
  });
}

export function useCitizenRewards(userId: string, limit = 20) {
  return useQuery({
    queryKey: [...usersKey, 'rewards', userId, limit],
    queryFn: () => getCitizenRewards(userId, limit),
    enabled: !!userId,
  });
}

export function useCitizenComplaints(userId: string, limit = 10) {
  return useQuery({
    queryKey: [...usersKey, 'complaints', userId, limit],
    queryFn: () => getCitizenComplaints(userId, limit),
    enabled: !!userId,
  });
}

export function useLeaderboard(limit = 10) {
  return useQuery({
    queryKey: [...usersKey, 'leaderboard', limit],
    queryFn: () => getLeaderboard(limit),
  });
}

export function useCitizenCount() {
  return useQuery({
    queryKey: [...usersKey, 'count'],
    queryFn: () => countCitizens(),
  });
}
