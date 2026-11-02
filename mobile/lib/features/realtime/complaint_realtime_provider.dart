import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:realtime_client/realtime_client.dart';

import '../../data/services/supabase_service.dart';
import '../../core/utils/app_logger.dart';
import '../../data/models/complaint.dart';
import '../../data/repositories/repository_providers.dart';
import '../auth/auth_provider.dart';

/// Semantic event types for the citizen complaint lifecycle.
enum RealtimeEventType {
  /// A new complaint was filed by the user.
  complaintCreated,

  /// The complaint's status changed (e.g. submitted → verified → resolved).
  statusChanged,

  /// An officer was assigned to the complaint.
  assigned,

  /// The complaint was reopened.
  reopened,

  /// Resolution evidence (after photos) was submitted by the municipality.
  evidenceSubmitted,

  /// A community verification request was created / a verification was
  /// submitted by another citizen.
  verificationUpdate,

  /// A complaint was rejected.
  rejected,
}

/// A realtime event for the citizen complaint lifecycle, carrying the
/// semantic event type and the complaint id it relates to.
class ComplaintRealtimeEvent {
  const ComplaintRealtimeEvent({
    required this.type,
    required this.complaintId,
    this.complaintNumber,
    this.data,
  });

  final RealtimeEventType type;
  final String complaintId;
  final String? complaintNumber;
  final Map<String, dynamic>? data;
}

