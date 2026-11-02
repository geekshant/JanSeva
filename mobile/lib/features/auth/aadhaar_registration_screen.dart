import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/aadhaar.dart';
import '../../core/widgets/app_text_field.dart';
import '../../core/widgets/primary_button.dart';
import '../../data/models/aadhaar_kyc_record.dart';
import '../../data/repositories/repository_providers.dart';
import 'auth_provider.dart';
import 'session_scope.dart';

/// Aadhaar linking — an **optional** identity step.
///
/// Citizens can link their Aadhaar at any time from Profile; the router never
/// forces them onto this screen. When they choose to, [AadhaarKycRepository.submit]
/// is called and the record comes back `verified`.
///
/// Only the 12-digit number and the full name are collected. The server
/// stores a SHA-256 digest plus the masked number and returns the row as
/// `verified`; the raw value never persists anywhere.
class AadhaarRegistrationScreen extends ConsumerStatefulWidget {
  const AadhaarRegistrationScreen({super.key});

  @override
  ConsumerState<AadhaarRegistrationScreen> createState() =>
      _AadhaarRegistrationScreenState();
}

class _AadhaarRegistrationScreenState
    extends ConsumerState<AadhaarRegistrationScreen> {
  final _nameController = TextEditingController();
  final _aadhaarController = TextEditingController();

  bool _isLoading = false;
  bool _consent = false;
  // Field-level validation errors render under the relevant input; server /
  // general errors render in a full-width wrapping banner so they are never
  // truncated the way a long `errorText` under a single field can be.
  String? _nameError;
  String? _aadhaarError;
  String? _consentError;
  String? _formError;

  @override
  void initState() {
    super.initState();
    // Pre-fill the name from the profile created at signup so the citizen
    // usually only has to type the Aadhaar number.
    Future<void>(() async {
      final result = await ref
          .read(profileRepositoryProvider)
          .fetchCurrentProfile();
      if (!mounted || _nameController.text.isNotEmpty) return;
      final name = result.dataOrNull?.name;
      if (name != null && name.trim().isNotEmpty) {
        setState(() => _nameController.text = name.trim());
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _aadhaarController.dispose();
    super.dispose();
  }

  /// Keeps the field formatted as `XXXX XXXX XXXX`.
  void _onAadhaarChanged(String value) {
    final formatted = formatAadhaar(value);
    if (formatted != value) {
      _aadhaarController.value = TextEditingValue(
        text: formatted,
        selection: TextSelection.collapsed(offset: formatted.length),
      );
    }
    setState(() {
      _aadhaarError = null;
      _formError = null;
    });
  }

  void _onNameChanged(String value) {
    setState(() {
      _nameError = null;
      _formError = null;
    });
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    final aadhaar = _aadhaarController.text;

    if (name.length < 3) {
      setState(() => _nameError = 'aadhaar.error.nameTooShort');
      return;
    }
    if (!isValidAadhaar(aadhaar)) {
      setState(() => _aadhaarError = 'auth.error.aadhaarInvalid');
      return;
    }
    if (!_consent) {
      setState(() => _consentError = 'aadhaar.error.consentRequired');
      return;
    }

    setState(() {
      _isLoading = true;
      _nameError = null;
      _aadhaarError = null;
      _consentError = null;
      _formError = null;
    });

    final result = await ref.read(aadhaarKycRepositoryProvider).submit(
          aadhaar: aadhaar,
          fullName: name,
        );
    if (!mounted) return;

    if (result.isFailure) {
      setState(() {
        _isLoading = false;
        _formError = result.failureOrNull!.message;
      });
      return;
    }

    // Re-read the fresh server status: the citizen is only sent onwards once
    // `verified` is confirmed, never on the client's say-so.
    ref.invalidate(aadhaarVerificationProvider);
    AadhaarKycRecord? record;
    try {
      record = await ref.read(aadhaarVerificationProvider.future);
    } on Object {
      record = null;
    }
    if (!mounted) return;

    if (record == null || !record.isVerified) {
      setState(() {
        _isLoading = false;
        _formError = 'aadhaar.error.verifyRetry';
      });
      return;
    }

    setState(() => _isLoading = false);
    invalidateUserScopedData(ref);
    context.go(AppRoutes.home);
  }

  Future<void> _signOut() async {
    await ref.read(authRepositoryProvider).signOut();
    invalidateUserScopedData(ref);
    if (!mounted) return;
    context.go(AppConstants.enableAuth ? AppRoutes.login : AppRoutes.splash);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l = context.tr;

    return Scaffold(
      appBar: AppBar(
        title: Text(l('aadhaar.title')),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _signOut,
            child: Text(l('auth.signOut')),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.pagePadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppSpacing.hLG,
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  gradient: AppColors.brandGradient,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.badge_outlined,
                  size: 36,
                  color: Colors.white,
                ),
              ),
              AppSpacing.hMD,
              Text(
                l('aadhaar.heading'),
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              AppSpacing.hSM,
              Text(
                l('aadhaar.subtitle'),
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              AppSpacing.hXXL,
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color:
                      theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.lock_outline_rounded,
                      size: 18,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        l('aadhaar.privacyNote'),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              AppSpacing.hXXL,
              AppTextField(
                label: l('aadhaar.fullName'),
                hint: l('auth.fullNameHint'),
                controller: _nameController,
                prefixIcon: Icons.person_outline_rounded,
                errorText: _nameError == null
                    ? null
                    : AppLocalizations.translate(_nameError!),
                onChanged: _onNameChanged,
              ),
              AppSpacing.hLG,
              AppTextField(
                label: l('auth.aadhaar'),
                hint: l('auth.aadhaarHint'),
                controller: _aadhaarController,
                keyboardType: TextInputType.number,
                prefixIcon: Icons.badge_outlined,
                errorText: _aadhaarError == null
                    ? null
                    : AppLocalizations.translate(_aadhaarError!),
                onChanged: _onAadhaarChanged,
              ),
              AppSpacing.hSM,
              CheckboxListTile(
                value: _consent,
                onChanged: _isLoading
                    ? null
                    : (value) => setState(() {
                          _consent = value ?? false;
                          _consentError = null;
                          _formError = null;
                        }),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                dense: true,
                title: Text(
                  l('aadhaar.consent'),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
              if (_consentError != null)
                Padding(
                  padding: const EdgeInsets.only(left: AppSpacing.xs, top: 2),
                  child: Text(
                    AppLocalizations.translate(_consentError!),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.error,
                    ),
                  ),
                ),
              AppSpacing.hXL,
              if (_formError != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.md),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.errorContainer,
                      borderRadius: BorderRadius.circular(AppSpacing.sm),
                    ),
                    child: Text(
                      AppLocalizations.translate(_formError!),
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                ),
              PrimaryButton(
                label: l('aadhaar.submit'),
                isLoading: _isLoading,
                onPressed: _isLoading ? null : _submit,
              ),
              AppSpacing.hSM,
              TextButton(
                key: const Key('aadhaarSkipButton'),
                onPressed: _isLoading
                    ? null
                    : () {
                        invalidateUserScopedData(ref);
                        context.go(AppRoutes.home);
                      },
                child: Text(l('aadhaar.verifyLater')),
              ),
              AppSpacing.hLG,
              Text(
                l('aadhaar.optionalNote'),
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
