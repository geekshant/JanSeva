import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/empty_view.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../../data/models/leaderboard_entry.dart';
import 'leaderboard_provider.dart';

/// Community leaderboard tab: ranks top civic contributors by points.
class LeaderboardScreen extends ConsumerWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncEntries = ref.watch(leaderboardProvider);

    return Scaffold(
      appBar: AppBar(title: Text(context.tr('gamification.leaderboard'))),
      body: SafeArea(
        child: asyncEntries.when(
          data: (entries) {
            if (entries.isEmpty) {
              return EmptyView(
                icon: Icons.leaderboard_outlined,
                title: context.tr('gamification.noContributors'),
                message: context.tr('gamification.beFirst'),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(leaderboardProvider),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
                children: [
                  _PodiumSection(entries: entries.take(3).toList()),
                  AppSpacing.hXXL,
                  Text(
                    context.tr('gamification.allContributors'),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                  ),
                  AppSpacing.hMD,
                  ...entries.map((e) => _LeaderboardTile(entry: e)),
                ],
              ),
            );
          },
          loading: () =>
              LoadingView(message: context.tr('gamification.loadingLeaderboard')),
          error: (error, _) => ErrorView(
            message: error.toString(),
            onRetry: () => ref.invalidate(leaderboardProvider),
          ),
        ),
      ),
    );
  }
}

/// Top-3 podium cards with medal styling.
class _PodiumSection extends StatelessWidget {
  const _PodiumSection({required this.entries});

  final List<LeaderboardEntry> entries;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        if (entries.length >= 2)
          Expanded(child: _PodiumCard(entry: entries[1], medalColor: const Color(0xFF757575), height: 100)),
        if (entries.length >= 2) AppSpacing.wSM,
        if (entries.isNotEmpty)
          Expanded(child: _PodiumCard(entry: entries[0], medalColor: const Color(0xFFFFB300), height: 120)),
        if (entries.length >= 3) AppSpacing.wSM,
        if (entries.length >= 3)
          Expanded(child: _PodiumCard(entry: entries[2], medalColor: const Color(0xFFB07850), height: 90)),
      ],
    );
  }
}

class _PodiumCard extends StatelessWidget {
  const _PodiumCard({
    required this.entry,
    required this.medalColor,
    required this.height,
  });

  final LeaderboardEntry entry;
  final Color medalColor;
  final double height;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final fmt = NumberFormat.decimalPattern();

    return Container(
      height: height,
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        gradient: entry.isMe ? AppColors.brandGradient : null,
        color: entry.isMe ? null : colors.surfaceContainer,
        borderRadius: AppRadius.rLG,
        border: entry.isMe ? null : Border.all(color: medalColor.withValues(alpha: 0.3), width: 1.5),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(entry.rank == 1 ? Icons.emoji_events_rounded : Icons.military_tech_rounded,
              color: entry.isMe ? Colors.white : medalColor, size: 28),
          AppSpacing.hXS,
          Text(
            '#${entry.rank}',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              color: entry.isMe ? Colors.white : medalColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            entry.name,
            style: theme.textTheme.labelSmall?.copyWith(
              color: entry.isMe ? Colors.white.withValues(alpha: 0.9) : colors.onSurfaceVariant,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            context.tr('gamification.pts', args: {'count': fmt.format(entry.points)}),
            style: theme.textTheme.labelSmall?.copyWith(
              color: entry.isMe ? Colors.white.withValues(alpha: 0.8) : colors.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}

class _LeaderboardTile extends StatelessWidget {
  const _LeaderboardTile({required this.entry});

  final LeaderboardEntry entry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final fmt = NumberFormat.decimalPattern();

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: entry.isMe ? colors.primaryContainer.withValues(alpha: 0.4) : colors.surfaceContainer,
        borderRadius: AppRadius.rMD,
        border: entry.isMe ? Border.all(color: colors.primary.withValues(alpha: 0.3), width: 1.5) : null,
      ),
      child: Row(
        children: [
          SizedBox(
            width: 32,
            child: Text(
              '#${entry.rank}',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color: entry.isMe ? colors.primary : colors.onSurfaceVariant,
              ),
            ),
          ),
          AppSpacing.wMD,
          Expanded(
            child: Text(
              entry.name,
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: entry.isMe ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: colors.surfaceContainerHighest,
              borderRadius: AppRadius.rPill,
            ),
            child: Text(
              context.tr('gamification.pts', args: {'count': fmt.format(entry.points)}),
              style: theme.textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: colors.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
