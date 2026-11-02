import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/accessibility/accessibility_controller.dart';
import '../../core/errors/result.dart';
import '../../core/i18n/app_localizations.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../../data/models/profile.dart';
import '../../data/repositories/repository_providers.dart';
import 'profile_dashboard_provider.dart';

/// Comprehensive Privacy & Settings screen with 8 sections:
///   1. Profile Visibility
///   2. Location Sharing
///   3. Aadhaar Visibility
///   4. Notifications
///   5. Language & Region
///   6. App Permissions
///   7. Data & Account Controls
///   8. Accessibility
///
/// All settings persist to the database immediately (profile-level settings
/// to `profiles`, accessibility to `user_settings` via RPC + locally via
/// SharedPreferences, per-category notifications to `notification_preferences`).
class PrivacySettingsScreen extends ConsumerStatefulWidget {
  const PrivacySettingsScreen({super.key});

  @override
  ConsumerState<PrivacySettingsScreen> createState() =>
      _PrivacySettingsScreenState();
}

class _PrivacySettingsScreenState extends ConsumerState<PrivacySettingsScreen> {
  // Local mirrors of server-persisted state (seeded once from the profile).
  bool _seeded = false;
  bool _saving = false;

  // Profile-level settings
  String _profileVisibility = 'public';
  bool _showNameOnVerifications = true;
  bool _shareAadhaarWithOfficials = false;
  bool _sharePreciseLocation = true;
  String _locationPrecision = 'exact';
  bool _shareLocationWithOfficials = true;
  bool _includeLocationOnComplaints = true;
  bool _notifyPush = true;
  bool _notifyEmail = true;
  bool _notifyInApp = true;
  bool _privacyShowLeaderboard = true;
  bool _privacyShowWard = true;
  String? _deletionRequestedAt;

  // Accessibility (local-only, persisted via SharedPreferences)
  double _fontScale = 1.0;
  bool _highContrast = false;
  bool _reduceMotion = false;
  bool _screenReaderHints = false;
  bool _largerTouchTargets = false;

  void _seedFrom(Profile profile) {
    if (_seeded) return;
    _seeded = true;
    _profileVisibility = profile.profileVisibility;
    _showNameOnVerifications = profile.showNameOnVerifications;
    _shareAadhaarWithOfficials = profile.shareAadhaarWithOfficials;
    _sharePreciseLocation = profile.sharePreciseLocation;
    _locationPrecision = profile.locationPrecision;
    _shareLocationWithOfficials = profile.shareLocationWithOfficials;
    _includeLocationOnComplaints = profile.includeLocationOnComplaints;
    _notifyPush = profile.notifyPush;
    _notifyEmail = profile.notifyEmail;
    _notifyInApp = profile.notifyInApp;
    _privacyShowLeaderboard = profile.privacyShowLeaderboard;
    _privacyShowWard = profile.privacyShowWard;
    _deletionRequestedAt = profile.deletionRequestedAt;
  }

  void _seedAccessibility(AccessibilityState state) {
    _fontScale = state.fontScale;
    _highContrast = state.highContrast;
    _reduceMotion = state.reduceMotion;
    _screenReaderHints = state.screenReaderHints;
    _largerTouchTargets = state.largerTouchTargets;
  }

  // ---------------------------------------------------------------------------
  // Persist helpers
  // ---------------------------------------------------------------------------

