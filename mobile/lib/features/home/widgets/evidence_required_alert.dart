import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/theme/app_colors.dart';

/// "Action Required" alert shown on the Home dashboard when the citizen has
/// one or more complaints in `EVIDENCE_REQUIRED` status — i.e. an officer
/// has asked them to upload additional photos.
///
/// Tapping "Review Now" navigates to "My Complaints" where the cards show an
/// "Add Evidence" button for the affected complaints.
class EvidenceRequiredAlert extends StatelessWidget {
  const EvidenceRequiredAlert({super.key, required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final l = context.tr;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.warning_amber_rounded, size: 24, color: AppColors.warning),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l('home.actionRequired.title'),
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.warning,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  count == 1
                      ? l('home.actionRequired.one')
                      : l('home.actionRequired.many', args: {'count': count}),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: () => context.go(AppRoutes.complaints),
                  icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                  label: Text(l('home.actionRequired.reviewNow')),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.warning,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    visualDensity: VisualDensity.compact,
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
