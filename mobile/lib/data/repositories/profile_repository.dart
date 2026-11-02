import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../../core/errors/result.dart';
import '../../core/utils/phone.dart';
import '../models/profile.dart';

/// Fetches profile data for the signed-in citizen.
class ProfileRepository {
  ProfileRepository();

  SupabaseClient get _client => SupabaseService.client;

  /// Returns the profile for the currently authenticated user.
  ///
  /// Queries by `auth_user_id` (the RLS policy allows viewing your own row).
  /// Throws if not signed in.
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

      final profile = Profile.fromJson(data);
      return Result.success(profile);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Count of badges earned by a user (from the `user_badges` table).
  Future<Result<int>> fetchBadgeCount(String profileId) async {
    try {
      final count = await _client
          .from('user_badges')
          .count(CountOption.exact)
          .eq('user_id', profileId);
      return Result.success(count);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Updates the signed-in citizen's editable profile fields.
  ///
  /// **Security:** only `name`, `phone`, `avatar_url`, `city` and `ward` are
  /// ever sent — `points`, `level`, `email` and reward history are
  /// server-managed and cannot be written from the client (RLS +
  /// `profiles_protect_reputation` trigger). The WHERE clause always targets
  /// the caller's own row.
  ///
  /// Empty `city` / `ward` values are stored as `NULL` so the optional
  /// location fields never fill up with blank strings.
  Future<Result<Profile>> updateProfile({
    String? name,
    String? phone,
    String? avatarUrl,
    String? city,
    String? ward,
    String? gender,
    String? preferredLanguage,
  }) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      return Result.failure(const Failure(message: 'You are not signed in.'));
    }

    String? clean(String? value) {
      final trimmed = value?.trim();
      return (trimmed == null || trimmed.isEmpty) ? null : trimmed;
    }

    // Whitelist: never include points/level/email/reward fields here.
    // Only include fields that are explicitly provided (non-null).
    final fields = <String, dynamic>{
      if (name != null) 'name': name.trim(),
      if (phone != null) 'phone': normalizePhone(phone) ?? phone.trim(),
      'avatar_url': ?avatarUrl,
      if (city != null) 'city': clean(city),
      if (ward != null) 'ward': clean(ward),
      'gender': ?gender,
      'preferred_language': ?preferredLanguage,
    };

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

  /// Updates the signed-in citizen's notification and privacy preferences
  /// (the step-16 `profiles` columns). All five values are always sent so
  /// the row reflects exactly what the screen is showing.
  Future<Result<Profile>> updatePreferences({
    required bool notifyPush,
    required bool notifyEmail,
    required bool notifyInApp,
    required bool privacyShowLeaderboard,
    required bool privacyShowWard,
  }) async {
    final userId = _client.auth.currentUser?.id;
    if (userId == null) {
      return Result.failure(const Failure(message: 'You are not signed in.'));
    }

    final fields = <String, dynamic>{
      'notify_push': notifyPush,
      'notify_email': notifyEmail,
      'notify_in_app': notifyInApp,
      'privacy_show_leaderboard': privacyShowLeaderboard,
      'privacy_show_ward': privacyShowWard,
    };

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
}
