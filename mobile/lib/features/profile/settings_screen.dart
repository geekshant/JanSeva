import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/i18n/app_localizations.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../../data/repositories/repository_providers.dart';
import 'profile_dashboard_provider.dart';

/// App settings: account summary (read-only), legal pages, and about info.
///
/// Points / level / reward history are intentionally absent — they are
/// server-owned and not user-editable.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  /// Changes the app language and syncs the preference to the user's profile
  /// on the server so it persists across devices and sessions.
  Future<void> _changeLanguage(WidgetRef ref, String code) async {
    await ref.read(localeProvider.notifier).setLocale(Locale(code));
    // Best-effort sync to profile — don't block the UI on a failure.
    final profileRepo = ref.read(profileRepositoryProvider);
    await profileRepo.updateProfile(preferredLanguage: code);
    // Refresh the profile dashboard so the new language is reflected.
    ref.invalidate(profileDashboardProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final l = context.tr;
    final dashboardAsync = ref.watch(profileDashboardProvider);
    final locale = ref.watch(localeProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l('settings.title'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
          children: [
            // ---- Language selector ----
            Text(
              l('settings.language'),
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            AppSpacing.hMD,
            Container(
              decoration: BoxDecoration(
                color: colors.surfaceContainer,
                borderRadius: AppRadius.rLG,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: _LanguageOption(
                      label: l('settings.english'),
                      isSelected: locale.languageCode == 'en',
                      onTap: () => _changeLanguage(ref, 'en'),
                    ),
                  ),
                  Expanded(
                    child: _LanguageOption(
                      label: l('settings.hindi'),
                      isSelected: locale.languageCode == 'hi',
                      onTap: () => _changeLanguage(ref, 'hi'),
                    ),
                  ),
                ],
              ),
            ),
            AppSpacing.hXXL,
            dashboardAsync.when(
              data: (data) => Container(
                padding: AppSpacing.cardPadding,
                decoration: BoxDecoration(
                  color: colors.surfaceContainer,
                  borderRadius: AppRadius.rLG,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l('settings.account'),
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    AppSpacing.hMD,
                    _InfoRow(
                      icon: Icons.person_outline_rounded,
                      label: l('settings.name'),
                      value: data.profile.name,
                    ),
                    if (data.profile.email != null &&
                        data.profile.email!.isNotEmpty) ...[
                      AppSpacing.hSM,
                      _InfoRow(
                        icon: Icons.alternate_email_rounded,
                        label: l('settings.email'),
                        value: data.profile.email!,
                      ),
                    ],
                    if (data.profile.phone != null &&
                        data.profile.phone!.isNotEmpty) ...[
                      AppSpacing.hSM,
                      _InfoRow(
                        icon: Icons.phone_outlined,
                        label: l('settings.phone'),
                        value: data.profile.phone!,
                      ),
                    ],
                    AppSpacing.hSM,
                    _InfoRow(
                      icon: Icons.military_tech_rounded,
                      label: l('settings.civicLevel'),
                      value: data.levelLabel,
                    ),
                    AppSpacing.hLG,
                    AppButton(
                      label: l('settings.editProfile'),
                      icon: Icons.edit_rounded,
                      variant: AppButtonVariant.tonal,
                      isExpanded: true,
                      onPressed: () => context.push(AppRoutes.editProfile),
                    ),
                    AppSpacing.hSM,
                    AppButton(
                      label: l('profile.preferences.title'),
                      icon: Icons.tune_rounded,
                      variant: AppButtonVariant.outlined,
                      isExpanded: true,
                      onPressed: () => context.push(AppRoutes.preferences),
                    ),
                  ],
                ),
              ),
              loading: () => LoadingView(message: l('settings.loadingAccount')),
              error: (error, _) => ErrorView(
                message: l('settings.couldLoadAccount'),
                onRetry: () => ref.invalidate(profileDashboardProvider),
              ),
            ),
            AppSpacing.hXXL,
            Text(
              l('settings.legal'),
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            AppSpacing.hMD,
            Container(
              decoration: BoxDecoration(
                color: colors.surfaceContainer,
                borderRadius: AppRadius.rLG,
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.privacy_tip_rounded),
                    title: Text(l('profile.privacyPolicy')),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => context.push(AppRoutes.privacyPolicy),
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.description_rounded),
                    title: Text(l('profile.terms')),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => context.push(AppRoutes.termsConditions),
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.help_outline_rounded),
                    title: Text(l('profile.helpSupport')),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: () => context.push(AppRoutes.helpSupport),
                  ),
                ],
              ),
            ),
            AppSpacing.hXXL,
            Text(
              l('settings.about'),
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            AppSpacing.hMD,
            Container(
              padding: AppSpacing.cardPadding,
              decoration: BoxDecoration(
                color: colors.surfaceContainer,
                borderRadius: AppRadius.rLG,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l('app.name'),
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    l('app.tagline'),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                  AppSpacing.hSM,
                  Text(
                    l('settings.version', args: {
                      'version': AppConstants.appVersion,
                    }),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LanguageOption extends StatelessWidget {
  const _LanguageOption({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Material(
      color: isSelected
          ? colors.primary.withValues(alpha: 0.12)
          : Colors.transparent,
      borderRadius: AppRadius.rLG,
      child: InkWell(
        borderRadius: AppRadius.rLG,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isSelected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
                size: 18,
                color: isSelected ? colors.primary : colors.onSurfaceVariant,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                      color: isSelected ? colors.primary : colors.onSurface,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Row(
      children: [
        Icon(icon, size: 18, color: colors.onSurfaceVariant),
        AppSpacing.wMD,
        Expanded(
          child: RichText(
            text: TextSpan(
              style: theme.textTheme.bodyMedium,
              children: [
                TextSpan(
                  text: '$label: ',
                  style: TextStyle(color: colors.onSurfaceVariant),
                ),
                TextSpan(
                  text: value,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
