import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/category_icon.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../data/models/complaint.dart';
import '../../../data/models/complaint_status.dart';

/// A card showing a single complaint in the "My Complaints" list.
///
/// Layout per the spec:
/// ```
/// Road Damage                    JMN-2026-00182
/// In Progress
/// Arera Colony
/// Updated 15 min ago
/// ```
/// The card is tappable and navigates to the complaint detail screen.
class ComplaintListCard extends StatelessWidget {
  const ComplaintListCard({super.key, required this.complaint});

  final Complaint complaint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final categoryIcon = CategoryIconHelper.iconFor(complaint.category?.icon);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () =>
              context.push('${AppRoutes.complaintDetail}/${complaint.id}'),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // --- Thumbnail / category icon ---
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: SizedBox(
                    width: 56,
                    height: 56,
                    child: complaint.thumbnailUrl != null &&
                            complaint.thumbnailUrl!.isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: complaint.thumbnailUrl!,
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(
                              color: colors.surfaceContainerHighest,
                              child: const Center(
                                child: CircularProgressIndicator(
                                    strokeWidth: 2),
                              ),
                            ),
                            errorWidget: (context, url, error) =>
                                _CategoryFallback(icon: categoryIcon),
                          )
                        : _CategoryFallback(icon: categoryIcon),
                  ),
                ),
                AppSpacing.wMD,
                // --- Text content ---
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Category name + complaint number
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              complaint.category?.name ?? 'Uncategorized',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: colors.primary,
                                fontWeight: FontWeight.w700,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                            complaint.complaintNumber,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: colors.onSurfaceVariant,
                              fontWeight: FontWeight.w500,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      // Title
                      Text(
                        complaint.title,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      // Status badge
                      StatusBadge(status: complaint.status),
                      const SizedBox(height: 8),
                      // Assigned department (if any)
                      if (complaint.assignment != null &&
                          complaint.assignment!.hasDepartment) ...[
                        Row(
                          children: [
                            Icon(Icons.assignment_ind_outlined,
                                size: 13, color: colors.primary),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(
                                complaint.assignment!.hasOfficer
                                    ? '${complaint.assignment!.departmentName} · ${complaint.assignment!.officerName}'
                                    : complaint.assignment!.departmentName!,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: colors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                      ],
                      // Address + relative time
                      Row(
                        children: [
                          if (complaint.address != null &&
                              complaint.address!.isNotEmpty) ...[
                            Icon(Icons.location_on_outlined,
                                size: 13, color: colors.onSurfaceVariant),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(
                                complaint.address!,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: colors.onSurfaceVariant,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ] else
                            const Spacer(),
                          if (complaint.address == null ||
                              complaint.address!.isEmpty)
                            const Spacer(),
                          Text(
                            _relativeTime,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                      // Quick "Add Evidence" action for complaints awaiting
                      // more evidence — so the citizen can act directly from
                      // the list without opening detail first.
                      if (complaint.status == ComplaintStatus.evidenceRequired) ...[
                        const SizedBox(height: 10),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.tonalIcon(
                            onPressed: () => context.push(
                              '${AppRoutes.complaintDetail}/${complaint.id}',
                            ),
                            icon: Icon(Icons.add_a_photo_outlined, size: 16),
                            label: Text(AppLocalizations.translate(
                              'complaint.card.addEvidence',
                            )),
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.warning.withValues(alpha: 0.12),
                              foregroundColor: AppColors.warning,
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              visualDensity: VisualDensity.compact,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Human-readable relative time, e.g. "Updated 15 min ago".
  String get _relativeTime {
    final reference = complaint.updatedAt ?? complaint.createdAt;
    final diff = DateTime.now().difference(reference);

    String relative;
    if (diff.inMinutes < 1) {
      relative = 'just now';
    } else if (diff.inHours < 1) {
      relative = '${diff.inMinutes} min ago';
    } else if (diff.inDays < 1) {
      relative = '${diff.inHours} hr ago';
    } else if (diff.inDays < 30) {
      relative = '${diff.inDays} day${diff.inDays > 1 ? 's' : ''} ago';
    } else {
      relative = complaint.formattedDate;
    }

    final isUpdated = complaint.updatedAt != null &&
        complaint.updatedAt != complaint.createdAt;
    return isUpdated ? 'Updated $relative' : relative;
  }
}

class _CategoryFallback extends StatelessWidget {
  const _CategoryFallback({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      color: colors.surfaceContainerHighest,
      child: Icon(icon, size: 24, color: colors.onSurfaceVariant),
    );
  }
}
