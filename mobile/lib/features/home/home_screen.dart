import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../realtime/complaint_changes_provider.dart';
import 'home_dashboard_data.dart';
import 'home_dashboard_provider.dart';
import 'widgets/civic_reputation_card.dart';
import 'widgets/community_snapshot.dart';
import 'widgets/evidence_required_alert.dart';
import 'widgets/home_header.dart';
import 'widgets/nearby_preview_section.dart';
import 'widgets/quick_actions.dart';
import 'widgets/recent_complaints_section.dart';
import 'widgets/verify_resolutions_card.dart';

/// Home dashboard: greeting, civic reputation, quick actions, nearby
/// issues preview, active complaints, and community snapshot — all driven
/// by real Supabase data with loading / error / empty states and
/// pull-to-refresh.
///
/// The screen answers "What can I do right now?" by leading with the
/// prominent Report action, then showing personal contribution, nearby
/// activity, active complaints, and community-wide stats.
///
/// Subscribes to [realtimeRefresherProvider] so the dashboard auto-refreshes
/// when a complaint's status changes in the database.
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(realtimeRefresherProvider);

    final asyncData = ref.watch(homeDashboardProvider);

    return Scaffold(
      body: SafeArea(
        child: asyncData.when(
          data: (data) => _DashboardContent(data: data),
          loading: () =>
              LoadingView(message: context.tr('home.loadingDashboard')),
          error: (error, _) => ErrorView(
            message: error.toString(),
            onRetry: () => ref.invalidate(homeDashboardProvider),
          ),
        ),
      ),
    );
  }
}

class _DashboardContent extends ConsumerWidget {
  const _DashboardContent({required this.data});

  final HomeDashboardData data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(homeDashboardProvider);
        ref.invalidate(homeNearbyPreviewProvider);
        await ref.read(homeDashboardProvider.future);
      },
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 88),
        children: [
          // 1. Header (greeting + location + notifications)
          HomeHeader(profile: data.profile),
          AppSpacing.hXL,

          // 1b. Action Required — complaints needing more evidence
          if (data.evidenceRequiredCount > 0) ...[
            EvidenceRequiredAlert(count: data.evidenceRequiredCount),
            AppSpacing.hXXL,
          ],

          // 2. Quick actions (prominent Report + secondary)
          const QuickActions(),
          AppSpacing.hXXL,

          // 3. Personal contribution (civic reputation)
          CivicReputationCard(
            profile: data.profile,
            levelTitle: data.levelTitle,
            badgeCount: data.badgeCount,
            reportsCount: data.reportsCount,
          ),
          AppSpacing.hXXL,

          // 4. Nearby civic issues (small preview, hides if unavailable)
          const NearbyPreviewSection(),
          AppSpacing.hXXL,

          // 5. My active complaints
          RecentComplaintsSection(complaints: data.recentComplaints),
          AppSpacing.hXXL,

          // 6. Community verification CTA
          const VerifyResolutionsCard(),
          AppSpacing.hXXL,

          // 7. Community snapshot (aggregate stats)
          CommunitySnapshotSection(snapshot: data.snapshot),
        ],
      ),
    );
  }
}
