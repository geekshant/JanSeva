import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:realtime_client/realtime_client.dart';

import '../../data/services/supabase_service.dart';
import '../../core/utils/app_logger.dart';
import '../../data/models/app_notification.dart';
import '../profile/current_profile_provider.dart';
import 'notifications_provider.dart';

/// A realtime change event for the user's notifications.
class NotificationChangeEvent {
  const NotificationChangeEvent({required this.notification});

  final AppNotification notification;

  static NotificationChangeEvent fromPayload(PostgresChangePayload payload) {
    return NotificationChangeEvent(
      notification: AppNotification.fromJson(payload.newRecord),
    );
  }
}

/// Stream of realtime changes to the current user's notifications.
///
/// Subscribes to Supabase Realtime `postgres_changes` on `notifications`
/// filtered by `user_id=<profileId>` (RLS-authorized). New notification rows
/// are created by database triggers, so this surfaces submitted/verified/
/// assigned/in-progress/resolved/reward/badge events live in the app.
final notificationsChangesProvider = StreamProvider<NotificationChangeEvent>((
  ref,
) async* {
  final client = SupabaseService.client;

  String profileId;
  try {
    profileId = await ref.watch(currentProfileIdProvider.future);
  } on Exception catch (e) {
    AppLogger.warning('notifications realtime: no profile ($e)');
    return;
  }

  AppLogger.info('notifications realtime: subscribing for $profileId');

  final controller = StreamController<NotificationChangeEvent>.broadcast();
  final seenTimestamps = <String>{};
  RealtimeChannel? channel;

  void handleChange(PostgresChangePayload payload) {
    final dedupeKey =
        '${payload.commitTimestamp.toIso8601String()}'
        '|${payload.eventType.name}'
        '|${payload.newRecord['id'] ?? payload.oldRecord['id']}';
    if (!seenTimestamps.add(dedupeKey)) return;
    if (seenTimestamps.length > 200) seenTimestamps.clear();

    AppLogger.info(
      'notifications realtime: ${payload.eventType.name} '
      '${payload.newRecord['type'] ?? ''}',
    );
    controller.add(NotificationChangeEvent.fromPayload(payload));
  }

  channel = client
      .channel('notifications:user:$profileId')
      .onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'notifications',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'user_id',
          value: profileId,
        ),
        callback: handleChange,
      )
      .subscribe((status, error) {
        switch (status) {
          case RealtimeSubscribeStatus.subscribed:
            AppLogger.info('notifications realtime: channel subscribed');
          case RealtimeSubscribeStatus.channelError:
            AppLogger.error('notifications realtime: channel error', error);
          case RealtimeSubscribeStatus.closed:
            AppLogger.warning(
              'notifications realtime: channel closed, will auto-reconnect',
            );
          case RealtimeSubscribeStatus.timedOut:
            AppLogger.warning(
              'notifications realtime: channel timed out, will auto-reconnect',
            );
        }
      });

  ref.onDispose(() {
    AppLogger.info('notifications realtime: disposing subscription');
    controller.close();
    channel?.unsubscribe();
  });

  await for (final event in controller.stream) {
    yield event;
  }
});

/// Invalidates the notification feed whenever a realtime event arrives, so
/// the notification center and the home-header unread badge stay fresh.
final notificationsRealtimeRefresherProvider = Provider<void>((ref) {
  ref
      .watch(notificationsChangesProvider)
      .maybeWhen(
        data: (_) => ref.invalidate(notificationsProvider),
        orElse: () {},
      );
});
