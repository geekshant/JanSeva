import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/password.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/password_field.dart';
import '../../core/widgets/password_requirements.dart';
import 'auth_provider.dart';

/// Reset password screen: reached via the deep link in the password-reset
/// email. The Supabase SDK recovers the session from the recovery token in
/// the URL, then the citizen enters a new password here.
class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _resetPassword() async {
    final password = _passwordController.text;
    final confirm = _confirmController.text;

    if (password.isEmpty) {
      _showError(AppLocalizations.translate('auth.enterNewPassword'));
      return;
    }
    if (!hasMinPasswordLength(password)) {
      _showError(AppLocalizations.translate('auth.passwordTooShort'));
      return;
    }
    if (!isValidPassword(password)) {
      _showError(AppLocalizations.translate('auth.passwordTooWeak'));
      return;
    }
    if (password != confirm) {
      _showError(AppLocalizations.translate('auth.passwordsDoNotMatch'));
      return;
    }

    setState(() => _isLoading = true);
    final repo = ref.read(authRepositoryProvider);
    final result = await repo.updatePassword(password);
    if (!mounted) return;
    setState(() => _isLoading = false);
    result.when(
      success: (_) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.translate('auth.passwordUpdated'))),
        );
        context.go(AppRoutes.home);
      },
      failure: (f) => _showError(AppLocalizations.translate(f.message)),
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(context.tr('auth.setNewPassword'))),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.pagePadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppSpacing.hXL,
              Icon(
                Icons.lock_outline_rounded,
                size: 64,
                color: theme.colorScheme.primary,
              ),
              AppSpacing.hLG,
              Text(
                context.tr('auth.setNewPasswordTitle'),
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              AppSpacing.hSM,
              Text(
                context.tr('auth.setNewPasswordSubtitle'),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.hXXL,
              PasswordField(
                label: context.tr('auth.newPassword'),
                hint: context.tr('auth.passwordMinHint'),
                controller: _passwordController,
                onChanged: (_) => setState(() {}),
              ),
              PasswordRequirements(password: _passwordController.text),
              AppSpacing.hLG,
              PasswordField(
                label: context.tr('auth.confirmPassword'),
                hint: context.tr('auth.confirmNewPasswordHint'),
                controller: _confirmController,
              ),
              AppSpacing.hXXL,
              PrimaryButton(
                label: context.tr('auth.updatePassword'),
                isLoading: _isLoading,
                onPressed: _resetPassword,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
