import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/i18n/app_localizations.dart';
import '../profile_dashboard_data.dart';

/// Statistics grid: Reports Submitted, Reports Verified, Issues Resolved,
/// Points Earned and Badges — all real user-scoped counts.
class ProfileStatsSection extends StatelessWidget {
  const ProfileStatsSection({super.key, required this.data});

  final ProfileDashboardData data;

  static final _pointsFormat = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final stats = <_Stat>[
      _Stat(
        icon: Icons.report_gmailerrorred_rounded,
        value: '${data.reportsSubmitted}',
        label: context.tr('profile.stats.reportsSubmitted'),
      ),
      _Stat(
        icon: Icons.verified_rounded,
        value: '${data.reportsVerified}',
        label: context.tr('profile.stats.reportsVerified'),
      ),
      _Stat(
        icon: Icons.check_circle_rounded,
        value: '${data.issuesResolved}',
        label: context.tr('profile.stats.issuesResolved'),
      ),
      _Stat(
        icon: Icons.stars_rounded,
        value: _pointsFormat.format(data.pointsEarned),
        label: context.tr('profile.stats.pointsEarned'),
      ),
      _Stat(
        icon: Icons.military_tech_rounded,
        value: '${data.badgeCount}',
        label: context.tr('profile.stats.badges'),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('profile.stats.title'),
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 3,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 0.82,
          children: [for (final stat in stats) _StatTile(stat: stat)],
        ),
      ],
    );
  }
}

class _Stat {
  const _Stat({required this.icon, required this.value, required this.label});

  final IconData icon;
  final String value;
  final String label;
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.stat});

  final _Stat stat;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(stat.icon, size: 22, color: colors.primary),
          const SizedBox(height: 8),
          Text(
            stat.value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            stat.label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.labelSmall?.copyWith(
              color: colors.onSurfaceVariant,
              height: 1.2,
            ),
          ),
        ],
      ),
    );
  }
}
