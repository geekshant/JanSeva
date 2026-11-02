import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/result.dart';
import '../../data/models/app_notification.dart';
import '../../data/repositories/repository_providers.dart';
import '../profile/current_profile_provider.dart';

/// In-app notification feed with optimistic read-state mutations.
///
/// * `build()` loads the user's notifications (newest first).
/// * [markAsRead] / [markAllAsRead] update the local list immediately, then
///   persist via the repository (rolling back on failure).
class NotificationsNotifier extends AsyncNotifier<List<AppNotification>> {
  @override
  Future<List<AppNotification>> build() async {
    final profileId = await ref.watch(currentProfileIdProvider.future);
    final result = await ref
        .watch(notificationRepositoryProvider)
        .fetchNotifications(profileId: profileId);
    return result.when(
      success: (notifications) => notifications,
      failure: (failure) => throw Exception(failure.message),
    );
  }

  /// Marks a single notification as read (optimistic).
  ///
  /// No-ops when the feed isn't loaded or the notification is already read.
  Future<Result<void>> markAsRead(String id) async {
    final current = state.value;
    AppNotification? target;
    if (current != null) {
      for (final n in current) {
        if (n.id == id) {
          target = n;
          break;
        }
      }
    }
    if (current == null || target == null || target.isRead) {
      return Result.success(null);
    }

    final now = DateTime.now();
    final updated = [
      for (final n in current)
        n.id == id ? n.copyWith(isRead: true, readAt: now) : n,
    ];
    state = AsyncData(updated);

    final result = await ref
        .read(notificationRepositoryProvider)
        .markAsRead(id);
    if (result.isFailure) {
      state = AsyncData(current); // roll back optimistic update
    }
    return result;
  }

  /// Marks every unread notification as read (optimistic).
  Future<Result<int>> markAllAsRead() async {
    final current = state.value;
    if (current == null || current.every((n) => n.isRead)) {
      return Result.success(0);
    }

    final now = DateTime.now();
    final updated = [
      for (final n in current)
        n.isRead ? n : n.copyWith(isRead: true, readAt: now),
    ];
    state = AsyncData(updated);

    final profileId = await ref.read(currentProfileIdProvider.future);
    final result = await ref
        .read(notificationRepositoryProvider)
        .markAllAsRead(profileId);
    if (result.isFailure) {
      state = AsyncData(current); // roll back optimistic update
    }
    return result.when(
      success: (count) => Result.success(count),
      failure: (failure) => Result.failure(failure),
    );
  }
}

final notificationsProvider =
    AsyncNotifierProvider<NotificationsNotifier, List<AppNotification>>(
      NotificationsNotifier.new,
    );

/// Number of unread notifications, derived from the feed.
final unreadNotificationsCountProvider = Provider<int>((ref) {
  final notifications = ref.watch(notificationsProvider).value;
  if (notifications == null) return 0;
  return notifications.where((n) => !n.isRead).length;
});
