import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/section_header.dart';
import '../home_dashboard_data.dart';

/// Community snapshot: four stat tiles showing community-wide civic activity.
///
/// Answers "how is my community doing?" with: total reported, resolved,
/// in-progress, and pending issues. Uses real aggregate counts from the
/// `community_complaint_stats` RPC.
class CommunitySnapshotSection extends StatelessWidget {
  const CommunitySnapshotSection({super.key, required this.snapshot});

  final CommunitySnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(title: context.tr('home.snapshot.title')),
        AppSpacing.hMD,
        Row(
          children: [
            Expanded(
              child: _SnapshotTile(
                icon: Icons.report_outlined,
                value: snapshot.nearbyIssues,
                label: context.tr('home.snapshot.reported'),
                color: const Color(0xFF0288D1),
                onTap: () => context.push(AppRoutes.map),
              ),
            ),
            AppSpacing.wSM,
            Expanded(
              child: _SnapshotTile(
                icon: Icons.task_alt_rounded,
                value: snapshot.resolvedIssues,
                label: context.tr('home.snapshot.resolved'),
                color: const Color(0xFF2E7D32),
              ),
            ),
          ],
        ),
        AppSpacing.hSM,
        Row(
          children: [
            Expanded(
              child: _SnapshotTile(
                icon: Icons.hourglass_top_rounded,
                value: snapshot.inProgressIssues,
                label: context.tr('home.snapshot.inProgress'),
                color: const Color(0xFFF57C00),
              ),
            ),
            AppSpacing.wSM,
            Expanded(
              child: _SnapshotTile(
                icon: Icons.pending_actions_outlined,
                value: snapshot.pendingIssues,
                label: context.tr('home.snapshot.pending'),
                color: const Color(0xFF616161),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SnapshotTile extends StatelessWidget {
  const _SnapshotTile({
    required this.icon,
    required this.value,
    required this.label,
    required this.color,
    this.onTap,
  });

  final IconData icon;
  final int value;
  final String label;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Material(
      color: colors.surfaceContainer,
      borderRadius: AppRadius.rLG,
      child: InkWell(
        borderRadius: AppRadius.rLG,
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              AppSpacing.wMD,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '$value',
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      label,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
