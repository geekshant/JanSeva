import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listBadges,
  createBadge,
  updateBadge,
  listRewardRules,
  createRewardRule,
  updateRewardRule,
  listLevels,
  createLevel,
  updateLevel,
  listRewards,
  getLeaderboard,
  getLeaderboardWards,
  type ListRewardsParams,
  type LeaderboardScope,
} from '@/services/gamification';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';
import type {
  BadgeInsert,
  BadgeUpdate,
  RewardRuleInsert,
  RewardRuleUpdate,
  LevelConfigInsert,
  LevelConfigUpdate,
} from '@/types';

const gameKey = ['gamification'] as const;

// --- Badges ----------------------------------------------------------------

export function useBadges() {
  return useQuery({
    queryKey: [...gameKey, 'badges'],
    queryFn: () => listBadges(),
  });
}

export function useCreateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BadgeInsert) => createBadge(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...gameKey, 'badges'] });
      toastSuccess('Badge created');
    },
    onError: (err) => toastError('Failed to create badge', errMessage(err)),
  });
}

export function useUpdateBadge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BadgeUpdate }) =>
      updateBadge(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...gameKey, 'badges'] });
      toastSuccess('Badge updated');
    },
    onError: (err) => toastError('Failed to update badge', errMessage(err)),
  });
}

// --- Rewards ---------------------------------------------------------------

export function useRewards(params: ListRewardsParams = {}) {
  return useQuery({
    queryKey: [...gameKey, 'rewards', params],
    queryFn: () => listRewards(params),
  });
}

// --- Reward Rules ----------------------------------------------------------

export function useRewardRules() {
  return useQuery({
    queryKey: [...gameKey, 'reward-rules'],
    queryFn: () => listRewardRules(),
  });
}

export function useCreateRewardRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RewardRuleInsert) => createRewardRule(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...gameKey, 'reward-rules'] });
      toastSuccess('Reward rule created');
    },
    onError: (err) => toastError('Failed to create reward rule', errMessage(err)),
  });
}

export function useUpdateRewardRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      activityType,
      patch,
    }: {
      activityType: string;
      patch: RewardRuleUpdate;
    }) => updateRewardRule(activityType, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [...gameKey, 'reward-rules'] });
      toastSuccess('Reward rule updated');
    },
    onError: (err) => toastError('Failed to update reward rule', errMessage(err)),
  });
}

// --- Level Config ----------------------------------------------------------

export function useLevels() {
  return useQuery({
    queryKey: [...gameKey, 'levels'],
    queryFn: () => listLevels(),
  });
}

export function useCreateLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LevelConfigInsert) => createLevel(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...gameKey, 'levels'] }),
  });
}

export function useUpdateLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ level, patch }: { level: number; patch: LevelConfigUpdate }) =>
      updateLevel(level, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...gameKey, 'levels'] }),
  });
}

// --- Leaderboard -----------------------------------------------------------

export function useLeaderboard(scope: LeaderboardScope = 'all_time', ward?: string | null) {
  return useQuery({
    queryKey: [...gameKey, 'leaderboard', scope, ward ?? null],
    queryFn: () => getLeaderboard(scope, ward, 50),
  });
}

export function useLeaderboardWards() {
  return useQuery({
    queryKey: [...gameKey, 'leaderboard-wards'],
    queryFn: () => getLeaderboardWards(),
    staleTime: 60_000,
  });
}
