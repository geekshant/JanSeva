import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/section_header.dart';
import '../../../core/widgets/empty_view.dart';
import '../../../data/models/complaint.dart';
import 'complaint_card.dart';

/// My active complaints section: a header, the user's latest complaint cards,
/// or an empty state when there are none yet.
///
/// Answers "what are my complaints doing?" by showing recently active reports
/// with their current status.
class RecentComplaintsSection extends StatelessWidget {
  const RecentComplaintsSection({super.key, required this.complaints});

  final List<Complaint> complaints;

  @override
  Widget build(BuildContext context) {
    if (complaints.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: context.tr('home.recent.title')),
          AppSpacing.hMD,
          EmptyView(
            icon: Icons.receipt_long_outlined,
            title: context.tr('home.recent.emptyTitle'),
            message: context.tr('home.recent.emptyMessage'),
            actionLabel: context.tr('home.recent.emptyAction'),
            onAction: () => context.push(AppRoutes.reportIssue),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: context.tr('home.recent.title'),
          action: TextButton(
            onPressed: () => context.go(AppRoutes.complaints),
            child: Text(context.tr('common.seeAll')),
          ),
        ),
        AppSpacing.hMD,
        Column(
          children: complaints.map((c) => ComplaintCard(complaint: c)).toList(),
        ),
      ],
    );
  }
}
