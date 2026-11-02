import 'package:flutter/material.dart';

import '../i18n/app_localizations.dart';
import '../theme/app_spacing.dart';

/// A centered, user-friendly error state with an optional retry action.
///
/// Use this when a screen or section fails to load. Pair it with a [Failure]
/// message and a retry callback that re-triggers the failed operation.
class ErrorView extends StatelessWidget {
  const ErrorView({
    super.key,
    required this.message,
    this.title,
    this.icon = Icons.error_outline_rounded,
    this.onRetry,
  });

  final String message;
  final String? title;
  final IconData icon;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Center(
      child: Padding(
        padding: AppSpacing.pagePadding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: colors.errorContainer.withValues(alpha: 0.5),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 48,
                color: colors.error,
              ),
            ),
            AppSpacing.hXL,
            Text(
              title ?? context.tr('widget.error.title'),
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            AppSpacing.hSM,
            Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: colors.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              AppSpacing.hXXL,
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_rounded, size: 20),
                label: Text(context.tr('widget.error.retry')),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
