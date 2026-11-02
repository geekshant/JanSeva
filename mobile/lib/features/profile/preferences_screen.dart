import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../../data/models/profile.dart';
import '../../data/repositories/repository_providers.dart';
import 'profile_dashboard_provider.dart';

/// Notification preferences and privacy settings for the signed-in citizen.
///
/// Every toggle maps to a `profiles` column added by
/// `database/16_profile_preferences.sql` and is persisted immediately, so the
/// settings follow the citizen across devices.
class PreferencesScreen extends ConsumerStatefulWidget {
  const PreferencesScreen({super.key});

  @override
  ConsumerState<PreferencesScreen> createState() => _PreferencesScreenState();
}

class _PreferencesScreenState extends ConsumerState<PreferencesScreen> {
  bool _notifyPush = true;
  bool _notifyEmail = true;
  bool _notifyInApp = true;
  bool _showLeaderboard = true;
  bool _showWard = true;
  bool _seeded = false;
  bool _saving = false;

  void _seedFrom(Profile profile) {
    if (_seeded) return;
    _seeded = true;
    _notifyPush = profile.notifyPush;
    _notifyEmail = profile.notifyEmail;
    _notifyInApp = profile.notifyInApp;
    _showLeaderboard = profile.privacyShowLeaderboard;
    _showWard = profile.privacyShowWard;
  }

  Future<void> _persist() async {
    setState(() => _saving = true);
    final result =
        await ref.read(profileRepositoryProvider).updatePreferences(
              notifyPush: _notifyPush,
              notifyEmail: _notifyEmail,
              notifyInApp: _notifyInApp,
              privacyShowLeaderboard: _showLeaderboard,
              privacyShowWard: _showWard,
            );
    if (!mounted) return;
    setState(() => _saving = false);

    final l = context.tr;
    if (result.isFailure) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(l('profile.preferences.saveFailed')),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
      return;
    }

    ref.invalidate(profileDashboardProvider);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(l('profile.preferences.saved'))),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final l = context.tr;
    final dashboardAsync = ref.watch(profileDashboardProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l('profile.preferences.title'))),
      body: SafeArea(
        child: dashboardAsync.when(
          data: (data) {
            _seedFrom(data.profile);
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
              children: [
                _sectionTitle(l('profile.preferences.notifications')),
                AppSpacing.hSM,
                _card(
                  children: [
                    _toggle(
                      key: const Key('prefPush'),
                      icon: Icons.notifications_active_outlined,
                      title: l('profile.preferences.push'),
                      subtitle: l('profile.preferences.pushDesc'),
                      value: _notifyPush,
                      onChanged: (v) => _onChanged(() => _notifyPush = v),
                    ),
                    _toggle(
                      key: const Key('prefInApp'),
                      icon: Icons.inbox_outlined,
                      title: l('profile.preferences.inApp'),
                      subtitle: l('profile.preferences.inAppDesc'),
                      value: _notifyInApp,
                      onChanged: (v) => _onChanged(() => _notifyInApp = v),
                    ),
                    _toggle(
                      key: const Key('prefEmail'),
                      icon: Icons.mail_outline_rounded,
                      title: l('profile.preferences.email'),
                      subtitle: l('profile.preferences.emailDesc'),
                      value: _notifyEmail,
                      onChanged: (v) => _onChanged(() => _notifyEmail = v),
                    ),
                  ],
                ),
                AppSpacing.hXXL,
                _sectionTitle(l('profile.preferences.privacy')),
                AppSpacing.hSM,
                _card(
                  children: [
                    _toggle(
                      key: const Key('prefLeaderboard'),
                      icon: Icons.leaderboard_rounded,
                      title: l('profile.preferences.showLeaderboard'),
                      subtitle: l('profile.preferences.showLeaderboardDesc'),
                      value: _showLeaderboard,
                      onChanged: (v) =>
                          _onChanged(() => _showLeaderboard = v),
                    ),
                    _toggle(
                      key: const Key('prefShowWard'),
                      icon: Icons.location_on_outlined,
                      title: l('profile.preferences.showWard'),
                      subtitle: l('profile.preferences.showWardDesc'),
                      value: _showWard,
                      onChanged: (v) => _onChanged(() => _showWard = v),
                    ),
                  ],
                ),
                if (_saving) ...[
                  AppSpacing.hMD,
                  Center(
                    child: SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: colors.primary,
                      ),
                    ),
                  ),
                ],
              ],
            );
          },
          loading: () => LoadingView(
            message: l('profile.preferences.loading'),
          ),
          error: (error, _) => ErrorView(
            message: error.toString(),
            onRetry: () => ref.invalidate(profileDashboardProvider),
          ),
        ),
      ),
    );
  }

  void _onChanged(void Function() update) {
    setState(update);
    _persist();
  }

  Widget _sectionTitle(String text) {
    final theme = Theme.of(context);
    return Text(
      text,
      style: theme.textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _card({required List<Widget> children}) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(children: children),
    );
  }

  Widget _toggle({
    required Key key,
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final theme = Theme.of(context);
    return SwitchListTile(
      key: key,
      secondary: Icon(icon, color: theme.colorScheme.onSurfaceVariant),
      title: Text(title, style: theme.textTheme.bodyMedium),
      subtitle: Text(
        subtitle,
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
      ),
      value: value,
      onChanged: _saving ? null : onChanged,
    );
  }
}
