import '../../data/models/badge.dart';
import '../../data/models/reputation_summary.dart';
import '../../data/models/reward.dart';
import '../../data/models/reward_rule.dart';
import '../../data/models/user_badge.dart';

/// Everything the Rewards screen needs, fetched in parallel from Supabase.
class RewardsDashboardData {
  const RewardsDashboardData({
    required this.summary,
    required this.rules,
    required this.badges,
    required this.earnedBadges,
    required this.recentRewards,
  });

  /// Server-computed points/level/progress (from `get_reputation_summary`).
  final ReputationSummary summary;

  /// Configurable point rules (`reward_rules`).
  final List<RewardRule> rules;

  /// Full badge catalog (`badges`).
  final List<Badge> badges;

  /// Badges earned by the citizen (`user_badges`).
  final List<UserBadge> earnedBadges;

  /// Recent point transactions (`rewards`), newest first.
  final List<Reward> recentRewards;

  int get earnedBadgeCount => earnedBadges.length;

  bool isBadgeEarned(String badgeId) =>
      earnedBadges.any((e) => e.badgeId == badgeId);

  /// Human-readable activity label for a reward: the configurable rule title
  /// when available, otherwise a readable form of the raw activity type.
  String activityTitleFor(Reward reward) {
    for (final rule in rules) {
      if (rule.activityType == reward.activityType) return rule.title;
    }
    final spaced = reward.activityType.toLowerCase().replaceAll('_', ' ');
    if (spaced.isEmpty) return reward.activityType;
    return spaced.replaceFirstMapped(
      RegExp('^.'),
      (m) => m.group(0)!.toUpperCase(),
    );
  }
}
