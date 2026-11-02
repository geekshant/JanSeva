import 'package:flutter/material.dart';

import '../i18n/app_localizations.dart';

/// A standardized confirmation dialog.
///
/// Shows a title, a message, and a cancel + confirm action. Returns `true`
/// when the user confirms, `false` otherwise (cancel / dismiss). Set
/// [destructive] to style the confirm action as an error (e.g. sign-out,
/// delete). Defaults to localized labels when none are provided.
class ConfirmDialog {
  ConfirmDialog._();

  static Future<bool> show(
    BuildContext context, {
    required String title,
    required String message,
    String? confirmLabel,
    String? cancelLabel,
    bool destructive = false,
  }) async {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(cancelLabel ?? context.tr('widget.cancel')),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: destructive
                ? FilledButton.styleFrom(
                    backgroundColor: colors.error,
                    foregroundColor: colors.onError,
                  )
                : null,
            child: Text(confirmLabel ?? context.tr('widget.confirm')),
          ),
        ],
      ),
    );
    return result ?? false;
  }
}