  Future<void> _persistProfileField(String fieldKey, dynamic value) async {
    setState(() => _saving = true);
    final repo = ref.read(privacySettingsRepositoryProvider);
    Result<Profile> result;
    switch (fieldKey) {
      case 'profile_visibility':
        result = await repo.updatePrivacySettings(profileVisibility: value as String);
      case 'show_name_on_verifications':
        result = await repo.updatePrivacySettings(showNameOnVerifications: value as bool);
      case 'share_aadhaar_with_officials':
        result = await repo.updatePrivacySettings(shareAadhaarWithOfficials: value as bool);
      case 'share_precise_location':
        result = await repo.updatePrivacySettings(sharePreciseLocation: value as bool);
      case 'location_precision':
        result = await repo.updatePrivacySettings(locationPrecision: value as String);
      case 'share_location_with_officials':
        result = await repo.updatePrivacySettings(shareLocationWithOfficials: value as bool);
      case 'include_location_on_complaints':
        result = await repo.updatePrivacySettings(includeLocationOnComplaints: value as bool);
      case 'notify_push':
        result = await repo.updatePrivacySettings(notifyPush: value as bool);
      case 'notify_email':
        result = await repo.updatePrivacySettings(notifyEmail: value as bool);
      case 'notify_in_app':
        result = await repo.updatePrivacySettings(notifyInApp: value as bool);
      case 'privacy_show_leaderboard':
        result = await repo.updatePrivacySettings(privacyShowLeaderboard: value as bool);
      case 'privacy_show_ward':
        result = await repo.updatePrivacySettings(privacyShowWard: value as bool);
      default:
        return;
    }
    if (!mounted) return;
    setState(() => _saving = false);
    final l = context.tr;
    if (result.isFailure) {
      _showError(l('privacy.saveFailed'));
    } else {
      ref.invalidate(profileDashboardProvider);
      _showSuccess(l('privacy.saved'));
    }
  }

