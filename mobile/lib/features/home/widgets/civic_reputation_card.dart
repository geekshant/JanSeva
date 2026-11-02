import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../data/models/profile.dart';

/// Civic reputation card: points, level, badges earned, reports submitted.
///
/// All values come from real Supabase data via [HomeDashboardData];
/// [levelTitle] is read from the configurable `level_config` table.
/// Tapping the card navigates to the rewards screen.
class CivicReputationCard extends StatelessWidget {
  const CivicReputationCard({
    super.key,
    required this.profile,
    required this.levelTitle,
    required this.badgeCount,
    required this.reportsCount,
  });

  final Profile profile;
  final String levelTitle;
  final int badgeCount;
  final int reportsCount;

  static final _pointsFormat = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: Colors.transparent,
      borderRadius: AppRadius.rXL,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        borderRadius: AppRadius.rXL,
        onTap: () => context.push(AppRoutes.rewards),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: AppColors.brandGradient,
            borderRadius: AppRadius.rXL,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.workspace_premium_rounded,
                      color: Colors.white, size: 20),
                  AppSpacing.wSM,
                  Text(
                    context.tr('home.reputation.title'),
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  const Icon(Icons.chevron_right_rounded,
                      color: Colors.white70, size: 20),
                ],
              ),
              AppSpacing.hMD,
              Text(
                _pointsFormat.format(profile.points),
                style: theme.textTheme.displaySmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                context.tr('home.reputation.levelLabel', args: {
                  'level': profile.level,
                  'title': levelTitle,
                }),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withValues(alpha: 0.9),
                ),
              ),
              AppSpacing.hLG,
              const Divider(color: Colors.white24, height: 1),
              AppSpacing.hLG,
              Row(
                children: [
                  Expanded(
                    child: _Metric(
                      icon: Icons.military_tech_rounded,
                      value: '$badgeCount',
                      label: context.tr('home.reputation.badges'),
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 32,
                    color: Colors.white24,
                  ),
                  Expanded(
                    child: _Metric(
                      icon: Icons.receipt_long_rounded,
                      value: '$reportsCount',
                      label: context.tr('home.reputation.reports'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, color: Colors.white70, size: 18),
        AppSpacing.wSM,
        Column(
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            Text(
              label,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Colors.white70,
                  ),
            ),
          ],
        ),
      ],
    );
  }
}
