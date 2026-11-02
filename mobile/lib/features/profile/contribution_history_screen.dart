import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../gamification/rewards_provider.dart';
import '../gamification/widgets/contribution_history_section.dart';

/// Chronological list of the citizen's point transactions (`rewards` table),
/// each with its activity title, signed points and related complaint.
class ContributionHistoryScreen extends ConsumerWidget {
  const ContributionHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboardAsync = ref.watch(rewardsDashboardProvider);

    return Scaffold(
      appBar: AppBar(title: Text(context.tr('contributionHistory.title'))),
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
                ContributionHistorySection(
                  rewards: data.recentRewards,
                  data: data,
                ),
              ],
            ),
          ),
          loading: () => LoadingView(
            message: context.tr('contributionHistory.loading'),
          ),
          error: (error, _) => ErrorView(
            title: context.tr('contributionHistory.couldLoad'),
            message: error.toString(),
            onRetry: () => ref.invalidate(rewardsDashboardProvider),
          ),
        ),
      ),
    );
  }
}
