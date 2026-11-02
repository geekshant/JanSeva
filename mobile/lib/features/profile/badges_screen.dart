import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/widgets/empty_view.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../gamification/rewards_provider.dart';
import '../gamification/widgets/badge_grid.dart';

/// Full badge catalog: every badge from the `badges` table, highlighting the
/// ones this citizen has earned (`user_badges`).
class BadgesScreen extends ConsumerWidget {
  const BadgesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(rewardsDashboardProvider);

    return Scaffold(
      appBar: AppBar(title: Text(context.tr('badges.title'))),
      body: SafeArea(
        child: dashboardAsync.when(
          data: (data) => RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(rewardsDashboardProvider);
              await ref.read(rewardsDashboardProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                if (data.badges.isEmpty)
                  EmptyView(
                    icon: Icons.military_tech_rounded,
                    title: context.tr('badges.empty.title'),
                    message: context.tr('badges.empty.message'),
                  )
                else
                  BadgeGrid(
                    badges: data.badges,
                    isEarned: data.isBadgeEarned,
                    earnedCount: data.earnedBadgeCount,
                  ),
              ],
            ),
          ),
          loading: () => LoadingView(message: context.tr('badges.loading')),
          error: (error, _) => ErrorView(
            title: context.tr('badges.couldLoad'),
            message: error.toString(),
            onRetry: () => ref.invalidate(rewardsDashboardProvider),
          ),
        ),
      ),
    );
  }
}
