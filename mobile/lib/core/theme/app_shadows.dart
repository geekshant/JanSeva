import 'package:flutter/material.dart';

/// Restrained shadow presets for JanMitra.
///
/// Shadows here are intentionally subtle (low alpha, small blur) to keep
/// the civic UI clean and professional. Avoid heavy elevation — prefer
/// surface tonal separation (see [AppCard]).
class AppShadows {
  AppShadows._();

  /// Default card shadow — barely-there lift.
  static const List<BoxShadow> card = [
    BoxShadow(
      color: Color(0x0F000000),
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];

  /// Slightly stronger shadow for elevated sheets / dialogs.
  static const List<BoxShadow> elevated = [
    BoxShadow(
      color: Color(0x14000000),
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
  ];

  /// No shadow (flat surface).
  static const List<BoxShadow> none = [];
}
