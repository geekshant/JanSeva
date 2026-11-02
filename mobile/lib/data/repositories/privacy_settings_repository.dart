import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../../core/errors/result.dart';
import '../models/profile.dart';
import '../models/user_settings.dart';

/// Fetches and updates privacy, accessibility, notification, and account
/// settings for the signed-in citizen.
///
/// All methods use the Supabase client's auth to identify the user
/// (`_client.auth.currentUser?.id`) and target only the caller's own rows
/// via RLS. Destructive operations (deletion request, location clearing)
/// are handled by SECURITY DEFINER RPCs.
class PrivacySettingsRepository {
  PrivacySettingsRepository();

  SupabaseClient get _client => SupabaseService.client;

  // ---------------------------------------------------------------------------
  // Profile-level privacy settings (columns on `profiles`)
  // ---------------------------------------------------------------------------

  /// Updates privacy/visibility/location/Aadhaar/language columns on the
  /// caller's `profiles` row. Only non-null fields are sent so callers can
  /// update a subset of fields without clobbering the rest.
  Future<Result<Profile>> updatePrivacySettings({
    String? profileVisibility,
    bool? showNameOnVerifications,
    bool? shareAadhaarWithOfficials,
    String? preferredLanguage,
    String? preferredRegion,
    bool? sharePreciseLocation,
    String? locationPrecision,
    bool? shareLocationWithOfficials,
    bool? includeLocationOnComplaints,
    bool? notifyPush,
    bool? notifyEmail,
    bool? notifyInApp,
    bool? privacyShowLeaderboard,
    bool? privacyShowWard,
  }) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      return Result.failure(const Failure(message: 'You are not signed in.'));
    }

    final fields = <String, dynamic>{};
    if (profileVisibility != null) fields['profile_visibility'] = profileVisibility;
    if (showNameOnVerifications != null) fields['show_name_on_verifications'] = showNameOnVerifications;
    if (shareAadhaarWithOfficials != null) fields['share_aadhaar_with_officials'] = shareAadhaarWithOfficials;
    if (preferredLanguage != null) fields['preferred_language'] = preferredLanguage;
    if (preferredRegion != null) fields['preferred_region'] = preferredRegion;
    if (sharePreciseLocation != null) fields['share_precise_location'] = sharePreciseLocation;
    if (locationPrecision != null) fields['location_precision'] = locationPrecision;
    if (shareLocationWithOfficials != null) fields['share_location_with_officials'] = shareLocationWithOfficials;
    if (includeLocationOnComplaints != null) fields['include_location_on_complaints'] = includeLocationOnComplaints;
    if (notifyPush != null) fields['notify_push'] = notifyPush;
    if (notifyEmail != null) fields['notify_email'] = notifyEmail;
    if (notifyInApp != null) fields['notify_in_app'] = notifyInApp;
    if (privacyShowLeaderboard != null) fields['privacy_show_leaderboard'] = privacyShowLeaderboard;
    if (privacyShowWard != null) fields['privacy_show_ward'] = privacyShowWard;

    if (fields.isEmpty) {
      // Nothing to update — return the current profile.
      return fetchCurrentProfile();
    }

    try {
      final data = await _client
          .from('profiles')
          .update(fields)
          .eq('auth_user_id', userId)
          .select()
          .single();
      return Result.success(Profile.fromJson(data));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  Future<Result<Profile>> fetchCurrentProfile() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      return Result.failure(const Failure(message: 'You are not signed in.'));
    }
    try {
      final data = await _client
          .from('profiles')
          .select()
          .eq('auth_user_id', userId)
          .single();
      return Result.success(Profile.fromJson(data));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  // ---------------------------------------------------------------------------
  // Accessibility + DND settings (user_settings table via RPC)
  // ---------------------------------------------------------------------------

  Future<Result<UserSettings>> fetchUserSettings() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      return Result.failure(const Failure(message: 'You are not signed in.'));
    }
    try {
      // The user_settings table has RLS (self-only). Use a direct SELECT —
      // if no row exists yet (first visit), return defaults.
      final data = await _client
          .from('user_settings')
          .select()
          .eq('user_id', userId)
          .maybeSingle();

      if (data == null) {
        // No row yet — return defaults. The first save will create the row
        // via the upsert_user_settings RPC.
        return Result.success(UserSettings(userId: userId));
      }
      return Result.success(UserSettings.fromJson(data));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  Future<Result<UserSettings>> updateUserSettings({
    double? fontScale,
    bool? highContrast,
    bool? reduceMotion,
    bool? screenReaderHints,
    bool? largerTouchTargets,
    String? dndStart,
    String? dndEnd,
    bool? muteAllNotifications,
  }) async {
    try {
      final data = await _client.rpc('upsert_user_settings', params: {
        'p_font_scale': fontScale,
        'p_high_contrast': highContrast,
        'p_reduce_motion': reduceMotion,
        'p_screen_reader_hints': screenReaderHints,
        'p_larger_touch_targets': largerTouchTargets,
        'p_dnd_start': dndStart,
        'p_dnd_end': dndEnd,
        'p_mute_all_notifications': muteAllNotifications,
      });
      return Result.success(UserSettings.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  // ---------------------------------------------------------------------------
  // Per-category notification preferences (notification_preferences table)
  // ---------------------------------------------------------------------------

  Future<Result<List<NotificationPreference>>> fetchNotificationPreferences() async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      return Result.failure(const Failure(message: 'You are not signed in.'));
    }
    try {
      final data = await _client
          .from('notification_preferences')
          .select()
          .eq('user_id', userId)
          .order('category');
      final list = (data as List).map((e) => NotificationPreference.fromJson(e as Map<String, dynamic>)).toList();
      return Result.success(list);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  Future<Result<NotificationPreference>> updateNotificationPreference({
    required String category,
    bool? push,
    bool? email,
    bool? sms,
    bool? inApp,
  }) async {
    try {
      final data = await _client.rpc('upsert_notification_preference', params: {
        'p_category': category,
        'p_push': push,
        'p_email': email,
        'p_sms': sms,
        'p_in_app': inApp,
      });
      return Result.success(NotificationPreference.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  // ---------------------------------------------------------------------------
  // Data & account controls
  // ---------------------------------------------------------------------------

  /// Requests account deletion — sets deletion_requested_at = now(). The
  /// account is hard-deleted after 30 days. Can be cancelled.
  Future<Result<Profile>> requestAccountDeletion() async {
    try {
      final data = await _client.rpc('request_account_deletion');
      return Result.success(Profile.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Cancels a pending account deletion — clears deletion_requested_at.
  Future<Result<Profile>> cancelAccountDeletion() async {
    try {
      final data = await _client.rpc('cancel_account_deletion');
      return Result.success(Profile.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Clears precise location from all non-resolved complaints. Returns the
  /// number of complaints affected.
  Future<Result<int>> clearLocationHistory() async {
    try {
      final data = await _client.rpc('clear_location_history');
      return Result.success(data as int);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Downloads all the user's data as JSON via the download-my-data Edge
  /// Function. Returns the JSON string.
  Future<Result<String>> downloadMyData() async {
    try {
      final response = await _client.functions.invoke(
        'download-my-data',
        body: {'format': 'json'},
      );
      return Result.success(response.data.toString());
    } on FunctionException catch (e) {
      return Result.failure(Failure(message: e.toString(), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Logs out of all devices by calling Supabase signOut with global scope.
  Future<Result<void>> logoutAllDevices() async {
    try {
      await _client.auth.signOut(scope: SignOutScope.others);
      return Result.success(null);
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }
}
