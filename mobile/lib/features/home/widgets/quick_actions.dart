import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../features/safety/safety_eligibility_provider.dart';

/// Quick actions: a prominent "Report a Civic Issue" button followed by
/// compact secondary tiles (My Complaints, Nearby, Rewards).
///
/// This answers "What can I do right now?" — the Report action is the
/// largest, most visible element, with secondary actions for exploration.
class QuickActions extends ConsumerWidget {
  const QuickActions({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    // Only show the Women Safety tile if the current user is eligible
    // (profile gender is female). Non-female users do not see the entry
    // point — the safety routes also enforce this server-side.
    final safetyEligible = ref.watch(womenSafetyEligibilityProvider).value ?? false;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // --- Primary: Report a Civic Issue ---
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: () => context.push(AppRoutes.reportIssue),
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
              alignment: Alignment.centerLeft,
            ),
            icon: const Icon(Icons.add_location_alt_rounded, size: 26),
            label: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.tr('home.quick.reportTitle'),
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        context.tr('home.quick.reportSubtitle'),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.onPrimary.withValues(alpha: 0.85),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_rounded, size: 22),
              ],
            ),
          ),
        ),
        AppSpacing.hMD,
        // --- Secondary tiles ---
        Row(
          children: [
            Expanded(
              child: _SecondaryTile(
                icon: Icons.receipt_long_outlined,
                label: context.tr('home.quick.myComplaints'),
                onTap: () => context.go(AppRoutes.complaints),
              ),
            ),
            AppSpacing.wMD,
            Expanded(
              child: _SecondaryTile(
                icon: Icons.map_outlined,
                label: context.tr('home.quick.nearby'),
                onTap: () => context.push(AppRoutes.map),
              ),
            ),
            AppSpacing.wMD,
            Expanded(
              child: _SecondaryTile(
                icon: Icons.emoji_events_outlined,
                label: context.tr('home.quick.rewards'),
                onTap: () => context.push(AppRoutes.rewards),
              ),
            ),
          ],
        ),
        AppSpacing.hMD,
        // --- Women Safety emergency tile (only for eligible female users) ---
        if (safetyEligible)
          SizedBox(
            width: double.infinity,
            child: _SafetyTile(onTap: () => context.push(AppRoutes.safety)),
          ),
      ],
    );
  }
}

/// Prominent Women Safety / SOS entry tile — visually distinct (red) so the
/// emergency feature is easy to find on the home dashboard.
class _SafetyTile extends StatelessWidget {
  const _SafetyTile({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: theme.colorScheme.errorContainer,
      borderRadius: AppRadius.rLG,
      child: InkWell(
        borderRadius: AppRadius.rLG,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
          child: Row(
            children: [
              Icon(
                Icons.shield_rounded,
                color: theme.colorScheme.onErrorContainer,
                size: 26,
              ),
              AppSpacing.wMD,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('safety.title'),
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: theme.colorScheme.onErrorContainer,
                      ),
                    ),
                    Text(
                      context.tr('safety.menuDesc'),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onErrorContainer.withValues(alpha: 0.85),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_rounded,
                color: theme.colorScheme.onErrorContainer,
                size: 22,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SecondaryTile extends StatelessWidget {
  const _SecondaryTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

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
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
          child: Column(
            children: [
              Icon(icon, color: colors.primary, size: 24),
              AppSpacing.hSM,
              Text(
                label,
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
