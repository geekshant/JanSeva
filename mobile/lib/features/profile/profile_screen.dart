import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_constants.dart';
import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/confirm_dialog.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../auth/auth_provider.dart';
import '../auth/session_scope.dart';
import '../safety/safety_eligibility_provider.dart';
import 'profile_dashboard_provider.dart';
import 'widgets/profile_header.dart';
import 'widgets/profile_info_section.dart';
import 'widgets/profile_menu_section.dart';
import 'widgets/profile_stats_section.dart';

/// Profile tab: citizen header (avatar, name, civic level, civic points),
/// statistics, and navigation to complaints, rewards, badges, contribution
/// history, notifications, settings, legal pages and logout.
///
/// All data is real Supabase data from [profileDashboardProvider];
/// points / level / verified counts are server-owned and read-only here.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Future<void> _signOut(BuildContext context, WidgetRef ref) async {
    final l = context.tr;
    final confirmed = await ConfirmDialog.show(
      context,
      title: l('profile.logoutTitle'),
      message: l('profile.logoutMessage'),
      confirmLabel: l('profile.logout'),
      destructive: true,
    );
    if (!confirmed || !context.mounted) return;

    // End the Supabase session; every per-citizen cache (including the
    // Aadhaar status) is dropped right after.
    await ref.read(authRepositoryProvider).signOut();

    // Drop everything cached for the previous citizen so the next login
    // starts clean.
    invalidateUserScopedData(ref);

    if (!context.mounted) return;
    context.go(AppConstants.enableAuth ? AppRoutes.login : AppRoutes.splash);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.tr;
    final dashboardAsync = ref.watch(profileDashboardProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l('profile.title'))),
      body: SafeArea(
        child: dashboardAsync.when(
          data: (data) => RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(profileDashboardProvider);
              await ref.read(profileDashboardProvider.future);
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 88),
              children: [
                ProfileHeader(
                  data: data,
                  onEdit: () => context.push(AppRoutes.editProfile),
                  onVerifyAadhaar: () =>
                      context.push(AppRoutes.aadhaarRegistration),
                ),
                AppSpacing.hXXL,
                ProfileInfoSection(
                  data: data,
                  onVerifyAadhaar: () =>
                      context.push(AppRoutes.aadhaarRegistration),
                ),
                AppSpacing.hXXL,
                ProfileStatsSection(data: data),
                AppSpacing.hXXL,
                ProfileMenuSection(
                  title: l('profile.myActivity'),
                  entries: [
                    // Women Safety entry — only shown to eligible (female) users.
                    if (ref.watch(womenSafetyEligibilityProvider).value ?? false)
                      ProfileMenuEntry(
                        icon: Icons.shield_rounded,
                        title: l('safety.title'),
                        subtitle: l('safety.menuDesc'),
                        onTap: () => context.push(AppRoutes.safety),
                      ),
                    ProfileMenuEntry(
                      icon: Icons.receipt_long_rounded,
                      title: l('profile.myComplaints'),
                      subtitle: l('profile.myComplaintsDesc'),
                      onTap: () => context.go(AppRoutes.complaints),
                    ),
                    ProfileMenuEntry(
                      icon: Icons.stars_rounded,
                      title: l('profile.rewards'),
                      subtitle: l('profile.rewardsDesc'),
                      onTap: () => context.push(AppRoutes.rewards),
                    ),
                    ProfileMenuEntry(
                      icon: Icons.leaderboard_rounded,
                      title: l('profile.leaderboard'),
                      subtitle: l('profile.leaderboardDesc'),
                      onTap: () => context.push(AppRoutes.leaderboard),
                    ),
                    ProfileMenuEntry(
                      icon: Icons.military_tech_rounded,
                      title: l('profile.badges'),
                      subtitle: l('profile.badgesDesc'),
                      onTap: () => context.push(AppRoutes.badges),
                    ),
                    ProfileMenuEntry(
                      icon: Icons.history_rounded,
                      title: l('profile.contributionHistory'),
                      subtitle: l('profile.contributionHistoryDesc'),
                      onTap: () => context.push(AppRoutes.contributionHistory),
                    ),
                    ProfileMenuEntry(
                      icon: Icons.notifications_rounded,
                      title: l('profile.notifications'),
                      onTap: () => context.push(AppRoutes.notifications),
                    ),
                  ],
                ),
                AppSpacing.hXXL,
                ProfileMenuSection(
                  title: l('profile.app'),
                  entries: [
                    ProfileMenuEntry(
                      icon: Icons.settings_rounded,
                      title: l('profile.settings'),
                      onTap: () => context.push(AppRoutes.settings),
                    ),
                    ProfileMenuEntry(
                      icon: Icons.tune_rounded,
                      title: l('profile.preferences.title'),
                      subtitle: l('profile.preferences.menuDesc'),
                      onTap: () => context.push(AppRoutes.preferences),
                    ),
                    ProfileMenuEntry(
                      icon: Icons.shield_outlined,
                      title: l('privacySettings.title'),
                      subtitle: l('privacySettings.menuDesc'),
                      onTap: () => context.push(AppRoutes.privacySettings),
                    ),
                    ProfileMenuEntry(
                      icon: Icons.help_outline_rounded,
                      title: l('profile.helpSupport'),
                      onTap: () => context.push(AppRoutes.helpSupport),
                    ),
                    ProfileMenuEntry(
                      icon: Icons.privacy_tip_rounded,
                      title: l('profile.privacyPolicy'),
                      onTap: () => context.push(AppRoutes.privacyPolicy),
                    ),
                    ProfileMenuEntry(
                      icon: Icons.description_rounded,
                      title: l('profile.terms'),
                      onTap: () => context.push(AppRoutes.termsConditions),
                    ),
                  ],
                ),
                AppSpacing.hXXL,
                ProfileMenuSection(
                  title: l('profile.account'),
                  entries: [
                    ProfileMenuEntry(
                      icon: Icons.logout_rounded,
                      title: l('profile.logout'),
                      danger: true,
                      onTap: () => _signOut(context, ref),
                    ),
                  ],
                ),
                AppSpacing.hXXL,
                Text(
                  l('profile.appVersion',
                      args: {'version': AppConstants.appVersion}),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          loading: () => LoadingView(message: l('profile.loadingProfile')),
          error: (error, _) => ErrorView(
            title: l('profile.couldLoadProfile'),
            message: error.toString(),
            onRetry: () => ref.invalidate(profileDashboardProvider),
          ),
        ),
      ),
    );
  }
}
