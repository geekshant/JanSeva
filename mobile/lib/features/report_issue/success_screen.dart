import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/complaint.dart';
import '../../data/models/complaint_status.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/status_badge.dart';
import '../gamification/rewards_provider.dart';

/// Success screen shown after a complaint is submitted.
///
/// Shows a prominent confirmation with the complaint number, a reassuring
/// "We have received your report" message, the submission date, current
/// status, and earned civic points. Provides a "Track Complaint" primary
/// action and a "Back to Home" secondary action.
class SuccessScreen extends ConsumerStatefulWidget {
  const SuccessScreen({super.key, this.complaint});

  final Complaint? complaint;

  @override
  ConsumerState<SuccessScreen> createState() => _SuccessScreenState();
}

class _SuccessScreenState extends ConsumerState<SuccessScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _scale = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // --- Success icon ---
                ScaleTransition(
                  scale: _scale,
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: const BoxDecoration(
                      gradient: AppColors.brandGradient,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_circle_rounded,
                      size: 64,
                      color: Colors.white,
                    ),
                  ),
                ),
                AppSpacing.hXXL,

                // --- Title ---
                Text(
                  context.tr('report.success.title'),
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                AppSpacing.hSM,

                // --- Complaint number (prominent) ---
                if (widget.complaint != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 10,
                    ),
                    decoration: BoxDecoration(
                      color: colors.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      widget.complaint!.complaintNumber,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: colors.onPrimaryContainer,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  AppSpacing.hMD,
                ],

                // --- Reassurance message ---
                Text(
                  widget.complaint?.status == ComplaintStatus.aiChecking
                      ? context.tr('report.success.aiChecking')
                      : context.tr('report.success.message'),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                AppSpacing.hXXL,

                // --- Details card ---
                if (widget.complaint != null)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: colors.surfaceContainer,
                      borderRadius: BorderRadius.circular(16),
                    ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _DetailRow(
                            label: context.tr('report.success.submitted'),
                            value: widget.complaint!.formattedDate,
                            icon: Icons.calendar_today_outlined,
                          ),
                          AppSpacing.hLG,
                          Row(
                            children: [
                              Icon(Icons.info_outline_rounded,
                                  size: 20, color: colors.onSurfaceVariant),
                              AppSpacing.wMD,
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    context.tr('report.success.currentStatus'),
                                    style: theme.textTheme.labelSmall?.copyWith(
                                      color: colors.onSurfaceVariant,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  StatusBadge(status: widget.complaint!.status),
                                ],
                              ),
                            ],
                          ),
                          AppSpacing.hLG,
                          _PointsEarnedRow(complaintId: widget.complaint!.id),
                        ],
                      ),
                    ),
                AppSpacing.hXXL,

                // --- Actions ---
                AppButton(
                  label: context.tr('report.success.track'),
                  icon: Icons.track_changes_rounded,
                  isExpanded: true,
                  onPressed: () => context.go(AppRoutes.complaints),
                ),
                AppSpacing.hMD,
                AppButton(
                  label: context.tr('report.success.backHome'),
                  variant: AppButtonVariant.text,
                  isExpanded: true,
                  onPressed: () => context.go(AppRoutes.home),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Row(
      children: [
        Icon(icon, size: 20, color: colors.onSurfaceVariant),
        AppSpacing.wMD,
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
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Points actually awarded by the database (`rewards` row created by the
/// VALID_ISSUE_REPORT trigger) — never a hard-coded value.
class _PointsEarnedRow extends ConsumerWidget {
  const _PointsEarnedRow({required this.complaintId});

  final String complaintId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rewardAsync = ref.watch(reportRewardProvider(complaintId));
    final l = context.tr;

    return rewardAsync.when(
      data: (reward) => _DetailRow(
        label: l('report.success.pointsEarned'),
        value: reward == null
            ? l('report.success.pointsPending')
            : l('report.success.civicPoints', args: {'count': reward.signedPoints}),
        icon: Icons.emoji_events_outlined,
      ),
      loading: () => _DetailRow(
        label: l('report.success.pointsEarned'),
        value: l('report.success.calculating'),
        icon: Icons.emoji_events_outlined,
      ),
      error: (error, _) => _DetailRow(
        label: l('report.success.pointsEarned'),
        value: l('report.success.seeRewards'),
        icon: Icons.emoji_events_outlined,
      ),
    );
  }
}
