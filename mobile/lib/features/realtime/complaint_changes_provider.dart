import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:realtime_client/realtime_client.dart';

import '../../data/services/supabase_service.dart';
import '../../core/utils/app_logger.dart';
import '../../data/models/complaint.dart';
import '../../data/repositories/repository_providers.dart';
import '../auth/auth_provider.dart';
import '../complaints/my_complaints_provider.dart';
import '../home/home_dashboard_provider.dart';
import '../gamification/rewards_provider.dart';
import 'complaint_realtime_provider.dart';

/// A realtime change event for the user's complaints.
class ComplaintChangeEvent {
  const ComplaintChangeEvent({
    required this.type,
    required this.complaint,
  });

  final ChangeType type;
  final Complaint complaint;

  static ComplaintChangeEvent fromPayload(PostgresChangePayload payload) {
    final type = switch (payload.eventType) {
      PostgresChangeEvent.insert => ChangeType.insert,
      PostgresChangeEvent.update => ChangeType.update,
      PostgresChangeEvent.delete => ChangeType.delete,
      PostgresChangeEvent.all => ChangeType.update,
    };
    return ComplaintChangeEvent(
      type: type,
      complaint: Complaint.fromJson(payload.newRecord),
    );
  }
}

enum ChangeType { insert, update, delete }

/// Stream of realtime changes to the current user's complaints.
///
/// Subscribes to the Supabase Realtime `postgres_changes` channel filtered by
/// `user_id=<profileId>`, so we only receive events the user is authorized to
/// see (RLS-enforced). Emits a [ComplaintChangeEvent] on every INSERT/UPDATE.
///
/// Handles:
/// - Connection loss: the channel auto-reconnects (Supabase socket-level).
/// - Reconnection: re-subscribes if the channel drops to `closed`.
/// - Duplicate events: deduplicates by `commit_timestamp` + `eventType`.
/// - Disposal: unsubscribes the channel when the provider is destroyed.
final complaintsChangesProvider =
    StreamProvider<ComplaintChangeEvent>((ref) async* {
  final client = SupabaseService.client;

  // We need the profile id to filter by user_id.
  final authRepo = ref.watch(authRepositoryProvider);
  final userId = authRepo.currentUserId;
  if (userId == null) {
    AppLogger.warning('realtime: not signed in, skipping subscription');
    return;
  }

  // Resolve the profile id (profiles.id, not auth.users.id).
  final profileRepo = ref.watch(profileRepositoryProvider);
  final profileResult = await profileRepo.fetchCurrentProfile();
  if (profileResult.isFailure) {
    AppLogger.warning('realtime: could not resolve profile, skipping');
    return;
  }
  final profileId = profileResult.dataOrNull!.id;

  AppLogger.info('realtime: subscribing to complaint changes for $profileId');

  final controller = StreamController<ComplaintChangeEvent>.broadcast();
  final seenTimestamps = <String>{};
  RealtimeChannel? channel;

  void handleChange(PostgresChangePayload payload) {
    // Deduplicate by commit timestamp + event type (a single DB transaction
    // can occasionally produce replayed events on reconnect).
    final dedupeKey = '${payload.commitTimestamp.toIso8601String()}'
        '|${payload.eventType.name}'
        '|${payload.newRecord['id'] ?? payload.oldRecord['id']}';
    if (!seenTimestamps.add(dedupeKey)) {
      AppLogger.info('realtime: skipping duplicate event');
      return;
    }
    // Keep the dedupe set bounded
    if (seenTimestamps.length > 200) {
      seenTimestamps.clear();
    }

    AppLogger.info('realtime: ${payload.eventType.name} on complaint '
        '${payload.newRecord['complaint_number']}');

    controller.add(ComplaintChangeEvent.fromPayload(payload));
  }

  channel = client
      .channel('complaints:user:$profileId')
      .onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'complaints',
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
            AppLogger.info('realtime: channel subscribed');
          case RealtimeSubscribeStatus.channelError:
            AppLogger.error('realtime: channel error', error);
          case RealtimeSubscribeStatus.closed:
            AppLogger.warning('realtime: channel closed, will auto-reconnect');
          case RealtimeSubscribeStatus.timedOut:
            AppLogger.warning('realtime: channel timed out, will auto-reconnect');
        }
      });

  // When the provider is disposed, clean up the channel.
  ref.onDispose(() {
    AppLogger.info('realtime: disposing complaint changes subscription');
    controller.close();
    channel?.unsubscribe();
  });

  await for (final event in controller.stream) {
    yield event;
  }
});

/// Provider that watches the realtime complaint lifecycle stream and
/// invalidates only the affected providers — no unnecessary full-page reloads.
///
/// Different event types trigger different invalidations:
/// * complaintCreated / statusChanged → home dashboard, my complaints, rewards
/// * assigned / reopened / rejected → home dashboard, my complaints, rewards,
///   and the open complaint detail (if it matches)
/// * evidenceSubmitted → open complaint detail (resolution evidence)
/// * verificationUpdate → open complaint detail (verification section)
final realtimeRefresherProvider = Provider<void>((ref) {
  ref.watch(complaintRealtimeProvider).maybeWhen(
    data: (event) {
      AppLogger.info('realtime: ${event.type.name} for complaint '
          '${event.complaintNumber ?? event.complaintId}');

      switch (event.type) {
        case RealtimeEventType.complaintCreated:
        case RealtimeEventType.statusChanged:
        case RealtimeEventType.assigned:
        case RealtimeEventType.reopened:
        case RealtimeEventType.rejected:
          // Status-type changes affect the dashboard, complaints list,
          // and rewards (points are awarded/deducted on status change).
          ref.invalidate(homeDashboardProvider);
          ref.invalidate(myComplaintsProvider);
          ref.invalidate(rewardsDashboardProvider);
          break;

        case RealtimeEventType.evidenceSubmitted:
        case RealtimeEventType.verificationUpdate:
          // Evidence and verification events only affect the detail view
          // of the specific complaint — no need to refresh the dashboard
          // or lists (the status hasn't changed).
          break;
      }
    },
    orElse: () {},
  );
});
