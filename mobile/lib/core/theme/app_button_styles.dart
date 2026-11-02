import 'package:flutter/material.dart';

import 'app_radius.dart';
import 'app_typography.dart';

/// Centralized [ButtonStyle] tokens for JanMitra.
///
/// These are the single source of truth for button geometry/copy styles,
/// consumed by [AppTheme] (for the global button themes) and by the
/// [PrimaryButton] / [SecondaryButton] / [AppButton] components.
class AppButtonStyles {
  AppButtonStyles._();

  /// Minimum tap height for full-width action buttons.
  static const double buttonHeight = 52;

  /// Primary (filled) action button.
  static ButtonStyle primary(ColorScheme colors, TextTheme text) =>
      FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(buttonHeight),
        shape: RoundedRectangleBorder(borderRadius: AppRadius.rMD),
        textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      );

  /// Tonal (container-colored) button — a secondary filled action.
  static ButtonStyle tonal(ColorScheme colors, TextTheme text) =>
      FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(buttonHeight),
        shape: RoundedRectangleBorder(borderRadius: AppRadius.rMD),
        textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      );

  /// Outlined / secondary button.
  static ButtonStyle secondary(ColorScheme colors, TextTheme text) =>
      OutlinedButton.styleFrom(
        minimumSize: const Size.fromHeight(buttonHeight),
        shape: RoundedRectangleBorder(borderRadius: AppRadius.rMD),
        textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      );

  /// Text-only button (low-emphasis action).
  static ButtonStyle text(ColorScheme colors, TextTheme text) =>
      TextButton.styleFrom(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.rMD),
        textStyle: text.labelLarge?.copyWith(fontWeight: FontWeight.w600),
      );

  /// Compact label style reused by badge-like buttons.
  static TextStyle get compactLabel => AppTypography.badgeLabel;
}