  void _showSuccess(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: Theme.of(context).colorScheme.error,
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Destructive action handlers
  // ---------------------------------------------------------------------------

  Future<void> _handleClearLocation() async {
    final l = context.tr;
    final confirmed = await _showConfirmDialog(
      title: l('privacy.location.clearHistory'),
      message: l('privacy.location.clearHistoryConfirm', args: {'count': '?'}),
    );
    if (confirmed != true) return;
    setState(() => _saving = true);
    final result = await ref.read(privacySettingsRepositoryProvider).clearLocationHistory();
    if (!mounted) return;
    setState(() => _saving = false);
    if (result.isFailure) {
      _showError(l('privacy.saveFailed'));
    } else {
      final count = result.dataOrNull ?? 0;
      _showSuccess(count > 0
          ? l('privacy.location.clearHistorySuccess', args: {'count': count})
          : l('privacy.location.clearHistoryNone'));
    }
  }

  Future<void> _handleRequestDeletion() async {
    final l = context.tr;
    final confirmed = await _showConfirmDialog(
      title: l('privacy.data.deleteAccount'),
      message: l('privacy.data.deleteAccountConfirm'),
    );
    if (confirmed != true) return;
    setState(() => _saving = true);
    final result = await ref.read(privacySettingsRepositoryProvider).requestAccountDeletion();
    if (!mounted) return;
    setState(() => _saving = false);
    if (result.isFailure) {
      _showError(l('privacy.saveFailed'));
    } else {
      setState(() => _deletionRequestedAt = result.dataOrNull?.deletionRequestedAt);
      ref.invalidate(profileDashboardProvider);
      final date = result.dataOrNull?.deletionRequestedAt != null
          ? DateTime.parse(result.dataOrNull!.deletionRequestedAt!).add(const Duration(days: 30)).toString().split(' ')[0]
          : '?';
      _showSuccess(l('privacy.data.deleteRequested', args: {'date': date}));
    }
  }

  Future<void> _handleCancelDeletion() async {
    final l = context.tr;
    final result = await ref.read(privacySettingsRepositoryProvider).cancelAccountDeletion();
    if (!mounted) return;
    if (result.isFailure) {
      _showError(l('privacy.saveFailed'));
    } else {
      setState(() => _deletionRequestedAt = null);
      ref.invalidate(profileDashboardProvider);
      _showSuccess(l('privacy.data.cancelDeletionSuccess'));
    }
  }

  Future<void> _handleLogoutAll() async {
    final l = context.tr;
    final confirmed = await _showConfirmDialog(
      title: l('privacy.data.logoutAll'),
      message: l('privacy.data.logoutAllConfirm'),
    );
    if (confirmed != true) return;
    setState(() => _saving = true);
    final result = await ref.read(privacySettingsRepositoryProvider).logoutAllDevices();
    if (!mounted) return;
    setState(() => _saving = false);
    if (result.isFailure) {
      _showError(l('privacy.saveFailed'));
    } else {
      _showSuccess(l('privacy.data.logoutAllSuccess'));
    }
  }

  Future<void> _handleDownloadData() async {
    final l = context.tr;
    setState(() => _saving = true);
    _showSuccess(l('privacy.data.downloading'));
    final result = await ref.read(privacySettingsRepositoryProvider).downloadMyData();
    if (!mounted) return;
    setState(() => _saving = false);
    if (result.isFailure) {
      _showError(l('privacy.data.downloadFailed'));
    } else {
      _showSuccess(l('privacy.data.downloadSuccess'));
    }
  }

  Future<bool?> _showConfirmDialog({required String title, required String message}) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(context.tr('widget.cancel'))),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(context.tr('widget.confirm'))),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final l = context.tr;
    final dashboardAsync = ref.watch(profileDashboardProvider);
    final accessibilityState = ref.watch(accessibilityProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l('privacySettings.title'))),
      body: SafeArea(
        child: dashboardAsync.when(
          data: (data) {
            _seedFrom(data.profile);
            if (!_seeded) _seedAccessibility(accessibilityState);
            return _buildContent(context, l);
          },
          loading: () => LoadingView(message: l('privacy.loading')),
          error: (error, _) => ErrorView(
            message: l('privacy.loadFailed'),
            onRetry: () => ref.invalidate(profileDashboardProvider),
          ),
        ),
      ),
    );
  }

  Widget _buildContent(BuildContext context, String Function(String key, {Map<String, dynamic> args}) l) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
      children: [
        // ---- Section 1: Profile Visibility ----
        _sectionTitle(l('privacy.profileVisibility.title')),
        _sectionDesc(l('privacy.profileVisibility.desc')),
        AppSpacing.hSM,
        _card(children: [
          // Visibility level radio options
          RadioGroup<String>(
            groupValue: _profileVisibility,
            onChanged: (v) => _onProfileChanged('profile_visibility', v),
            child: Column(
              children: [
                _radioTile(
                  title: l('privacy.profileVisibility.public'),
                  subtitle: l('privacy.profileVisibility.publicDesc'),
                  value: 'public',
                ),
                _radioTile(
                  title: l('privacy.profileVisibility.verifiedUsers'),
                  subtitle: l('privacy.profileVisibility.verifiedUsersDesc'),
                  value: 'verified_users',
                ),
                _radioTile(
                  title: l('privacy.profileVisibility.officialsOnly'),
                  subtitle: l('privacy.profileVisibility.officialsOnlyDesc'),
                  value: 'officials_only',
                ),
                _radioTile(
                  title: l('privacy.profileVisibility.private'),
                  subtitle: l('privacy.profileVisibility.privateDesc'),
                  value: 'private',
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          _toggle(
            icon: Icons.badge_outlined,
            title: l('privacy.profileVisibility.showNameOnVerifications'),
            subtitle: l('privacy.profileVisibility.showNameOnVerificationsDesc'),
            value: _showNameOnVerifications,
            onChanged: (v) => _onProfileChanged('show_name_on_verifications', v),
          ),
          _toggle(
            icon: Icons.leaderboard_rounded,
            title: l('profile.preferences.showLeaderboard'),
            subtitle: l('profile.preferences.showLeaderboardDesc'),
            value: _privacyShowLeaderboard,
            onChanged: (v) => _onProfileChanged('privacy_show_leaderboard', v),
          ),
          _toggle(
            icon: Icons.location_on_outlined,
            title: l('privacy.location.sharePrecise'),
            subtitle: l('privacy.location.sharePreciseDesc'),
            value: _privacyShowWard,
            onChanged: (v) => _onProfileChanged('privacy_show_ward', v),
          ),
        ]),
        AppSpacing.hXXL,

        // ---- Section 2: Location Sharing ----
        _sectionTitle(l('privacy.location.title')),
        _sectionDesc(l('privacy.location.desc')),
        AppSpacing.hSM,
        _card(children: [
          _toggle(
            icon: Icons.gps_fixed,
            title: l('privacy.location.sharePrecise'),
            subtitle: l('privacy.location.sharePreciseDesc'),
            value: _sharePreciseLocation,
            onChanged: (v) => _onProfileChanged('share_precise_location', v),
          ),
          // Location precision dropdown
          ListTile(
            leading: const Icon(Icons.precision_manufacturing_outlined),
            title: Text(l('privacy.location.precision'), style: Theme.of(context).textTheme.bodyMedium),
            trailing: DropdownButton<String>(
              value: _locationPrecision,
              items: [
                DropdownMenuItem(value: 'exact', child: Text(l('privacy.location.precisionExact'))),
                DropdownMenuItem(value: 'block', child: Text(l('privacy.location.precisionBlock'))),
                DropdownMenuItem(value: 'ward', child: Text(l('privacy.location.precisionWard'))),
                DropdownMenuItem(value: 'city', child: Text(l('privacy.location.precisionCity'))),
              ],
              onChanged: (v) => _onProfileChanged('location_precision', v),
            ),
          ),
          _toggle(
            icon: Icons.verified_user_outlined,
            title: l('privacy.location.shareWithOfficials'),
            subtitle: l('privacy.location.shareWithOfficialsDesc'),
            value: _shareLocationWithOfficials,
            onChanged: (v) => _onProfileChanged('share_location_with_officials', v),
          ),
          _toggle(
            icon: Icons.add_location_alt_outlined,
            title: l('privacy.location.includeOnComplaints'),
            subtitle: l('privacy.location.includeOnComplaintsDesc'),
            value: _includeLocationOnComplaints,
            onChanged: (v) => _onProfileChanged('include_location_on_complaints', v),
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.clear, color: Colors.red),
            title: Text(l('privacy.location.clearHistory'), style: const TextStyle(color: Colors.red)),
            subtitle: Text(l('privacy.location.clearHistoryDesc')),
            onTap: _handleClearLocation,
          ),
        ]),
        AppSpacing.hXXL,

        // ---- Section 3: Aadhaar Visibility ----
        _sectionTitle(l('privacy.aadhaar.title')),
        _sectionDesc(l('privacy.aadhaar.desc')),
        AppSpacing.hSM,
        _card(children: [
          ListTile(
            leading: const Icon(Icons.shield_outlined),
            title: Text(l('privacy.aadhaar.masked'), style: Theme.of(context).textTheme.bodyMedium),
            subtitle: Text(l('privacy.aadhaar.maskedDesc')),
            trailing: const Icon(Icons.lock, color: Colors.green),
          ),
          _toggle(
            icon: Icons.verified_user_outlined,
            title: l('privacy.aadhaar.shareWithOfficials'),
            subtitle: l('privacy.aadhaar.shareWithOfficialsDesc'),
            value: _shareAadhaarWithOfficials,
            onChanged: (v) => _onProfileChanged('share_aadhaar_with_officials', v),
          ),
        ]),
        AppSpacing.hXXL,

        // ---- Section 4: Notifications ----
        _sectionTitle(l('privacy.notifications.title')),
        _sectionDesc(l('privacy.notifications.desc')),
        AppSpacing.hSM,
        _card(children: [
          _toggle(
            icon: Icons.notifications_active_outlined,
            title: l('privacy.notifications.push'),
            subtitle: l('privacy.notifications.muteAllDesc'),
            value: _notifyPush,
            onChanged: (v) => _onProfileChanged('notify_push', v),
          ),
          _toggle(
            icon: Icons.inbox_outlined,
            title: l('privacy.notifications.inApp'),
            subtitle: '',
            value: _notifyInApp,
            onChanged: (v) => _onProfileChanged('notify_in_app', v),
          ),
          _toggle(
            icon: Icons.mail_outline_rounded,
            title: l('privacy.notifications.email'),
            subtitle: '',
            value: _notifyEmail,
            onChanged: (v) => _onProfileChanged('notify_email', v),
          ),
        ]),
        AppSpacing.hXXL,

        // ---- Section 5: Language & Region ----
        _sectionTitle(l('privacy.language.title')),
        _sectionDesc(l('privacy.language.desc')),
        AppSpacing.hSM,
        _card(children: [
          ListTile(
            leading: const Icon(Icons.language),
            title: Text(l('privacy.language.selectLanguage'), style: Theme.of(context).textTheme.bodyMedium),
            trailing: DropdownButton<Locale>(
              value: ref.watch(localeProvider),
              items: [
                DropdownMenuItem(value: const Locale('en'), child: Text(l('privacy.language.english'))),
                DropdownMenuItem(value: const Locale('hi'), child: Text(l('privacy.language.hindi'))),
              ],
              onChanged: (locale) {
                if (locale != null) {
                  ref.read(localeProvider.notifier).setLocale(locale);
                }
              },
            ),
          ),
        ]),
        AppSpacing.hXXL,

        // ---- Section 6: App Permissions ----
        _sectionTitle(l('privacy.permissions.title')),
        _sectionDesc(l('privacy.permissions.desc')),
        AppSpacing.hSM,
        _card(children: [
          _permissionTile(Icons.camera_alt_outlined, l('privacy.permissions.camera'), l('privacy.permissions.cameraDesc')),
          _permissionTile(Icons.location_on_outlined, l('privacy.permissions.location'), l('privacy.permissions.locationDesc')),
          _permissionTile(Icons.photo_library_outlined, l('privacy.permissions.storage'), l('privacy.permissions.storageDesc')),
          _permissionTile(Icons.notifications_outlined, l('privacy.permissions.notifications'), l('privacy.permissions.notificationsDesc')),
        ]),
        AppSpacing.hXXL,

        // ---- Section 7: Data & Account ----
        _sectionTitle(l('privacy.data.title')),
        _sectionDesc(l('privacy.data.desc')),
        AppSpacing.hSM,
        if (_deletionRequestedAt != null) ...[
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.amber),
            ),
            child: Row(
              children: [
                const Icon(Icons.warning, color: Colors.amber),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    l('privacy.data.deleteRequested', args: {
                      'date': DateTime.tryParse(_deletionRequestedAt!)?.add(const Duration(days: 30)).toString().split(' ')[0] ?? '?',
                    }),
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
                TextButton(onPressed: _handleCancelDeletion, child: Text(l('privacy.data.cancelDeletion'))),
              ],
            ),
          ),
          AppSpacing.hSM,
        ],
        _card(children: [
          ListTile(
            leading: const Icon(Icons.download),
            title: Text(l('privacy.data.download'), style: Theme.of(context).textTheme.bodyMedium),
            subtitle: Text(l('privacy.data.downloadDesc')),
            onTap: _handleDownloadData,
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.orange),
            title: Text(l('privacy.data.logoutAll'), style: const TextStyle(color: Colors.orange)),
            subtitle: Text(l('privacy.data.logoutAllDesc')),
            onTap: _handleLogoutAll,
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.delete_forever, color: Colors.red),
            title: Text(l('privacy.data.deleteAccount'), style: const TextStyle(color: Colors.red)),
            subtitle: Text(l('privacy.data.deleteAccountDesc')),
            onTap: _handleRequestDeletion,
          ),
        ]),
        AppSpacing.hXXL,

        // ---- Section 8: Accessibility ----
        _sectionTitle(l('privacy.accessibility.title')),
        _sectionDesc(l('privacy.accessibility.desc')),
        AppSpacing.hSM,
        _card(children: [
          // Font scale slider
          ListTile(
            leading: const Icon(Icons.text_fields),
            title: Text(l('privacy.accessibility.fontScale'), style: Theme.of(context).textTheme.bodyMedium),
            trailing: DropdownButton<double>(
              value: _fontScale,
              items: [
                DropdownMenuItem(value: 0.85, child: Text(l('privacy.accessibility.fontScaleSmall'))),
                DropdownMenuItem(value: 1.0, child: Text(l('privacy.accessibility.fontScaleMedium'))),
                DropdownMenuItem(value: 1.15, child: Text(l('privacy.accessibility.fontScaleLarge'))),
                DropdownMenuItem(value: 1.3, child: Text(l('privacy.accessibility.fontScaleExtraLarge'))),
              ],
              onChanged: (v) {
                if (v == null) return;
                setState(() => _fontScale = v);
                ref.read(accessibilityProvider.notifier).setFontScale(v);
              },
            ),
          ),
          _toggle(
            icon: Icons.contrast,
            title: l('privacy.accessibility.highContrast'),
            subtitle: l('privacy.accessibility.highContrastDesc'),
            value: _highContrast,
            onChanged: (v) {
              setState(() => _highContrast = v);
              ref.read(accessibilityProvider.notifier).toggleHighContrast();
            },
          ),
          _toggle(
            icon: Icons.motion_photos_off,
            title: l('privacy.accessibility.reduceMotion'),
            subtitle: l('privacy.accessibility.reduceMotionDesc'),
            value: _reduceMotion,
            onChanged: (v) {
              setState(() => _reduceMotion = v);
              ref.read(accessibilityProvider.notifier).toggleReduceMotion();
            },
          ),
          _toggle(
            icon: Icons.accessibility_new,
            title: l('privacy.accessibility.screenReaderHints'),
            subtitle: l('privacy.accessibility.screenReaderHintsDesc'),
            value: _screenReaderHints,
            onChanged: (v) {
              setState(() => _screenReaderHints = v);
              ref.read(accessibilityProvider.notifier).toggleScreenReaderHints();
            },
          ),
          _toggle(
            icon: Icons.touch_app,
            title: l('privacy.accessibility.largerTouchTargets'),
            subtitle: l('privacy.accessibility.largerTouchTargetsDesc'),
            value: _largerTouchTargets,
            onChanged: (v) {
              setState(() => _largerTouchTargets = v);
              ref.read(accessibilityProvider.notifier).toggleLargerTouchTargets();
            },
          ),
        ]),
        if (_saving) ...[
          AppSpacing.hMD,
          Center(
            child: SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
        ],
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  void _onProfileChanged(String key, dynamic value) {
    setState(() {
      switch (key) {
        case 'profile_visibility':
          _profileVisibility = value as String;
        case 'show_name_on_verifications':
          _showNameOnVerifications = value as bool;
        case 'share_aadhaar_with_officials':
          _shareAadhaarWithOfficials = value as bool;
        case 'share_precise_location':
          _sharePreciseLocation = value as bool;
        case 'location_precision':
          _locationPrecision = value as String;
        case 'share_location_with_officials':
          _shareLocationWithOfficials = value as bool;
        case 'include_location_on_complaints':
          _includeLocationOnComplaints = value as bool;
        case 'notify_push':
          _notifyPush = value as bool;
        case 'notify_email':
          _notifyEmail = value as bool;
        case 'notify_in_app':
          _notifyInApp = value as bool;
        case 'privacy_show_leaderboard':
          _privacyShowLeaderboard = value as bool;
        case 'privacy_show_ward':
          _privacyShowWard = value as bool;
      }
    });
    _persistProfileField(key, value);
  }

  Widget _sectionTitle(String text) {
    return Text(
      text,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
    );
  }

  Widget _sectionDesc(String text) {
    return Text(
      text,
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.onSurfaceVariant,
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
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final theme = Theme.of(context);
    return SwitchListTile(
      secondary: Icon(icon, color: theme.colorScheme.onSurfaceVariant),
      title: Text(title, style: theme.textTheme.bodyMedium),
      subtitle: subtitle.isEmpty ? null : Text(
        subtitle,
        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
      ),
      value: value,
      onChanged: _saving ? null : onChanged,
    );
  }

  Widget _radioTile({
    required String title,
    required String subtitle,
    required String value,
  }) {
    final theme = Theme.of(context);
    return RadioListTile<String>(
      value: value,
      enabled: !_saving,
      title: Text(title, style: theme.textTheme.bodyMedium),
      subtitle: Text(
        subtitle,
        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
      ),
    );
  }

  Widget _permissionTile(IconData icon, String title, String subtitle) {
    return ListTile(
      leading: Icon(icon, color: Theme.of(context).colorScheme.onSurfaceVariant),
      title: Text(title, style: Theme.of(context).textTheme.bodyMedium),
      subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
      trailing: const Icon(Icons.settings, size: 20),
      onTap: () {
        // Open system settings — platform-specific. On mobile this would
        // use AppSettings.openAppSettings() from the app_settings package.
        // For now, show a snackbar with guidance.
        _showSuccess(context.tr('privacy.permissions.openSettings'));
      },
    );
  }
}
