import 'package:flutter/material.dart';

import '../theme/app_spacing.dart';

/// A centered, branded loading indicator with an optional message.
///
/// Drop this into any screen or list while async data is being fetched.
class LoadingView extends StatelessWidget {
  const LoadingView({
    super.key,
    this.message,
    this.size = 40,
  });

  final String? message;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: AppSpacing.pagePadding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: size,
              height: size,
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: theme.colorScheme.primary,
              ),
            ),
            if (message != null) ...[
              AppSpacing.hLG,
              Text(
                message!,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
