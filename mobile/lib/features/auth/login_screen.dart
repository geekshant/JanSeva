import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/phone.dart';
import '../../core/widgets/app_text_field.dart';
import '../../core/widgets/password_field.dart';
import '../../core/widgets/primary_button.dart';
import 'auth_provider.dart';
import 'session_scope.dart';

/// Primary sign-in screen.
///
/// Citizens sign in with their **e-mail address or mobile number**, plus the
/// account password. The identifier is validated client-side and, when it is
/// a mobile number, resolved to the account's e-mail by the app's data layer
/// before Supabase authenticates it.
///
/// Signing in drops the citizen straight into the app; linking an Aadhaar
/// number afterwards is optional (see `AadhaarRegistrationScreen`).
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  final _identifierFocus = FocusNode();
  final _passwordFocus = FocusNode();

  bool _isLoading = false;
  String? _errorText;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _identifierFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  void _clearError() {
    if (_errorText != null) setState(() => _errorText = null);
  }

  Future<void> _signIn() async {
    final identifier = _identifierController.text.trim();
    final password = _passwordController.text;

    if (identifier.isEmpty || password.isEmpty) {
      setState(() => _errorText = 'auth.enterEmailPassword');
      return;
    }
    if (!looksLikeEmail(identifier) && !isValidPhone(identifier)) {
      setState(() => _errorText = 'auth.error.identifierInvalid');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorText = null;
    });

    final result = await ref.read(authRepositoryProvider).signInWithIdentifier(
          identifier: identifier,
          password: password,
        );
    if (!mounted) return;
    setState(() => _isLoading = false);

    result.when(
      success: (_) {
        // Start from a clean slate for this citizen.
        invalidateUserScopedData(ref);
        // Aadhaar linking is optional, so signed-in citizens go straight in.
        context.go(AppRoutes.home);
      },
      failure: (f) => setState(() => _errorText = f.message),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l = context.tr;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.pagePadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppSpacing.hXXL,
              _buildBranding(theme),
              AppSpacing.hXXXL,
              Text(
                l('auth.welcomeBack'),
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              AppSpacing.hSM,
              Text(
                l('auth.loginSubtitle'),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.hXXL,
              AppTextField(
                label: l('auth.identifier'),
                hint: l('auth.identifierHint'),
                controller: _identifierController,
                focusNode: _identifierFocus,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                prefixIcon: Icons.alternate_email_rounded,
                onChanged: (_) => _clearError(),
                onSubmitted: (_) => _passwordFocus.requestFocus(),
              ),
              AppSpacing.hSM,
              PasswordField(
                label: l('auth.password'),
                hint: l('auth.passwordHint'),
                controller: _passwordController,
                focusNode: _passwordFocus,
                textInputAction: TextInputAction.done,
                errorText: _errorText == null
                    ? null
                    : AppLocalizations.translate(_errorText!),
                onChanged: (_) => _clearError(),
                onSubmitted: (_) => _signIn(),
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => context.go(AppRoutes.forgotPassword),
                  child: Text(l('auth.forgotPassword')),
                ),
              ),
              PrimaryButton(
                label: l('auth.signIn'),
                isLoading: _isLoading,
                onPressed: _signIn,
              ),
              AppSpacing.hXL,
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHighest
                      .withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.verified_user_outlined,
                      size: 18,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        l('auth.loginAadhaarNote'),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              AppSpacing.hXL,
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    l('auth.noAccount'),
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.go(AppRoutes.register),
                    child: Text(l('auth.register')),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBranding(ThemeData theme) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            gradient: AppColors.brandGradient,
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.campaign_rounded,
            size: 40,
            color: Colors.white,
          ),
        ),
        AppSpacing.hMD,
        Text(
          context.tr('app.name'),
          style: theme.textTheme.headlineMedium?.copyWith(
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
      ],
    );
  }
}
