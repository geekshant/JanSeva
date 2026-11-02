import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Centralized typography tokens for JanMitra.
///
/// The app uses Poppins throughout. [textTheme] produces the Poppins
/// [TextTheme] consumed by [AppTheme]; the named getters below are the
/// handful of custom styles reused across the design system
/// (section headers, stat values, badges).
class AppTypography {
  AppTypography._();

  /// Logical font family name (Poppins, loaded via google_fonts).
  static const String fontFamily = 'Poppins';

  /// Poppins text theme derived from the platform defaults for [brightness].
  static TextTheme textTheme(Brightness brightness) {
    final base = brightness == Brightness.dark
        ? ThemeData.dark()
        : ThemeData.light();
    return GoogleFonts.poppinsTextTheme(base.textTheme);
  }

  /// Section heading used by [SectionHeader] and screen titles.
  static TextStyle get sectionTitle => GoogleFonts.poppins(
        fontWeight: FontWeight.w700,
        fontSize: 16,
        height: 1.3,
      );

  /// Card title (slightly larger, semi-bold).
  static TextStyle get cardTitle => GoogleFonts.poppins(
        fontWeight: FontWeight.w600,
        fontSize: 16,
        height: 1.3,
      );

  /// Large numeric value used in stat tiles / reputation cards.
  static TextStyle get statValue => GoogleFonts.poppins(
        fontWeight: FontWeight.w700,
        fontSize: 22,
        height: 1.2,
      );

  /// Compact label used by [StatusBadge] and chips.
  static TextStyle get badgeLabel => GoogleFonts.poppins(
        fontWeight: FontWeight.w600,
        fontSize: 12,
        height: 1.2,
      );

  /// Small caption / helper text.
  static TextStyle get caption => GoogleFonts.poppins(
        fontWeight: FontWeight.w400,
        fontSize: 12,
        height: 1.4,
      );
}
