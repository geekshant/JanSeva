import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../data/models/reputation_summary.dart';

/// Hero card for the Rewards tab: total points, current level, and progress
/// to the next level.
///
/// Every value comes from the server-side `get_reputation_summary()` RPC —
/// thresholds and progress math live in the database, not in Flutter.
class ReputationSummaryCard extends StatelessWidget {
  const ReputationSummaryCard({
    super.key,
    required this.summary,
    required this.earnedBadgeCount,
    required this.totalBadgeCount,
  });

  final ReputationSummary summary;
  final int earnedBadgeCount;
  final int totalBadgeCount;

  static final _pointsFormat = NumberFormat.decimalPattern();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final progress =
        summary.progressPercent.clamp(0, 100) / 100.0;

    return Container(
      key: const Key('rewardsSummaryCard'),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [colors.primary, colors.primary.withValues(alpha: 0.85)],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.workspace_premium_rounded,
                  color: Colors.white, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  context.tr('gamification.civicReputation'),
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const Icon(Icons.military_tech_rounded,
                  color: Colors.white70, size: 18),
              const SizedBox(width: 6),
              Text(
                '$earnedBadgeCount/$totalBadgeCount',
                style: theme.textTheme.titleSmall?.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            context.tr('gamification.points',
                args: {'count': _pointsFormat.format(summary.points)}),
            key: const Key('totalPoints'),
            style: theme.textTheme.headlineMedium?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            summary.levelLabel,
            key: const Key('currentLevel'),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
          const SizedBox(height: 20),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              key: const Key('levelProgress'),
              value: progress,
              minHeight: 8,
              backgroundColor: Colors.white24,
              valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            summary.isMaxLevel
                ? context.tr('gamification.maxLevel')
                : context.tr('gamification.pointsToNext', args: {
                    'count': _pointsFormat.format(summary.pointsToNext),
                    'level': summary.nextLevel,
                    'title': summary.nextLevelTitle,
                  }),
            key: const Key('progressCaption'),
            style: theme.textTheme.bodySmall?.copyWith(
              color: Colors.white.withValues(alpha: 0.9),
            ),
          ),
        ],
      ),
    );
  }
}
