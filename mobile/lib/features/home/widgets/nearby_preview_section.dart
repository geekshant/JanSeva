import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/section_header.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../data/models/nearby_complaint.dart';
import '../../../core/widgets/category_icon.dart';
import '../home_dashboard_provider.dart';

/// A small preview of nearby civic issues on the Home dashboard.
///
/// Shows up to 3 nearby complaints as compact cards. The section hides
/// gracefully when GPS is unavailable or there are no nearby issues — it
/// never blocks the rest of the dashboard. A "See all on map" link routes
/// to the full nearby map screen.
class NearbyPreviewSection extends ConsumerWidget {
  const NearbyPreviewSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final nearbyAsync = ref.watch(homeNearbyPreviewProvider);

    return nearbyAsync.when(
      data: (nearby) {
        if (nearby.isEmpty) return const SizedBox.shrink();
        final preview = nearby.take(3).toList();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SectionHeader(
              title: context.tr('home.nearbyPreview.title'),
              action: TextButton(
                onPressed: () => context.push(AppRoutes.map),
                child: Text(context.tr('common.seeAll')),
              ),
            ),
            AppSpacing.hMD,
            Column(
              children: preview
                  .map((c) => _NearbyIssueCard(complaint: c))
                  .toList(),
            ),
          ],
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, _) => const SizedBox.shrink(),
    );
  }
}

class _NearbyIssueCard extends StatelessWidget {
  const _NearbyIssueCard({required this.complaint});

  final NearbyComplaint complaint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final icon = CategoryIconHelper.iconFor(complaint.categoryIcon);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: colors.surfaceContainer,
        borderRadius: AppRadius.rMD,
        child: InkWell(
          borderRadius: AppRadius.rMD,
          onTap: () => context.push(
            '${AppRoutes.complaintDetail}/${complaint.id}',
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: colors.primaryContainer,
                    borderRadius: AppRadius.rSM,
                  ),
                  child: Icon(icon, size: 18, color: colors.primary),
                ),
                AppSpacing.wMD,
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        complaint.title,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          if (complaint.distanceLabel.isNotEmpty) ...[
                            Icon(Icons.straighten_rounded,
                                size: 12, color: colors.onSurfaceVariant),
                            const SizedBox(width: 3),
                            Text(
                              complaint.distanceLabel,
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: colors.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(width: 8),
                          ],
                          if (complaint.categoryName != null)
                            Flexible(
                              child: Text(
                                complaint.categoryName!,
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: colors.onSurfaceVariant,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
                AppSpacing.wSM,
                StatusBadge(status: complaint.status),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
