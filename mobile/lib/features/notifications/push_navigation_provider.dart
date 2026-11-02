import 'package:go_router/go_router.dart';

import '../../core/routing/app_router.dart';
import '../../core/routing/app_routes.dart';
import '../../data/services/push_notification_service.dart';
import '../../core/utils/app_logger.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Routes a push-notification tap to the right screen.
///
/// Data payload contract (set by the Edge Function / backend):
/// * `complaint_id` -> `/complaint/<id>`
/// * otherwise -> notification center
void navigateFromPushData(GoRouter router, Map<String, String> data) {
  final complaintId = data['complaint_id'] ?? data['complaintId'];
  if (complaintId != null && complaintId.isNotEmpty) {
    AppLogger.info('Push tap: opening complaint $complaintId');
    router.push('${AppRoutes.complaintDetail}/$complaintId');
  } else {
    AppLogger.info('Push tap: opening notification center');
    router.push(AppRoutes.notifications);
  }
}

/// Listens for notification taps (background -> foreground and cold start)
/// and routes into the app. Watched by the root app widget.
final pushNavigationProvider = Provider<void>((ref) {
  // Watch (not read) so this listener follows the live GoRouter instance —
  // auth state recreates the router, and a read would leave us navigating a
  // detached one. Always watched, before any early return, so the dependency
  // stays registered.
  final router = ref.watch(appRouterProvider);

  final push = PushNotificationService.instance;
  if (!push.isAvailable) return;

  final sub = push.onMessageOpened.listen((data) {
    navigateFromPushData(router, data);
  });
  ref.onDispose(sub.cancel);

  // Cold start: app launched by tapping a system notification.
  push.getInitialMessage().then((data) {
    if (data != null && data.isNotEmpty) {
      navigateFromPushData(router, data);
    }
  });
});
