import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_button_styles.dart';
import 'app_input_styles.dart';
import 'app_radius.dart';
import 'app_typography.dart';

/// Builds the Material 3 [ThemeData] (light + dark) for the app.
///
/// All component themes are derived from a single [ColorScheme] seeded by
/// [AppColors.brandSeed] and consume the centralized design tokens
/// ([AppTypography], [AppButtonStyles], [AppInputStyles]) so the look stays
/// consistent across light/dark.
class AppTheme {
  AppTheme._();

  static ThemeData get light => _buildTheme(Brightness.light);
  static ThemeData get dark => _buildTheme(Brightness.dark);

  static ThemeData _buildTheme(Brightness brightness) {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: AppColors.brandSeed,
      brightness: brightness,
    );
    final textTheme = AppTypography.textTheme(brightness);

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: colorScheme.surface,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 1.5,
        backgroundColor: colorScheme.surface,
        foregroundColor: colorScheme.onSurface,
        titleTextStyle: textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w600,
          color: colorScheme.onSurface,
        ),
      ),
      cardTheme: CardThemeData(
        color: colorScheme.surfaceContainer,
        elevation: 0,
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(borderRadius: AppRadius.rLG),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: AppButtonStyles.primary(colorScheme, textTheme),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: AppButtonStyles.secondary(colorScheme, textTheme),
      ),
      textButtonTheme: TextButtonThemeData(
        style: AppButtonStyles.text(colorScheme, textTheme),
      ),
      inputDecorationTheme: AppInputStyles.theme(colorScheme, textTheme),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: colorScheme.surface,
        elevation: 0,
        height: 72,
        indicatorColor: colorScheme.primaryContainer,
        labelTextStyle: WidgetStatePropertyAll<TextStyle?>(
          textTheme.labelMedium,
        ),
      ),
      dividerTheme: DividerThemeData(
        color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        thickness: 1,
        space: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: colorScheme.inverseSurface,
        contentTextStyle: textTheme.bodyMedium?.copyWith(
          color: colorScheme.onInverseSurface,
        ),
        shape: RoundedRectangleBorder(borderRadius: AppRadius.rMD),
      ),
      listTileTheme: ListTileThemeData(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: AppRadius.rMD),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.rPill),
      ),
      dialogTheme: DialogThemeData(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.rXL),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        shape: RoundedRectangleBorder(borderRadius: AppRadius.rXL),
        backgroundColor: colorScheme.surface,
      ),
    );
  }
}
