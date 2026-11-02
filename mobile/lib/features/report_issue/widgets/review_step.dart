import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/widgets/xfile_image.dart';
import '../report_issue_provider.dart';
import '../report_issue_state.dart';
import 'similar_complaints_sheet.dart';

/// Step 5 — Review all entered data and submit.
///
/// Shows a summary of category, images, title, description, severity,
/// and location, plus a disclaimer and the submit button. Before submitting,
/// it checks the backend for nearby reports of the same category and offers
/// the citizen a choice to join an existing civic incident instead of filing
/// a duplicate.
class ReviewStep extends ConsumerStatefulWidget {
  const ReviewStep({super.key});

  @override
  ConsumerState<ReviewStep> createState() => _ReviewStepState();
}

class _ReviewStepState extends ConsumerState<ReviewStep> {
  @override
  void initState() {
    super.initState();
    // Fire the duplicate check once when the review step is entered.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(reportIssueProvider.notifier).checkForSimilarComplaints();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reportIssueProvider);
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            context.tr('report.review.title'),
            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          Text(
            context.tr('report.review.subtitle'),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 20),
          // --- Duplicate detection banner ---
          _SimilarIssuesSection(state: state),
          // Category
          _ReviewTile(
            icon: Icons.category_rounded,
            label: context.tr('report.review.category'),
            value: state.category?.name ?? context.tr('report.review.notSelected'),
          ),
          const SizedBox(height: 12),
          // Photos
          if (state.photos.isNotEmpty) ...[
            Text(
              context.tr('report.review.photos', args: {'count': state.photos.length}),
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 100,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: state.photos.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  return ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: SizedBox(
                      width: 100,
                      height: 100,
                      child: XFileImage(file: state.photos[index].file),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),
          ],
          // Title
          _ReviewTile(
            icon: Icons.title_rounded,
            label: context.tr('report.review.titleLabel'),
            value: state.title,
          ),
          const SizedBox(height: 12),
          // Description
          if (state.description.isNotEmpty) ...[
            _ReviewTile(
              icon: Icons.description_outlined,
              label: context.tr('report.review.descriptionLabel'),
              value: state.description,
              maxLines: 3,
            ),
            const SizedBox(height: 12),
          ],
          // Severity
          _ReviewTile(
            icon: Icons.warning_amber_rounded,
            label: context.tr('report.review.severityLabel'),
            value: state.severity.displayLabel,
          ),
          const SizedBox(height: 12),
          // Location
          if (state.location != null) ...[
            _ReviewTile(
              icon: Icons.location_on_rounded,
              label: context.tr('report.review.locationLabel'),
              value:
                  '${state.location!.latitude.toStringAsFixed(4)}, ${state.location!.longitude.toStringAsFixed(4)}',
            ),
            if (state.address != null) ...[
              const SizedBox(height: 4),
              Padding(
                padding: const EdgeInsets.only(left: 32),
                child: Text(
                  state.address!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ),
            ],
            const SizedBox(height: 12),
          ],
          const SizedBox(height: 20),
          // Disclaimer
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colors.errorContainer.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: colors.error.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline_rounded, color: colors.error, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    context.tr('report.review.disclaimer'),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.onErrorContainer,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SimilarIssuesSection extends ConsumerWidget {
  const _SimilarIssuesSection({required this.state});

  final ReportIssueState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    // Still checking: show a subtle loading hint.
    if (state.isCheckingSimilar) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(
          children: [
            const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 10),
            Text(
              context.tr('report.review.checkingSimilar'),
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colors.onSurfaceVariant,
              ),
            ),
          ],
        ),
      );
    }

    // A match was chosen: confirm and allow reverting to a standalone report.
    if (state.selectedMatch != null) {
      final match = state.selectedMatch!;
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: colors.primaryContainer.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: colors.primary.withValues(alpha: 0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.link_rounded, size: 18, color: colors.primary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      match.isPartOfIncident
                          ? context.tr('report.review.joiningIncident',
                              args: {'count': match.incidentReportCount})
                          : context.tr('report.review.joiningNearby'),
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: colors.primary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                match.title,
                style: theme.textTheme.bodyMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () =>
                      ref.read(reportIssueProvider.notifier).clearMatch(),
                  child: Text(context.tr('report.review.reportDifferent')),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Matches found, not yet chosen: offer to review them.
    if (state.hasCheckedSimilar && state.similarComplaints.isNotEmpty) {
      final count = state.similarComplaints.length;
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: colors.tertiaryContainer.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
            border:
                Border.all(color: colors.tertiary.withValues(alpha: 0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.content_copy_rounded,
                      size: 18, color: colors.tertiary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      count == 1
                          ? context.tr('report.review.similarFoundOne')
                          : context.tr('report.review.similarFound',
                              args: {'count': count}),
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: colors.onTertiaryContainer,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                context.tr('report.review.mightReported'),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () async {
                    final chosen = await SimilarComplaintsSheet.show(
                      context,
                      complaints: state.similarComplaints,
                      categoryName: state.category?.name ??
                          context.tr('report.review.thisCategory'),
                    );
                    if (chosen != null) {
                      ref
                          .read(reportIssueProvider.notifier)
                          .selectMatch(chosen);
                    }
                  },
                  icon: const Icon(Icons.search_rounded),
                  label: Text(context.tr('report.review.reviewSimilar')),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // No similar reports: nothing to show.
    return const SizedBox.shrink();
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({
    required this.icon,
    required this.label,
    required this.value,
    this.maxLines = 1,
  });

  final IconData icon;
  final String label;
  final String value;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: colors.onSurfaceVariant),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: theme.textTheme.bodyLarge,
                  maxLines: maxLines,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
