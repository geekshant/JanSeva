import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'package:janmitra/core/i18n/app_localizations.dart';
import 'package:janmitra/core/routing/app_routes.dart';
import 'package:janmitra/features/complaints/complaint_detail_provider.dart';
import 'package:janmitra/features/complaints/complaint_detail_screen.dart';
import 'package:janmitra/features/notifications/notifications_realtime_provider.dart';
import 'package:janmitra/features/notifications/notifications_screen.dart';
import 'package:janmitra/features/profile/current_profile_provider.dart';
import 'package:janmitra/data/models/app_notification.dart';
import 'package:janmitra/data/models/complaint.dart';
import 'package:janmitra/data/repositories/complaint_repository.dart';
import 'package:janmitra/data/repositories/notification_repository.dart';
import 'package:janmitra/data/repositories/repository_providers.dart';
import 'package:janmitra/core/errors/result.dart';

class FakeNotificationRepository extends NotificationRepository {
  FakeNotificationRepository(List<AppNotification> seed)
    : items = List.of(seed);

  final List<AppNotification> items;
  final List<String> markAsReadCalls = <String>[];
  int markAllAsReadCalls = 0;

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

AppNotification buildNotification({
  required String id,
  required AppNotificationType type,
  required String title,
  required String message,
  bool isRead = false,
  String? complaintId,
  DateTime? createdAt,
}) {
  return AppNotification(
    id: id,
    userId: 'profile-1',
    title: title,
    message: message,
    type: type,
    isRead: isRead,
    createdAt: createdAt ?? DateTime(2026, 9, 23, 16, 30),
    complaintId: complaintId,
  );
}

final _complaint = Complaint(
  id: 'c1',
  complaintNumber: 'JM-2026-000001',
  userId: 'profile-1',
  categoryId: 'cat-1',
  title: 'Pothole on Main Road',
  description: 'Large pothole near the bus stop.',
  createdAt: DateTime(2026, 9, 23),
);

Widget buildUnderTest(FakeNotificationRepository repo) {
  final router = GoRouter(
    initialLocation: AppRoutes.notifications,
    routes: [
      GoRoute(
        path: AppRoutes.notifications,
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '${AppRoutes.complaintDetail}/:id',
        builder: (context, state) =>
            ComplaintDetailScreen(complaintId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.rewards,
        builder: (context, state) => const Scaffold(body: Text('Rewards tab')),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => const Scaffold(body: Text('Home tab')),
      ),
    ],
  );

  return ProviderScope(
    overrides: [
      currentProfileIdProvider.overrideWith((ref) async => 'profile-1'),
      notificationRepositoryProvider.overrideWith((ref) => repo),
      notificationsRealtimeRefresherProvider.overrideWith((ref) {}),
      complaintDetailProvider('c1').overrideWith(
        (ref) async => ComplaintDetail(complaint: _complaint),
      ),
    ],
    child: MaterialApp.router(
      routerConfig: router,
      supportedLocales: kSupportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    ),
  );
}

void main() {
  testWidgets(
    'renders notification title, message, timestamp and unread state',
    (tester) async {
      final repo = FakeNotificationRepository([
        buildNotification(
          id: 'n1',
          type: AppNotificationType.complaintResolved,
          title: 'Complaint Resolved',
          message:
              'Great news! Your complaint JM-2026-000001 has been resolved.',
          complaintId: 'c1',
        ),
        buildNotification(
          id: 'n2',
          type: AppNotificationType.rewardEarned,
          title: 'Reward Earned',
          message: 'You earned 10 point(s).',
          isRead: true,
          createdAt: DateTime(2026, 9, 22, 9, 0),
        ),
      ]);

      await tester.pumpWidget(buildUnderTest(repo));
      await tester.pumpAndSettle();

      expect(find.text('Notifications'), findsOneWidget);
      expect(find.text('Complaint Resolved'), findsOneWidget);
      expect(
        find.text(
          'Great news! Your complaint JM-2026-000001 has been resolved.',
        ),
        findsOneWidget,
      );
      expect(find.text('Reward Earned'), findsNWidgets(1));
      expect(find.text('You earned 10 point(s).'), findsOneWidget);

      // Timestamp rendered for each notification.
      expect(find.textContaining('2026'), findsWidgets);

      // Unread action visible (one unread item).
      expect(find.byKey(const Key('markAllReadButton')), findsOneWidget);
      expect(find.byKey(const Key('notification-n1')), findsOneWidget);
      expect(find.byKey(const Key('notification-n2')), findsOneWidget);
    },
  );

  testWidgets(
    'tapping an unread complaint notification marks it read and navigates '
    'to the related complaint',
    (tester) async {
      final repo = FakeNotificationRepository([
        buildNotification(
          id: 'n1',
          type: AppNotificationType.complaintVerified,
          title: 'Complaint Verified',
          message: 'Your complaint has been verified.',
          complaintId: 'c1',
        ),
      ]);

      await tester.pumpWidget(buildUnderTest(repo));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('notification-n1')));
      await tester.pumpAndSettle();

      // Read state persisted.
      expect(repo.markAsReadCalls, ['n1']);
      expect(
        repo.items.single.isRead,
        isTrue,
        reason: 'notification should be persisted as read',
      );

      // Navigation to the related complaint detail.
      expect(find.text('Complaint Details'), findsOneWidget);
      expect(find.text('JM-2026-000001'), findsOneWidget);
      expect(find.text('Pothole on Main Road'), findsOneWidget);
    },
  );

  testWidgets('tapping a reward notification opens the rewards tab', (
    tester,
  ) async {
    final repo = FakeNotificationRepository([
      buildNotification(
        id: 'n9',
        type: AppNotificationType.badgeEarned,
        title: 'Badge Earned',
        message: 'You earned the First Report badge!',
      ),
    ]);

    await tester.pumpWidget(buildUnderTest(repo));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('notification-n9')));
    await tester.pumpAndSettle();

    expect(find.text('Rewards tab'), findsOneWidget);
  });

  testWidgets('"Mark all read" clears every unread notification', (
    tester,
  ) async {
    final repo = FakeNotificationRepository([
      buildNotification(
        id: 'n1',
        type: AppNotificationType.complaintAssigned,
        title: 'Complaint Assigned',
        message: 'Assigned to department.',
        complaintId: 'c1',
      ),
      buildNotification(
        id: 'n2',
        type: AppNotificationType.complaintInProgress,
        title: 'Work In Progress',
        message: 'Work has started.',
        complaintId: 'c1',
      ),
    ]);

    await tester.pumpWidget(buildUnderTest(repo));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('markAllReadButton')), findsOneWidget);

    await tester.tap(find.byKey(const Key('markAllReadButton')));
    await tester.pumpAndSettle();

    expect(repo.markAllAsReadCalls, 1);
    expect(repo.items.every((n) => n.isRead), isTrue);

    // The bulk action disappears once nothing is unread.
    expect(find.byKey(const Key('markAllReadButton')), findsNothing);
  });

  testWidgets('shows the empty state when there are no notifications', (
    tester,
  ) async {
    final repo = FakeNotificationRepository([]);

    await tester.pumpWidget(buildUnderTest(repo));
    await tester.pumpAndSettle();

    expect(find.text('No notifications yet'), findsOneWidget);
    expect(
      find.text('Updates about your complaints will appear here.'),
      findsOneWidget,
    );
    expect(find.byKey(const Key('markAllReadButton')), findsNothing);
  });
}
