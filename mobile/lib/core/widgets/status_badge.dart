import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../../data/models/complaint_status.dart';

/// A colored chip representing a complaint's lifecycle status.
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.status});

  final ComplaintStatus status;

  @override
  Widget build(BuildContext context) {
    final color = _colorFor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: AppRadius.rPill,
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        status.displayLabel,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }

  Color _colorFor(ComplaintStatus s) => switch (s) {
        ComplaintStatus.submitted => AppColors.submitted,
        ComplaintStatus.autoValidating => const Color(0xFF6366F1),
        ComplaintStatus.needsReview => const Color(0xFFF97316),
        ComplaintStatus.aiChecking => const Color(0xFF6366F1),
        ComplaintStatus.aiVerified => AppColors.verified,
        ComplaintStatus.aiReviewRequired => const Color(0xFFF97316),
        ComplaintStatus.aiFailed => AppColors.rejected,
        ComplaintStatus.evidenceRequired => AppColors.warning,
        ComplaintStatus.verified => AppColors.verified,
        ComplaintStatus.assigned => const Color(0xFF1565C0),
        ComplaintStatus.acknowledged => const Color(0xFF0EA5E9),
        ComplaintStatus.inProgress => AppColors.inProgress,
        ComplaintStatus.resolutionSubmitted => const Color(0xFF14B8A6),
        ComplaintStatus.resolutionUnderReview => const Color(0xFFF97316),
        ComplaintStatus.communityVerification => const Color(0xFFA855F7),
        ComplaintStatus.resolved => AppColors.resolved,
        ComplaintStatus.reopened => const Color(0xFFEF4444),
        ComplaintStatus.escalated => const Color(0xFFDC2626),
        ComplaintStatus.rejected => AppColors.rejected,
        ComplaintStatus.closed => const Color(0xFF6B7280),
      };
}