/// Stream of realtime events for the authenticated user's complaints across
/// all related tables.
///
/// Subscribes to a single Supabase Realtime channel monitoring:
/// * `complaints` — filtered by `user_id` (RLS-authorized)
/// * `complaint_status_history` — filtered client-side by the user's
///   complaint IDs
/// * `resolution_evidence` — filtered client-side
/// * `community_verifications` — filtered client-side
///
/// On startup, fetches the user's complaint IDs once so related-table
/// events can be filtered client-side without per-event DB lookups.
///
/// Cleanup: all channels are unsubscribed when the provider is disposed
/// (Riverpod auto-disposes when no widget watches it).
final complaintRealtimeProvider =
    StreamProvider<ComplaintRealtimeEvent>((ref) async* {
  final client = SupabaseService.client;

  final authRepo = ref.watch(authRepositoryProvider);
  final userId = authRepo.currentUserId;
  if (userId == null) {
    AppLogger.warning('realtime: not signed in, skipping');
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

  // Fetch the user's complaint IDs once for client-side filtering of
  // related-table events (status history, evidence, verifications).
  final complaintRepo = ref.watch(complaintRepositoryProvider);
  final complaintsResult =
      await complaintRepo.fetchRecentComplaints(profileId: profileId, limit: 100);
  final userComplaintIds = <String>{};
  if (complaintsResult.isSuccess) {
    for (final c in complaintsResult.dataOrNull!) {
      userComplaintIds.add(c.id);
    }
  }
  AppLogger.info('realtime: tracking ${userComplaintIds.length} complaint ids');

  final controller = StreamController<ComplaintRealtimeEvent>.broadcast();
  final seenTimestamps = <String>{};
  RealtimeChannel? channel;

  void handleDedupeAndEmit(
    String dedupeKey,
    ComplaintRealtimeEvent event,
  ) {
    if (!seenTimestamps.add(dedupeKey)) {
      AppLogger.info('realtime: skipping duplicate $dedupeKey');
      return;
    }
    if (seenTimestamps.length > 300) seenTimestamps.clear();
    controller.add(event);
  }

  // --- Handler for `complaints` table changes ---
  void handleComplaintChange(PostgresChangePayload payload) {
    final record = payload.newRecord;
    final complaintId = (record['id'] ?? payload.oldRecord['id']) as String;
    final dedupeKey =
        '${payload.commitTimestamp.toIso8601String()}|${payload.eventType.name}|$complaintId';

    // Track new complaints
    if (payload.eventType == PostgresChangeEvent.insert) {
      userComplaintIds.add(complaintId);
    }

    final complaint = Complaint.fromJson(record);
    RealtimeEventType type;
    if (payload.eventType == PostgresChangeEvent.insert) {
      type = RealtimeEventType.complaintCreated;
    } else {
      // Determine semantic type from what changed.
      final oldStatus = payload.oldRecord['status'];
      final newStatus = record['status'];
      final oldOfficer = payload.oldRecord['assigned_officer_id'];
      final newOfficer = record['assigned_officer_id'];

      if (newStatus == 'REJECTED') {
        type = RealtimeEventType.rejected;
      } else if (newStatus == 'RESOLVED') {
        type = RealtimeEventType.statusChanged;
      } else if (newOfficer != null && oldOfficer == null) {
        type = RealtimeEventType.assigned;
      } else if (oldStatus == 'RESOLVED' && newStatus != 'RESOLVED') {
        type = RealtimeEventType.reopened;
      } else {
        type = RealtimeEventType.statusChanged;
      }
    }

    handleDedupeAndEmit(
      dedupeKey,
      ComplaintRealtimeEvent(
        type: type,
        complaintId: complaintId,
        complaintNumber: complaint.complaintNumber,
        data: record,
      ),
    );
  }

  // --- Handler for `complaint_status_history` table ---
  void handleStatusHistoryChange(PostgresChangePayload payload) {
    final record = payload.newRecord;
    final complaintId = record['complaint_id'] as String?;
    if (complaintId == null || !userComplaintIds.contains(complaintId)) return;

    final dedupeKey =
        '${payload.commitTimestamp.toIso8601String()}|history|${record['id']}';
    final status = record['status'] as String?;

    RealtimeEventType type;
    if (status == 'ASSIGNED') {
      type = RealtimeEventType.assigned;
    } else if (status == 'RESOLVED') {
      type = RealtimeEventType.statusChanged;
    } else if (status == 'REJECTED') {
      type = RealtimeEventType.rejected;
    } else {
      type = RealtimeEventType.statusChanged;
    }

    handleDedupeAndEmit(
      dedupeKey,
      ComplaintRealtimeEvent(
        type: type,
        complaintId: complaintId,
        data: record,
      ),
    );
  }

  // --- Handler for `resolution_evidence` table ---
  void handleEvidenceChange(PostgresChangePayload payload) {
    final record = payload.newRecord;
    final complaintId = record['complaint_id'] as String?;
    if (complaintId == null || !userComplaintIds.contains(complaintId)) return;

    final dedupeKey =
        '${payload.commitTimestamp.toIso8601String()}|evidence|${record['id']}';
    handleDedupeAndEmit(
      dedupeKey,
      ComplaintRealtimeEvent(
        type: RealtimeEventType.evidenceSubmitted,
        complaintId: complaintId,
      ),
    );
  }

  // --- Handler for `community_verifications` table ---
  void handleVerificationChange(PostgresChangePayload payload) {
    final record = payload.newRecord;
    final complaintId = record['complaint_id'] as String?;
    if (complaintId == null || !userComplaintIds.contains(complaintId)) return;

    final dedupeKey =
        '${payload.commitTimestamp.toIso8601String()}|verification|${record['id']}';
    handleDedupeAndEmit(
      dedupeKey,
      ComplaintRealtimeEvent(
        type: RealtimeEventType.verificationUpdate,
        complaintId: complaintId,
      ),
    );
  }

  AppLogger.info('realtime: subscribing to complaint lifecycle for $profileId');

  // Single channel with multiple table subscriptions.
  channel = client
      .channel('complaint-lifecycle:$profileId')
      // Complaints — filtered by user_id (server-side, RLS-enforced)
      .onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'complaints',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'user_id',
          value: profileId,
        ),
        callback: handleComplaintChange,
      )
      // Status history — no server-side filter; filtered client-side
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'complaint_status_history',
        callback: handleStatusHistoryChange,
      )
      // Resolution evidence — filtered client-side
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'resolution_evidence',
        callback: handleEvidenceChange,
      )
      // Community verifications — filtered client-side
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'community_verifications',
        callback: handleVerificationChange,
      )
      .subscribe((status, error) {
        switch (status) {
          case RealtimeSubscribeStatus.subscribed:
            AppLogger.info('realtime: lifecycle channel subscribed');
          case RealtimeSubscribeStatus.channelError:
            AppLogger.error('realtime: lifecycle channel error', error);
          case RealtimeSubscribeStatus.closed:
            AppLogger.warning(
                'realtime: lifecycle channel closed, will auto-reconnect');
          case RealtimeSubscribeStatus.timedOut:
            AppLogger.warning(
                'realtime: lifecycle channel timed out, will auto-reconnect');
        }
      });

  ref.onDispose(() {
    AppLogger.info('realtime: disposing complaint lifecycle subscription');
    controller.close();
    channel?.unsubscribe();
  });

  await for (final event in controller.stream) {
    yield event;
  }
});
