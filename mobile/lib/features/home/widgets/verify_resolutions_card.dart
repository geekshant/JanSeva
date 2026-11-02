import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/routing/app_routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../verification/verification_provider.dart';

/// A prominent CTA on the Home dashboard inviting the citizen to verify
/// nearby resolved complaints. Shows the live count of pending verifications
/// when available, and routes to the [VerificationScreen] on tap.
class VerifyResolutionsCard extends ConsumerWidget {
  const VerifyResolutionsCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    // Best-effort count: only fetch once the location is available.
    final countAsync = ref.watch(verifiableComplaintsProvider);

    return Material(
      color: AppColors.resolved.withValues(alpha: 0.10),
      borderRadius: AppRadius.rLG,
      child: InkWell(
        borderRadius: AppRadius.rLG,
        onTap: () => context.push(AppRoutes.communityVerification),
        child: Padding(
          padding: AppSpacing.cardPadding,
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.resolved.withValues(alpha: 0.18),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.fact_check_outlined,
                    color: AppColors.resolved, size: 24),
              ),
              AppSpacing.wLG,
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('home.verifyResolutions.title'),
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    AppSpacing.hXS,
                    Text(
                      context.tr('home.verifyResolutions.subtitle'),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              countAsync.maybeWhen(
                data: (list) => list.isEmpty
                    ? const SizedBox.shrink()
                    : Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.resolved,
                          borderRadius: AppRadius.rPill,
                        ),
                        child: Text(
                          '${list.length}',
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                orElse: () => const SizedBox.shrink(),
              ),
              AppSpacing.wSM,
              const Icon(Icons.chevron_right, color: AppColors.resolved),
            ],
          ),
        ),
      ),
    );
  }
}

