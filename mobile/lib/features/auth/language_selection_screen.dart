import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/primary_button.dart';
import 'onboarding_screen.dart';

/// SharedPreferences key tracking whether the language selection screen has been
/// completed. Distinct from [kLocalePreferenceKey] (which stores the chosen
/// language code) so we can distinguish "user explicitly chose English" from
/// "no preference set yet."
const kLanguageSelectedKey = 'janmitra_language_selected';

/// First-launch language selection screen. Shown once before onboarding so
/// the rest of the app (onboarding, login, register) renders in the user's
/// preferred language. Existing users with a saved language skip this screen.
class LanguageSelectionScreen extends ConsumerStatefulWidget {
  const LanguageSelectionScreen({super.key});

  @override
  ConsumerState<LanguageSelectionScreen> createState() =>
      _LanguageSelectionScreenState();
}

class _LanguageSelectionScreenState
    extends ConsumerState<LanguageSelectionScreen> {
  String? _selectedCode;
  bool _isLoading = false;

  static const _languages = <_LanguageOption>[
    _LanguageOption(
      code: 'en',
      nameKey: 'language.english',
      nativeName: 'English',
      icon: Icons.language_rounded,
    ),
    _LanguageOption(
      code: 'hi',
      nameKey: 'language.hindi',
      nativeName: 'हिंदी',
      icon: Icons.language_rounded,
    ),
  ];

  Future<void> _continue() async {
    if (_selectedCode == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(context.tr('language.selectPrompt'))),
      );
      return;
    }

    setState(() => _isLoading = true);

    // Apply the locale immediately so the next screen renders in the chosen
    // language.
    await ref
        .read(localeProvider.notifier)
        .setLocale(Locale(_selectedCode!));

    // Mark language selection as complete so the splash never shows this
    // screen again.
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(kLanguageSelectedKey, true);

    if (!mounted) return;
    setState(() => _isLoading = false);

    // Continue to onboarding (or login if onboarding already seen).
    final needsOnboarding = await shouldShowOnboarding();
    if (!mounted) return;
    context.go(needsOnboarding ? AppRoutes.onboarding : AppRoutes.login);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.pagePadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppSpacing.hXXXL,
              Center(
                child: Container(
                  padding: const EdgeInsets.all(28),
                  decoration: const BoxDecoration(
                    gradient: AppColors.brandGradient,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.language_rounded,
                    size: 48,
                    color: Colors.white,
                  ),
                ),
              ),
              AppSpacing.hXXL,
              Text(
                context.tr('language.title'),
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              AppSpacing.hMD,
              Text(
                context.tr('language.subtitle'),
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              AppSpacing.hXXL,
              ..._languages.map((lang) => _LanguageCard(
                    option: lang,
                    isSelected: _selectedCode == lang.code,
                    onTap: () => setState(() => _selectedCode = lang.code),
                  )),
              AppSpacing.hXXL,
              PrimaryButton(
                label: context.tr('language.continue'),
                isLoading: _isLoading,
                onPressed: _continue,
              ),
              AppSpacing.hXL,
            ],
          ),
        ),
      ),
    );
  }
}

class _LanguageOption {
  const _LanguageOption({
    required this.code,
    required this.nameKey,
    required this.nativeName,
    required this.icon,
  });

  final String code;
  final String nameKey;
  final String nativeName;
  final IconData icon;
}

class _LanguageCard extends StatelessWidget {
  const _LanguageCard({
    required this.option,
    required this.isSelected,
    required this.onTap,
  });

  final _LanguageOption option;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: isSelected
            ? colors.primaryContainer
            : colors.surfaceContainer,
        borderRadius: AppRadius.rLG,
        child: InkWell(
          borderRadius: AppRadius.rLG,
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
            child: Row(
              children: [
                Icon(
                  option.icon,
                  color: isSelected ? colors.primary : colors.onSurfaceVariant,
                  size: 28,
                ),
                AppSpacing.wLG,
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        option.nativeName,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        context.tr(option.nameKey),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(
                  isSelected
                      ? Icons.radio_button_checked_rounded
                      : Icons.radio_button_unchecked_rounded,
                  color: isSelected ? colors.primary : colors.outline,
                  size: 28,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Checks whether the language selection screen has been completed.
/// Returns `true` if the user has NOT yet selected a language.
Future<bool> shouldShowLanguageSelection() async {
  final prefs = await SharedPreferences.getInstance();
  return !(prefs.getBool(kLanguageSelectedKey) ?? false);
}
