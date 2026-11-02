import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/app_logger.dart';
import '../../core/errors/result.dart';
import '../../data/models/badge.dart';
import '../../data/models/reward.dart';
import '../../data/models/reward_rule.dart';
import '../../data/models/user_badge.dart';
import '../../data/repositories/repository_providers.dart';
import 'rewards_dashboard_data.dart';

/// Fetches everything the Rewards screen needs, in parallel, from Supabase.
///
/// Exposed as a [FutureProvider] so the screen gets loading/data/error states
/// for free, and pull-to-refresh is just `ref.invalidate(rewardsDashboardProvider)`.
///
/// Point values, level thresholds and progress come from the database
/// (`reward_rules`, `level_config`, `get_reputation_summary()`) — nothing is
/// calculated or hard-coded in the app.
final rewardsDashboardProvider =
    FutureProvider<RewardsDashboardData>((ref) async {
  final rewardsRepo = ref.watch(rewardsRepositoryProvider);

  // Kick off all fetches in parallel (each Future starts immediately).
  final summaryFuture = rewardsRepo.fetchSummary();
  final rulesFuture = rewardsRepo.fetchRewardRules();
  final badgesFuture = rewardsRepo.fetchBadges();
  final earnedFuture = rewardsRepo.fetchEarnedBadges();
  final recentFuture = rewardsRepo.fetchRecentRewards(limit: 20);

  final summaryResult = await summaryFuture;
  final rulesResult = await rulesFuture;
  final badgesResult = await badgesFuture;
  final earnedResult = await earnedFuture;
  final recentResult = await recentFuture;

  _logPartial('summary', summaryResult);
  _logPartial('rules', rulesResult);
  _logPartial('badges', badgesResult);
  _logPartial('earnedBadges', earnedResult);
  _logPartial('recentRewards', recentResult);

  // The summary is core to the screen — fail loudly so the UI can retry.
  final summary = summaryResult.dataOrNull;
  if (summary == null) {
    throw Exception(
      summaryResult.failureOrNull?.message ?? 'Could not load your rewards.',
    );
  }

  return RewardsDashboardData(
    summary: summary,
    rules: rulesResult.dataOrNull ?? const <RewardRule>[],
    badges: badgesResult.dataOrNull ?? const <Badge>[],
    earnedBadges: earnedResult.dataOrNull ?? const <UserBadge>[],
    recentRewards: recentResult.dataOrNull ?? const <Reward>[],
  );
});

/// Points the database awarded for a just-submitted complaint
/// (`VALID_ISSUE_REPORT` row), or null when no award row exists yet.
final reportRewardProvider =
    FutureProvider.family<Reward?, String>((ref, complaintId) async {
  final result = await ref
      .watch(rewardsRepositoryProvider)
      .fetchReportReward(complaintId);
  return result.when(
    success: (reward) => reward,
    failure: (failure) => throw Exception(failure.message),
  );
});

void _logPartial<T>(String label, Result<T> result) {
  final failure = result.failureOrNull;
  if (failure != null) {
    AppLogger.warning('rewardsDashboard: partial failure [$label]: '
        '${failure.message}');
  }
}
