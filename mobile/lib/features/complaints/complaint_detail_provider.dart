import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/errors/result.dart';
import '../../core/i18n/app_localizations.dart';
import '../../data/repositories/complaint_repository.dart';
import '../../data/repositories/repository_providers.dart';
import '../realtime/complaint_realtime_provider.dart';
import 'my_complaints_provider.dart';

/// Loads full complaint detail (complaint + all images + status history +
/// resolution evidence) by id for the detail screen.
final complaintDetailProvider =
    FutureProvider.family<ComplaintDetail, String>((ref, complaintId) async {
  final result =
      await ref.watch(complaintRepositoryProvider).fetchComplaintDetail(complaintId);
  return result.when(
    success: (detail) => detail,
    failure: (failure) {
      // Translate network-error i18n keys so the ErrorView shows a friendly,
      // actionable message instead of a raw SocketException dump.
      final msg = failure.message;
      final isI18nKey = msg.startsWith('error.') || msg.startsWith('auth.');
      throw Exception(isI18nKey ? AppLocalizations.translate(msg) : msg);
    },
  );
});

/// Watches the realtime complaint lifecycle stream and invalidates the
/// detail provider whenever an event relevant to the currently-viewed
/// complaint arrives — so the citizen app updates without a manual refresh.
///
/// Reacts to all event types that affect the detail view:
/// * statusChanged / assigned / reopened / rejected → refetch (new timeline
///   node, new status badge)
/// * evidenceSubmitted → refetch (new resolution evidence photos)
/// * verificationUpdate → refetch (new verification info)
///
/// Cleanup: this is a `Provider.family` watched by the detail screen. When
/// the screen is popped, Riverpod disposes the provider, which stops
/// watching the realtime stream — the underlying channel is cleaned up by
/// `complaintRealtimeProvider` when no more watchers remain.
final complaintDetailRealtimeProvider =
    Provider.family<void, String>((ref, complaintId) {
  ref.watch(complaintRealtimeProvider).maybeWhen(
    data: (event) {
      if (event.complaintId == complaintId) {
        ref.invalidate(complaintDetailProvider(complaintId));
      }
    },
    orElse: () {},
  );
});

/// Deletes a complaint (and its storage images). Only works for complaints
/// that haven't been verified yet (SUBMITTED, AUTO_VALIDATING, NEEDS_REVIEW).
/// The RLS DELETE policy enforces this server-side.
final deleteComplaintProvider =
    FutureProvider.family<Result<void>, String>((ref, complaintId) async {
  // Fetch the detail to get storage paths for image cleanup.
  final detailResult = await ref
      .read(complaintRepositoryProvider)
      .fetchComplaintDetail(complaintId);

  final storagePaths = <String>[];
  detailResult.when(
    success: (detail) {
      for (final img in detail.images) {
        if (img.storagePath != null) {
          storagePaths.add(img.storagePath!);
        }
      }
    },
    failure: (_) {},
  );

  final result = await ref
      .read(complaintRepositoryProvider)
      .deleteComplaint(
        complaintId: complaintId,
        storagePaths: storagePaths,
      );

  result.when(
    success: (_) {
      ref.invalidate(complaintDetailProvider(complaintId));
      ref.invalidate(myComplaintsProvider);
    },
    failure: (_) {},
  );

  return result;
});
