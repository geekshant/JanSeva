import 'package:flutter/material.dart';

import '../i18n/app_localizations.dart';
import '../theme/app_spacing.dart';

/// A compact banner shown when the device is offline or a network error
/// occurs. Place it at the top of a screen body (below the AppBar) or
/// inside a list's error overlay.
class OfflineBanner extends StatelessWidget {
  const OfflineBanner({
    super.key,
    this.message,
    this.onRetry,
  });

  final String? message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Material(
      color: colors.errorContainer,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            Icon(Icons.wifi_off_rounded, size: 18, color: colors.onErrorContainer),
            AppSpacing.wSM,
            Expanded(
              child: Text(
                message ?? context.tr('widget.offline.message'),
                style: theme.textTheme.labelMedium?.copyWith(
                  color: colors.onErrorContainer,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            if (onRetry != null)
              TextButton(
                onPressed: onRetry,
                style: TextButton.styleFrom(
                  minimumSize: Size.zero,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  context.tr('widget.offline.retry'),
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: colors.onErrorContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
