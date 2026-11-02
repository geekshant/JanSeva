import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import 'rewards_provider.dart';
import 'widgets/badge_grid.dart';
import 'widgets/contribution_history_section.dart';
import 'widgets/reputation_summary_card.dart';
import 'widgets/reward_rules_section.dart';

/// Rewards tab: total points, current level with progress to the next level,
/// badges, configurable point rules, and contribution history.
///
/// All data is real Supabase data fetched by [rewardsDashboardProvider];
/// point values and level thresholds are owned by the database.
class RewardsScreen extends ConsumerWidget {
  const RewardsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(rewardsDashboardProvider);

    return Scaffold(
      appBar: AppBar(title: Text(context.tr('gamification.rewards'))),
      body: SafeArea(
        child: dashboardAsync.when(
          data: (data) => RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(rewardsDashboardProvider);
              await ref.read(rewardsDashboardProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
              children: [
                ReputationSummaryCard(
                  summary: data.summary,
                  earnedBadgeCount: data.earnedBadgeCount,
                  totalBadgeCount: data.badges.length,
                ),
                AppSpacing.hXXL,
                BadgeGrid(
                  badges: data.badges,
                  isEarned: data.isBadgeEarned,
                  earnedCount: data.earnedBadgeCount,
                ),
                AppSpacing.hXXL,
                RewardRulesSection(rules: data.rules),
                AppSpacing.hXXL,
                ContributionHistorySection(
                  rewards: data.recentRewards,
                  data: data,
                ),
              ],
            ),
          ),
          loading: () =>
              LoadingView(message: context.tr('gamification.loadingRewards')),
          error: (error, _) => ErrorView(
            title: context.tr('gamification.couldLoadRewards'),
            message: error.toString(),
            onRetry: () => ref.invalidate(rewardsDashboardProvider),
          ),
        ),
      ),
    );
  }
}
