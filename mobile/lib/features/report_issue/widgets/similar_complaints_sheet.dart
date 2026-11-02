import 'package:flutter/material.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../data/models/similar_complaint.dart';
import '../../../core/widgets/status_badge.dart';

/// Bottom sheet showing nearby reports of the same category detected during
/// the Report Issue flow. The citizen can either join an existing civic
/// incident (or a standalone report that will become one) or choose to file a
/// different issue.
///
/// Returns the chosen [SimilarComplaint] via the sheet's pop value, or
/// `null` if the citizen dismisses it to report a different issue.
class SimilarComplaintsSheet extends StatelessWidget {
  const SimilarComplaintsSheet({
    super.key,
    required this.complaints,
    required this.categoryName,
  });

  final List<SimilarComplaint> complaints;
  final String categoryName;

  static Future<SimilarComplaint?> show(
    BuildContext context, {
    required List<SimilarComplaint> complaints,
    required String categoryName,
  }) {
    return showModalBottomSheet<SimilarComplaint>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => SimilarComplaintsSheet(
        complaints: complaints,
        categoryName: categoryName,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final safePadding = MediaQuery.paddingOf(context).bottom;

    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(20, 0, 20, 16 + safePadding),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.tr('report.similar.title'),
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              context.tr('report.similar.subtitle',
                  args: {'category': categoryName}),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colors.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: complaints.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, index) =>
                    _SimilarTile(complaint: complaints[index]),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).pop(null),
                    icon: const Icon(Icons.add_location_alt_outlined),
                    label: Text(context.tr('report.review.reportDifferent')),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SimilarTile extends StatelessWidget {
  const _SimilarTile({required this.complaint});

  final SimilarComplaint complaint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Card(
      elevation: 0,
      color: colors.surfaceContainer,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => Navigator.of(context).pop(complaint),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: colors.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  complaint.isPartOfIncident
                      ? Icons.groups_2_rounded
                      : Icons.location_on_rounded,
                  size: 20,
                  color: colors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            complaint.title,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(status: complaint.status),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 10,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        _Tag(
                          icon: Icons.straighten_rounded,
                          text: complaint.distanceLabel,
                        ),
                        if (complaint.isPartOfIncident)
                          _Tag(
                            icon: Icons.groups_2_rounded,
                            text: context.tr('report.similar.citizens',
                                args: {'count': complaint.incidentReportCount}),
                            emphasize: true,
                          )
                        else
                          _Tag(
                            icon: Icons.calendar_today_outlined,
                            text: complaint.formattedDate,
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 4),
              Icon(Icons.chevron_right_rounded, color: colors.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag({
    required this.icon,
    required this.text,
    this.emphasize = false,
  });

  final IconData icon;
  final String text;
  final bool emphasize;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final color = emphasize ? colors.primary : colors.onSurfaceVariant;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 13, color: color),
        const SizedBox(width: 3),
        Text(
          text,
          style: theme.textTheme.labelSmall?.copyWith(color: color),
        ),
      ],
    );
  }
}
