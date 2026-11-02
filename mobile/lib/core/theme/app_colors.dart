import 'package:flutter/material.dart';

/// Centralized color palette for JanMitra.
///
/// [brandSeed] is the seed color handed to `ColorScheme.fromSeed` so the whole
/// Material 3 scheme is derived from a single, consistent civic-green source.
class AppColors {
  AppColors._();

  /// Seed color used to generate the Material 3 `ColorScheme`.
  static const Color brandSeed = Color(0xFF2E7D32);

  /// Primary brand gradient stops for hero cards.
  static const Color gradientStart = Color(0xFF2E7D32);
  static const Color gradientEnd = Color(0xFF1565C0);

  // --- Complaint status colors ---------------------------------------------
  static const Color submitted = Color(0xFF616161);
  static const Color underReview = Color(0xFF1565C0);
  static const Color inProgress = Color(0xFFF57C00);
  static const Color resolved = Color(0xFF2E7D32);
  static const Color verified = Color(0xFF00897B);
  static const Color rejected = Color(0xFFC62828);
  static const Color reopened = Color(0xFFEF6C00);
  static const Color duplicate = Color(0xFF8E24AA);

  // --- Semantic colors -----------------------------------------------------
  static const Color info = Color(0xFF0288D1);
  static const Color success = Color(0xFF2E7D32);
  static const Color warning = Color(0xFFED6C02);
  static const Color danger = Color(0xFFC62828);

  // --- Civic category accent colors (used by CategoryIconHelper) ----------
  static const List<Color> categoryAccents = [
    Color(0xFF2E7D32), // green
    Color(0xFF1565C0), // blue
    Color(0xFFEF6C00), // orange
    Color(0xFF00897B), // teal
    Color(0xFF8E24AA), // purple
    Color(0xFFC62828), // red
    Color(0xFF558B2F), // light green
    Color(0xFF00838F), // cyan
    Color(0xFF6A1B9A), // deep purple
    Color(0xFF455A64), // blue grey
  ];

  /// Linear gradient for hero/brand cards.
  static const LinearGradient brandGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [gradientStart, gradientEnd],
  );
}
