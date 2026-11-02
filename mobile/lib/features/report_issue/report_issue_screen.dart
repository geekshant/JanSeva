import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/app_button.dart';
import '../home/home_dashboard_provider.dart';
import 'report_issue_provider.dart';
import 'report_issue_state.dart';
import 'widgets/category_step.dart';
import 'widgets/details_step.dart';
import 'widgets/location_step.dart';
import 'widgets/photo_step.dart';
import 'widgets/review_step.dart';

/// Multi-step Report Issue screen.
///
/// Five steps: Category → Photos → Location → Details → Review → Submit.
/// Each step validates before proceeding. All form state lives in the
/// [ReportIssueNotifier] (Riverpod), so going back never loses entered
/// information. Submission uploads images to Supabase Storage, creates the
/// complaint via RPC, and navigates to a success screen. On failure,
/// orphaned images are cleaned up.
class ReportIssueScreen extends ConsumerWidget {
  const ReportIssueScreen({super.key});

  static const _stepKeys = [
    'report.step.chooseIssue',
    'report.step.addPhoto',
    'report.step.location',
    'report.step.description',
    'report.step.review',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(reportIssueProvider);
    final progress = (state.currentStep + 1) / ReportIssueState.totalSteps;
    final l = context.tr;

    ref.listen(
      reportIssueProvider.select((s) => s.errorMessage),
      (previous, next) {
        if (next != null) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(AppLocalizations.translate(next))));
        }
      },
    );

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          tooltip: l('common.cancel'),
          onPressed: () {
            ref.read(reportIssueProvider.notifier).reset();
            context.pop();
          },
        ),
        title: Text(
          l('report.stepTitle', args: {
            'title': l(_stepKeys[state.currentStep]),
            'current': state.currentStep + 1,
            'total': ReportIssueState.totalSteps,
          }),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(8),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Column(
              children: [
                LinearProgressIndicator(value: progress),
                const SizedBox(height: 6),
                _StepDots(
                  currentStep: state.currentStep,
                  totalSteps: ReportIssueState.totalSteps,
                ),
              ],
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: AppSpacing.pagePadding,
          child: _buildStep(state.currentStep),
        ),
      ),
      bottomNavigationBar: _BottomBar(
        currentStep: state.currentStep,
        isSubmitting: state.isSubmitting,
        isJoining: state.selectedMatch != null,
        onBack: () => ref.read(reportIssueProvider.notifier).previousStep(),
        onNext: () => ref.read(reportIssueProvider.notifier).nextStep(),
        onSubmit: () => _submit(context, ref),
      ),
    );
  }

  Widget _buildStep(int step) {
    switch (step) {
      case 0:
        return const CategoryStep();
      case 1:
        return const PhotoStep();
      case 2:
        return const LocationStep();
      case 3:
        return const DetailsStep();
      case 4:
        return const ReviewStep();
      default:
        return const SizedBox.shrink();
    }
  }

  Future<void> _submit(BuildContext context, WidgetRef ref) async {
    final result = await ref.read(reportIssueProvider.notifier).submit();

    if (!context.mounted) return;

    result.when(
      success: (complaint) {
        ref.invalidate(homeDashboardProvider);
        ref.read(reportIssueProvider.notifier).reset();
        context.go(AppRoutes.reportSuccess, extra: complaint);
      },
      failure: (failure) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.translate(failure.message))),
        );
      },
    );
  }
}

/// A compact row of dots showing step progress — completed steps are
/// filled, the current step is the primary color, remaining steps are muted.
class _StepDots extends StatelessWidget {
  const _StepDots({required this.currentStep, required this.totalSteps});

  final int currentStep;
  final int totalSteps;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(totalSteps, (i) {
        final isCurrent = i == currentStep;
        final isCompleted = i < currentStep;
        final color = isCurrent
            ? colors.primary
            : isCompleted
                ? colors.primary.withValues(alpha: 0.5)
                : colors.outlineVariant;
        return Container(
          width: isCurrent ? 24 : 8,
          height: 8,
          margin: const EdgeInsets.symmetric(horizontal: 3),
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        );
      }),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.currentStep,
    required this.isSubmitting,
    required this.isJoining,
    required this.onBack,
    required this.onNext,
    required this.onSubmit,
  });

  final int currentStep;
  final bool isSubmitting;
  final bool isJoining;
  final VoidCallback onBack;
  final VoidCallback onNext;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final isLastStep = currentStep == ReportIssueState.totalSteps - 1;
    final l = context.tr;
    final submitLabel = isJoining ? l('report.submitJoin') : l('report.submitStandalone');
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
        child: Row(
          children: [
            if (currentStep > 0) ...[
              Expanded(
                child: AppButton(
                  label: l('common.back'),
                  variant: AppButtonVariant.outlined,
                  onPressed: isSubmitting ? null : onBack,
                ),
              ),
              AppSpacing.wMD,
            ],
            Expanded(
              child: AppButton(
                label: isLastStep ? submitLabel : l('common.next'),
                isLoading: isSubmitting,
                onPressed: isSubmitting ? null : (isLastStep ? onSubmit : onNext),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
