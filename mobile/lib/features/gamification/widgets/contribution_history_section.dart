import 'package:flutter/material.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/reward.dart';
import '../../../core/widgets/empty_view.dart';
import '../rewards_dashboard_data.dart';

/// Contribution history: each point transaction with its activity, points,
/// date and related complaint (all from the `rewards` table).
class ContributionHistorySection extends StatelessWidget {
  const ContributionHistorySection({
    super.key,
    required this.rewards,
    required this.data,
  });

  final List<Reward> rewards;

  /// Provides activity titles from the configurable `reward_rules`.
  final RewardsDashboardData data;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('gamification.contributionHistory'),
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        if (rewards.isEmpty)
          EmptyView(
            icon: Icons.history_rounded,
            title: context.tr('gamification.noContributions'),
            message: context.tr('gamification.noContributionsMsg'),
          )
        else
          Column(
            children: [
              for (final reward in rewards)
                _RewardTile(
                  reward: reward,
                  activityTitle: data.activityTitleFor(reward),
                ),
            ],
          ),
      ],
    );
  }
}

class _RewardTile extends StatelessWidget {
  const _RewardTile({required this.reward, required this.activityTitle});

  final Reward reward;
  final String activityTitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final positive = !reward.isPenalty;
    final pointsColor = positive ? AppColors.success : AppColors.danger;

    final related = reward.complaintNumber;

    return Container(
      key: Key('reward-${reward.id}'),
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: pointsColor.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(_iconFor(reward.activityType),
                size: 20, color: pointsColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activityTitle,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  related != null && related.isNotEmpty
                      ? context.tr('gamification.complaintEntry',
                          args: {'ref': related})
                      : (reward.description ?? ''),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  reward.formattedDate,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            reward.signedPoints,
            style: theme.textTheme.titleMedium?.copyWith(
              color: pointsColor,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  static IconData _iconFor(String activityType) {
    switch (activityType) {
      case 'VALID_ISSUE_REPORT':
        return Icons.flag_rounded;
      case 'VERIFIED_REPORT':
        return Icons.verified_rounded;
      case 'VOLUNTEER_ACTIVITY':
        return Icons.volunteer_activism_rounded;
      case 'ISSUE_RESOLVED':
        return Icons.check_circle_rounded;
      case 'DUPLICATE_OR_FAKE_REPORT':
        return Icons.report_rounded;
      default:
        return Icons.stars_rounded;
    }
  }
}
