import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/app_text_field.dart';
import 'auth_provider.dart';

/// Forgot password screen: the citizen enters their email and Supabase
/// sends a password-reset link. On success the screen shows a confirmation
/// message and lets the user return to login.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailController = TextEditingController();
  bool _isLoading = false;
  bool _sent = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _sendResetLink() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      _showError(AppLocalizations.translate('auth.enterEmail'));
      return;
    }
    setState(() => _isLoading = true);
    final repo = ref.read(authRepositoryProvider);
    final result = await repo.sendPasswordReset(email);
    if (!mounted) return;
    setState(() => _isLoading = false);
    result.when(
      success: (_) => setState(() => _sent = true),
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
      appBar: AppBar(title: Text(context.tr('auth.resetPassword'))),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.pagePadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppSpacing.hXL,
              Icon(
                Icons.lock_reset_outlined,
                size: 64,
                color: theme.colorScheme.primary,
              ),
              AppSpacing.hLG,
              Text(
                _sent
                    ? context.tr('auth.checkYourEmail')
                    : context.tr('auth.forgotTitle'),
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              AppSpacing.hSM,
              Text(
                _sent
                    ? context.tr('auth.resetLinkSent',
                        args: {'email': _emailController.text.trim()})
                    : context.tr('auth.forgotSubtitle'),
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.hXXL,
              if (!_sent) ...[
                AppTextField(
                  label: context.tr('auth.email'),
                  hint: context.tr('auth.emailHint'),
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  prefixIcon: Icons.alternate_email_rounded,
                ),
                AppSpacing.hXXL,
                PrimaryButton(
                  label: context.tr('auth.sendResetLink'),
                  isLoading: _isLoading,
                  onPressed: _sendResetLink,
                ),
              ] else ...[
                PrimaryButton(
                  label: context.tr('auth.backToLogin'),
                  onPressed: () => context.go(AppRoutes.login),
                ),
              ],
              AppSpacing.hXL,
              if (!_sent)
                TextButton(
                  onPressed: () => context.go(AppRoutes.login),
                  child: Text(context.tr('auth.backToLogin')),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
