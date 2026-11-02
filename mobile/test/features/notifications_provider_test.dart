import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/core/errors/result.dart';
import 'package:janmitra/features/notifications/notifications_provider.dart';
import 'package:janmitra/features/profile/current_profile_provider.dart';
import 'package:janmitra/data/models/app_notification.dart';
import 'package:janmitra/data/repositories/notification_repository.dart';
import 'package:janmitra/data/repositories/repository_providers.dart';

/// In-memory repository backing read-state tests.
class InMemoryNotificationRepository extends NotificationRepository {
  InMemoryNotificationRepository(List<AppNotification> seed)
    : items = List.of(seed);

  final List<AppNotification> items;
  final List<String> markAsReadCalls = <String>[];
  int markAllAsReadCalls = 0;
  bool failMarkAsRead = false;
  bool failMarkAllAsRead = false;

  @override
  Future<Result<List<AppNotification>>> fetchNotifications({
    required String profileId,
    int limit = 100,
  }) async {
    final sorted = [...items]
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return Result.success(sorted);
  }

  @override
  Future<Result<void>> markAsRead(String notificationId) async {
    if (failMarkAsRead) {
      return Result.failure(const Failure(message: 'mark read failed'));
    }
    markAsReadCalls.add(notificationId);
    final index = items.indexWhere((n) => n.id == notificationId);
    if (index >= 0) {
      items[index] = items[index].copyWith(
        isRead: true,
        readAt: DateTime.now(),
      );
    }
    return Result.success(null);
  }

  @override
  Future<Result<int>> markAllAsRead(String profileId) async {
    if (failMarkAllAsRead) {
      return Result.failure(const Failure(message: 'mark all failed'));
    }
    markAllAsReadCalls++;
    var count = 0;
    for (var i = 0; i < items.length; i++) {
      if (!items[i].isRead) {
        items[i] = items[i].copyWith(isRead: true, readAt: DateTime.now());
        count++;
      }
    }
    return Result.success(count);
  }

  @override
  Future<Result<int>> fetchUnreadCount(String profileId) async =>
      Result.success(items.where((n) => !n.isRead).length);

  @override
  Future<Result<void>> registerDeviceToken({
    required String profileId,
    required String token,
    String? platform,
  }) async => Result.success(null);

  @override
  Future<Result<void>> unregisterDeviceToken({
    required String profileId,
    required String token,
  }) async => Result.success(null);
}

AppNotification notification({
  required String id,
  bool isRead = false,
  String? complaintId,
  AppNotificationType type = AppNotificationType.complaintSubmitted,
  DateTime? createdAt,
}) {
  return AppNotification(
    id: id,
    userId: 'profile-1',
    title: type.label,
    message: 'Message for $id',
    type: type,
    isRead: isRead,
    createdAt: createdAt ?? DateTime(2026, 9, 23, 10),
    complaintId: complaintId,
  );
}

ProviderContainer createContainer(InMemoryNotificationRepository repo) {
  final container = ProviderContainer(
    overrides: [
      currentProfileIdProvider.overrideWith((ref) async => 'profile-1'),
      notificationRepositoryProvider.overrideWith((ref) => repo),
    ],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  group('notificationsProvider read state', () {
    test('loads notifications for the signed-in profile', () async {
      final repo = InMemoryNotificationRepository([
        notification(id: 'n1', complaintId: 'c1'),
        notification(id: 'n2', isRead: true),
      ]);
      final container = createContainer(repo);

      final items = await container.read(notificationsProvider.future);

      expect(items, hasLength(2));
      // Newest first (both share the same timestamp, so order is stable-ish);
      // unread count is what matters here.
      expect(container.read(unreadNotificationsCountProvider), 1);
    });

    test(
      'markAsRead updates local read state and persists to the repository',
      () async {
        final repo = InMemoryNotificationRepository([
          notification(id: 'n1', complaintId: 'c1'),
          notification(id: 'n2', complaintId: 'c2'),
        ]);
        final container = createContainer(repo);
        await container.read(notificationsProvider.future);

        final result = await container
            .read(notificationsProvider.notifier)
            .markAsRead('n1');

        expect(result.isSuccess, isTrue);
        expect(repo.markAsReadCalls, ['n1']);

        final items = container.read(notificationsProvider).value!;
        expect(items.firstWhere((n) => n.id == 'n1').isRead, isTrue);
        expect(items.firstWhere((n) => n.id == 'n1').readAt, isNotNull);
        expect(items.firstWhere((n) => n.id == 'n2').isRead, isFalse);
        expect(container.read(unreadNotificationsCountProvider), 1);
      },
    );

    test('markAsRead on an already-read notification is a no-op', () async {
      final repo = InMemoryNotificationRepository([
        notification(id: 'n1', isRead: true),
      ]);
      final container = createContainer(repo);
      await container.read(notificationsProvider.future);

      final result = await container
          .read(notificationsProvider.notifier)
          .markAsRead('n1');

      expect(result.isSuccess, isTrue);
      expect(repo.markAsReadCalls, isEmpty);
    });

    test('failed markAsRead rolls back the optimistic update', () async {
      final repo = InMemoryNotificationRepository([notification(id: 'n1')])
        ..failMarkAsRead = true;
      final container = createContainer(repo);
      await container.read(notificationsProvider.future);

      final result = await container
          .read(notificationsProvider.notifier)
          .markAsRead('n1');

      expect(result.isFailure, isTrue);
      final items = container.read(notificationsProvider).value!;
      expect(
        items.single.isRead,
        isFalse,
        reason: 'read state must roll back on failure',
      );
      expect(container.read(unreadNotificationsCountProvider), 1);
    });

    test('markAllAsRead reads every unread notification', () async {
      final repo = InMemoryNotificationRepository([
        notification(id: 'n1', complaintId: 'c1'),
        notification(id: 'n2'),
        notification(id: 'n3', isRead: true),
      ]);
      final container = createContainer(repo);
      await container.read(notificationsProvider.future);
      expect(container.read(unreadNotificationsCountProvider), 2);

      final result = await container
          .read(notificationsProvider.notifier)
          .markAllAsRead();

      expect(result.isSuccess, isTrue);
      expect(result.dataOrNull, 2);
      expect(repo.markAllAsReadCalls, 1);

      final items = container.read(notificationsProvider).value!;
      expect(items.every((n) => n.isRead), isTrue);
      expect(container.read(unreadNotificationsCountProvider), 0);
    });

    test('failed markAllAsRead keeps unread state intact', () async {
      final repo = InMemoryNotificationRepository([
        notification(id: 'n1'),
        notification(id: 'n2'),
      ])..failMarkAllAsRead = true;
      final container = createContainer(repo);
      await container.read(notificationsProvider.future);

      final result = await container
          .read(notificationsProvider.notifier)
          .markAllAsRead();

      expect(result.isFailure, isTrue);
      expect(container.read(unreadNotificationsCountProvider), 2);
    });
  });
}
