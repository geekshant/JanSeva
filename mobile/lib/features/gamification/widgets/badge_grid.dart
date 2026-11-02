import 'package:flutter/material.dart' hide Badge;

import '../../../core/i18n/app_localizations.dart';
import '../../../data/models/badge.dart';
import '../../../core/widgets/category_icon.dart';

/// Badge catalog grid: shows every badge, highlighting the ones earned.
///
/// Earned/locked state comes from the `user_badges` table (backend criteria);
/// this widget only renders it.
class BadgeGrid extends StatelessWidget {
  const BadgeGrid({
    super.key,
    required this.badges,
    required this.isEarned,
    required this.earnedCount,
  });

  final List<Badge> badges;
  final bool Function(String badgeId) isEarned;
  final int earnedCount;

  static const double _tileWidth = 160;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              context.tr('gamification.badges'),
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            Text(
              context.tr('gamification.badgesEarned', args: {
                'earned': earnedCount,
                'total': badges.length,
              }),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (badges.isEmpty)
          Text(
            context.tr('gamification.noBadgesDefined'),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          )
        else
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: [
              for (final badge in badges)
                _BadgeTile(
                  badge: badge,
                  earned: isEarned(badge.id),
                ),
            ],
          ),
      ],
    );
  }
}

class _BadgeTile extends StatelessWidget {
  const _BadgeTile({required this.badge, required this.earned});

  final Badge badge;
  final bool earned;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final icon = _iconFor(badge.icon);

    return Container(
      key: Key('badge-${badge.name}'),
      width: BadgeGrid._tileWidth,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: earned ? colors.primaryContainer : colors.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: earned
              ? colors.primary.withValues(alpha: 0.4)
              : colors.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: earned
                      ? colors.primary.withValues(alpha: 0.15)
                      : colors.surfaceContainerHighest,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  icon,
                  size: 20,
                  color: earned
                      ? colors.primary
                      : colors.onSurfaceVariant.withValues(alpha: 0.5),
                ),
              ),
              const Spacer(),
              Icon(
                earned ? Icons.check_circle_rounded : Icons.lock_rounded,
                size: 18,
                color: earned
                    ? colors.primary
                    : colors.onSurfaceVariant.withValues(alpha: 0.5),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            badge.name,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: earned ? colors.onPrimaryContainer : colors.onSurface,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            badge.description ?? '',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: earned
                  ? colors.onPrimaryContainer.withValues(alpha: 0.8)
                  : colors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            earned
                ? context.tr('gamification.badgeEarned')
                : context.tr('gamification.badgeLocked'),
            style: theme.textTheme.labelSmall?.copyWith(
              color: earned
                  ? colors.primary
                  : colors.onSurfaceVariant.withValues(alpha: 0.7),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  static IconData _iconFor(String? name) {
    switch (name) {
      case 'flag':
        return Icons.flag_rounded;
      case 'visibility':
        return Icons.visibility_rounded;
      case 'groups':
        return Icons.groups_rounded;
      case 'lightbulb':
        return Icons.lightbulb_rounded;
      case 'emoji_events':
        return Icons.emoji_events_rounded;
      case 'verified':
        return Icons.verified_rounded;
      default:
        return CategoryIconHelper.iconFor(name);
    }
  }
}
