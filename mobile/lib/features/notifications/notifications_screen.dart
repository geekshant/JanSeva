import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../data/models/app_notification.dart';
import '../../core/widgets/empty_view.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import 'notifications_provider.dart';
import 'notifications_realtime_provider.dart';
import 'widgets/notification_tile.dart';

/// In-app notification center.
///
/// Lists the user's persistent notifications (title, message, timestamp,
/// read/unread) with:
/// * tap -> mark as read + navigate to the related complaint (or rewards)
/// * "Mark all read" bulk action
/// * realtime refresh when a new notification is created by the database
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Keep the feed fresh while this screen is open.
    ref.watch(notificationsRealtimeRefresherProvider);

    final notificationsAsync = ref.watch(notificationsProvider);
    final unreadCount = ref.watch(unreadNotificationsCountProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('notifications.title')),
        actions: [
          if (unreadCount > 0)
            TextButton(
              key: const Key('markAllReadButton'),
              onPressed: () async {
                final result = await ref
                    .read(notificationsProvider.notifier)
                    .markAllAsRead();
                if (context.mounted && result.isFailure) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                        content: Text(AppLocalizations.translate(
                            result.failureOrNull!.message))),
                  );
                }
              },
              child: Text(context.tr('notifications.markAllRead')),
            ),
        ],
      ),
      body: SafeArea(
        child: notificationsAsync.when(
          data: (notifications) {
            if (notifications.isEmpty) {
              return EmptyView(
                icon: Icons.notifications_none_rounded,
                title: context.tr('notifications.empty'),
                message: context.tr('notifications.emptyMsg'),
              );
            }
            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(notificationsProvider);
                await ref.read(notificationsProvider.future);
              },
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 88),
                itemCount: notifications.length,
                itemBuilder: (context, index) {
                  final notification = notifications[index];
                  return NotificationTile(
                    key: Key('notification-${notification.id}'),
                    notification: notification,
                    onTap: () => _openNotification(context, ref, notification),
                  );
                },
              ),
            );
          },
          loading: () =>
              LoadingView(message: context.tr('notifications.loading')),
          error: (error, _) => ErrorView(
            message: error.toString(),
            onRetry: () => ref.invalidate(notificationsProvider),
          ),
        ),
      ),
    );
  }

  /// Marks the notification read, then navigates to the related complaint
  /// (or the rewards tab for reward/badge notifications).
  Future<void> _openNotification(
    BuildContext context,
    WidgetRef ref,
    AppNotification notification,
  ) async {
    if (!notification.isRead) {
      await ref
          .read(notificationsProvider.notifier)
          .markAsRead(notification.id);
    }
    if (!context.mounted) return;

    if (notification.relatesToComplaint) {
      context.push('${AppRoutes.complaintDetail}/${notification.complaintId}');
      return;
    }
    switch (notification.type) {
      case AppNotificationType.rewardEarned:
      case AppNotificationType.badgeEarned:
        context.push(AppRoutes.rewards);
      default:
        context.go(AppRoutes.home);
    }
  }
}
