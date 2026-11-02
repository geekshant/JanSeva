import 'package:flutter/material.dart';

// Re-export radius tokens so existing code importing `app_spacing.dart`
// continues to see [AppRadius]. New code should import `app_radius.dart`.
export 'app_radius.dart';

/// Consistent spacing tokens for JanMitra.
///
/// Use these instead of raw `EdgeInsets` so spacing stays uniform across the
/// entire app. Radius tokens live in `app_radius.dart` (re-exported here).
class AppSpacing {
  AppSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double xxxl = 32;

  static const EdgeInsets pagePadding = EdgeInsets.all(xl);
  static const EdgeInsets cardPadding = EdgeInsets.all(lg);
  static const EdgeInsets sectionGap = EdgeInsets.symmetric(vertical: xxl);
  static const SizedBox hXS = SizedBox(height: xs);
  static const SizedBox hSM = SizedBox(height: sm);
  static const SizedBox hMD = SizedBox(height: md);
  static const SizedBox hLG = SizedBox(height: lg);
  static const SizedBox hXL = SizedBox(height: xl);
  static const SizedBox hXXL = SizedBox(height: xxl);
  static const SizedBox hXXXL = SizedBox(height: xxxl);
  static const SizedBox wXS = SizedBox(width: xs);
  static const SizedBox wSM = SizedBox(width: sm);
  static const SizedBox wMD = SizedBox(width: md);
  static const SizedBox wLG = SizedBox(width: lg);
}
