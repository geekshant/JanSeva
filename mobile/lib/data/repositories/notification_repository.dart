import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../../core/errors/result.dart';
import '../models/app_notification.dart';

/// Persistent in-app notifications + FCM device token registration.
///
/// Notification rows are created by database triggers (never by clients - there
/// is no INSERT RLS policy). Clients can only read their own rows and flip
/// read state. Device tokens are RLS-scoped to the signed-in profile, so a
/// citizen can only associate tokens with their own account.
class NotificationRepository {
  NotificationRepository();

  SupabaseClient get _client => SupabaseService.client;

  /// The user's notifications, newest first.
  Future<Result<List<AppNotification>>> fetchNotifications({
    required String profileId,
    int limit = 100,
  }) async {
    try {
      final data = await _client
          .from('notifications')
          .select()
          .eq('user_id', profileId)
          .order('created_at', ascending: false)
          .limit(limit);

      final notifications = (data as List)
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList();
      return Result.success(notifications);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Count of unread notifications for the user.
  Future<Result<int>> fetchUnreadCount(String profileId) async {
    try {
      final count = await _client
          .from('notifications')
          .count(CountOption.exact)
          .eq('user_id', profileId)
          .eq('is_read', false);
      return Result.success(count);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Marks a single notification as read (RLS: own rows only).
  Future<Result<void>> markAsRead(String notificationId) async {
    try {
      await _client
          .from('notifications')
          .update({
            'is_read': true,
            'read_at': DateTime.now().toUtc().toIso8601String(),
          })
          .eq('id', notificationId);
      return Result.success(null);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Marks every unread notification of the user as read.
  Future<Result<int>> markAllAsRead(String profileId) async {
    try {
      final data = await _client
          .from('notifications')
          .update({
            'is_read': true,
            'read_at': DateTime.now().toUtc().toIso8601String(),
          })
          .eq('user_id', profileId)
          .eq('is_read', false)
          .select('id');
      return Result.success((data as List).length);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Registers (or refreshes) an FCM device token for [profileId].
  ///
  /// The token is unique per device; re-registering updates `last_used_at`
  /// and re-associates the row if the device switched accounts.
  Future<Result<void>> registerDeviceToken({
    required String profileId,
    required String token,
    String? platform,
  }) async {
    try {
      await _client.from('device_tokens').upsert({
        'user_id': profileId,
        'token': token,
        'platform': platform ?? 'unknown',
        'last_used_at': DateTime.now().toUtc().toIso8601String(),
      }, onConflict: 'token');
      return Result.success(null);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Removes a device token (used on sign-out / token invalidation).
  Future<Result<void>> unregisterDeviceToken({
    required String profileId,
    required String token,
  }) async {
    try {
      await _client
          .from('device_tokens')
          .delete()
          .eq('user_id', profileId)
          .eq('token', token);
      return Result.success(null);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }
}
