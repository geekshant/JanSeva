import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/phone.dart';
import '../../core/utils/password.dart';
import 'auth_provider.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/app_text_field.dart';
import '../../core/widgets/password_field.dart';
import '../../core/widgets/password_requirements.dart';

/// Registration screen wired to Supabase Auth.
///
/// Collects name, e-mail, mobile number, password, gender, and language
/// preference. Every field is required and validated. The mobile number is
/// stored on the profile by the database trigger and becomes a second
/// sign-in identifier alongside the e-mail address. Gender and preferred
/// language are also stored on the profile by the trigger.
///
/// After signup the citizen is signed in and the router sends them to Home.
/// All errors are mapped to user-friendly messages by [AuthRepository].
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isLoading = false;

  // Gender selection — null until the user actively chooses.
  String? _selectedGender;

  // Language preference — pre-filled from the current app locale (set during
  // the language selection screen), but the user can change it here too.
  late String _selectedLanguage;

  static const _genderOptions = <_GenderOption>[
    _GenderOption(value: 'female', labelKey: 'gender.female'),
    _GenderOption(value: 'male', labelKey: 'gender.male'),
    _GenderOption(value: 'other', labelKey: 'gender.other'),
    _GenderOption(value: 'prefer_not_to_say', labelKey: 'gender.preferNotToSay'),
  ];

  static const _languageOptions = <_LanguageOption>[
    _LanguageOption(code: 'en', labelKey: 'language.english'),
    _LanguageOption(code: 'hi', labelKey: 'language.hindi'),
  ];

  @override
  void initState() {
    super.initState();
    // Pre-fill language from the current locale.
    _selectedLanguage = ref.read(localeProvider).languageCode;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  bool _isValidEmail(String email) {
    // Simple but effective: something@something.tld
    final regex = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
    return regex.hasMatch(email);
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  Future<void> _signUp() async {
    final name = _nameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    final password = _passwordController.text;
    final confirm = _confirmController.text;

    // --- Field-by-field validation (all fields required) ---
    if (name.isEmpty) {
      _showError('auth.fillAllFields');
      return;
    }
    if (email.isEmpty) {
      _showError('auth.fillAllFields');
      return;
    }
    if (!_isValidEmail(email)) {
      _showError('auth.error.emailInvalid');
      return;
    }
    if (phone.isEmpty) {
      _showError('auth.fillAllFields');
      return;
    }
    if (!isValidPhone(phone)) {
      _showError('auth.error.phoneInvalid');
      return;
    }
    if (password.isEmpty) {
      _showError('auth.fillAllFields');
      return;
    }
    if (!hasMinPasswordLength(password)) {
      _showError('auth.passwordTooShort');
      return;
    }
    if (!isValidPassword(password)) {
      _showError('auth.passwordTooWeak');
      return;
    }
    if (confirm.isEmpty) {
      _showError('auth.confirmPasswordRequired');
      return;
    }
    if (password != confirm) {
      _showError('auth.passwordsDoNotMatch');
      return;
    }
    if (_selectedGender == null) {
      _showError('auth.genderRequired');
      return;
    }
    // Language is always pre-selected from the locale, so it is never null.
    // But we guard defensively.
    if (_selectedLanguage.isEmpty) {
      _showError('auth.languageRequired');
      return;
    }

    setState(() => _isLoading = true);

    // Apply the selected language to the app locale immediately so the rest
    // of the app uses it.
    if (_selectedLanguage != ref.read(localeProvider).languageCode) {
      await ref.read(localeProvider.notifier).setLocale(Locale(_selectedLanguage));
    }

    final repo = ref.read(authRepositoryProvider);
    final result = await repo.signUp(
      name: name,
      email: email,
      phone: phone,
      password: password,
      gender: _selectedGender!,
      preferredLanguage: _selectedLanguage,
    );
    if (!mounted) return;
    setState(() => _isLoading = false);

    result.when(
      success: (_) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(context.tr('auth.accountCreated'))),
        );
        context.go(AppRoutes.home);
      },
      failure: (f) => _showError(f.message),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(AppLocalizations.translate(message))),
    );
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l = context.tr;

    return Scaffold(
      appBar: AppBar(title: Text(l('auth.createAccount'))),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.pagePadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppSpacing.hLG,
              Container(
                padding: const EdgeInsets.all(14),
                decoration: const BoxDecoration(
                  gradient: AppColors.brandGradient,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.campaign_rounded,
                  size: 36,
                  color: Colors.white,
                ),
              ),
              AppSpacing.hMD,
              Text(
                l('auth.joinJanmitra'),
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              AppSpacing.hSM,
              Text(
                l('auth.registerSubtitle'),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.hXXL,

              // --- Full name ---
              AppTextField(
                label: l('auth.fullName'),
                hint: l('auth.fullNameHint'),
                controller: _nameController,
                prefixIcon: Icons.person_outline_rounded,
              ),
              AppSpacing.hLG,

              // --- Email ---
              AppTextField(
                label: l('auth.email'),
                hint: l('auth.emailHint'),
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                prefixIcon: Icons.alternate_email_rounded,
              ),
              AppSpacing.hLG,

              // --- Phone ---
              AppTextField(
                label: l('auth.phone'),
                hint: l('auth.phoneHint'),
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                prefixIcon: Icons.phone_android_rounded,
              ),
              AppSpacing.hLG,

              // --- Password ---
              PasswordField(
                label: l('auth.password'),
                hint: l('auth.passwordMinHint'),
                controller: _passwordController,
                onChanged: (_) => setState(() {}),
              ),
              PasswordRequirements(password: _passwordController.text),
              AppSpacing.hLG,

              // --- Confirm password ---
              PasswordField(
                label: l('auth.confirmPassword'),
                hint: l('auth.confirmPasswordHint'),
                controller: _confirmController,
              ),
              AppSpacing.hLG,

              // --- Gender (required) ---
              _buildGenderSection(theme, l),
              AppSpacing.hLG,

              // --- Language preference (required) ---
              _buildLanguageSection(theme, l),
              AppSpacing.hXXL,

              // --- Submit ---
              PrimaryButton(
                label: l('auth.createAccount'),
                isLoading: _isLoading,
                onPressed: _signUp,
              ),
              AppSpacing.hXL,
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    l('auth.alreadyHaveAccount'),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.go(AppRoutes.login),
                    child: Text(l('auth.signIn')),
                  ),
                ],
              ),
              AppSpacing.hLG,
            ],
          ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Gender selection
  // ---------------------------------------------------------------------------

  Widget _buildGenderSection(ThemeData theme, String Function(String) l) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l('gender.label'),
          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
        ),
        AppSpacing.hSM,
        ..._genderOptions.map((option) {
          final isSelected = _selectedGender == option.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: () => setState(() => _selectedGender = option.value),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isSelected
                        ? theme.colorScheme.primary
                        : theme.colorScheme.outline,
                    width: isSelected ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  color: isSelected
                      ? theme.colorScheme.primaryContainer
                      : Colors.transparent,
                ),
                child: Row(
                  children: [
                    Icon(
                      isSelected
                          ? Icons.radio_button_checked_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: isSelected
                          ? theme.colorScheme.primary
                          : theme.colorScheme.outline,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        l(option.labelKey),
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight:
                              isSelected ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Language selection (pre-selected, changeable)
  // ---------------------------------------------------------------------------

  Widget _buildLanguageSection(ThemeData theme, String Function(String) l) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          l('profile.language'),
          style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
        ),
        AppSpacing.hSM,
        ..._languageOptions.map((option) {
          final isSelected = _selectedLanguage == option.code;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: InkWell(
              onTap: () => setState(() => _selectedLanguage = option.code),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isSelected
                        ? theme.colorScheme.primary
                        : theme.colorScheme.outline,
                    width: isSelected ? 2 : 1,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  color: isSelected
                      ? theme.colorScheme.primaryContainer
                      : Colors.transparent,
                ),
                child: Row(
                  children: [
                    Icon(
                      isSelected
                          ? Icons.radio_button_checked_rounded
                          : Icons.radio_button_unchecked_rounded,
                      color: isSelected
                          ? theme.colorScheme.primary
                          : theme.colorScheme.outline,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        l(option.labelKey),
                        style: theme.textTheme.bodyLarge?.copyWith(
                          fontWeight:
                              isSelected ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}

class _GenderOption {
  const _GenderOption({required this.value, required this.labelKey});
  final String value;
  final String labelKey;
}

class _LanguageOption {
  const _LanguageOption({required this.code, required this.labelKey});
  final String code;
  final String labelKey;
}
