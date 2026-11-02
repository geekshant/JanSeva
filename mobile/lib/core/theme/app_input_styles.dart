import 'package:flutter/material.dart';

import 'app_radius.dart';

/// Centralized input-field style tokens for JanMitra.
///
/// Provides the [InputDecorationTheme] consumed by [AppTheme], plus the
/// default field padding used by [AppTextField]. Fields are filled, with
/// no visible border until focused or in error — clean and accessible.
class AppInputStyles {
  AppInputStyles._();

  /// Default content padding for text fields.
  static const EdgeInsets contentPadding =
      EdgeInsets.symmetric(horizontal: 16, vertical: 16);

  /// The app-wide input decoration theme.
  static InputDecorationTheme theme(ColorScheme colors, TextTheme text) =>
      InputDecorationTheme(
        filled: true,
        fillColor: colors.surfaceContainerHighest,
        contentPadding: contentPadding,
        border: OutlineInputBorder(
          borderRadius: AppRadius.rMD,
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: AppRadius.rMD,
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: AppRadius.rMD,
          borderSide: BorderSide(width: 2, color: colors.primary),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: AppRadius.rMD,
          borderSide: BorderSide(width: 1.5, color: colors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: AppRadius.rMD,
          borderSide: BorderSide(width: 2, color: colors.error),
        ),
        labelStyle: text.bodyMedium?.copyWith(
          color: colors.onSurfaceVariant,
        ),
        hintStyle: text.bodyMedium?.copyWith(
          color: colors.onSurfaceVariant.withValues(alpha: 0.6),
        ),
      );
}
