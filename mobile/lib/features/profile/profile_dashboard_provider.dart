import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/app_logger.dart';
import '../../core/errors/result.dart';
import '../../data/repositories/repository_providers.dart';
import '../auth/auth_provider.dart';
import 'profile_dashboard_data.dart';

/// Fetches everything the Profile tab needs, in parallel, from Supabase.
///
/// Exposed as a [FutureProvider] so the screen gets loading/data/error states
/// for free, and pull-to-refresh is just `ref.invalidate(profileDashboardProvider)`.
///
/// All statistics are user-scoped real database rows. Points, level and
/// badge counts come from the server-owned reputation system — the client
/// never computes or writes them.
final profileDashboardProvider = FutureProvider<ProfileDashboardData>((
  ref,
) async {
  final authRepo = ref.watch(authRepositoryProvider);
  final profileRepo = ref.watch(profileRepositoryProvider);
  final complaintRepo = ref.watch(complaintRepositoryProvider);
  final rewardsRepo = ref.watch(rewardsRepositoryProvider);
  final kycRepo = ref.watch(aadhaarKycRepositoryProvider);

  final userId = authRepo.currentUserId;
  if (userId == null) {
    throw StateError('Not signed in.');
  }

  // 1) Profile (must exist; auto-created on signup by the DB trigger).
  final profileResult = await profileRepo.fetchCurrentProfile();
  if (profileResult.isFailure) {
    throw Exception(profileResult.failureOrNull!.message);
  }
  final profile = profileResult.dataOrNull!;

  // 2) Kick off the remaining fetches in parallel.
  final summaryFuture = rewardsRepo.fetchSummary();
  final reportsFuture = complaintRepo.fetchReportsCount(profile.id);
  final verifiedFuture = complaintRepo.fetchUserCountByStatus(
    profileId: profile.id,
    statusLabel: 'VERIFIED',
  );
  final resolvedFuture = complaintRepo.fetchUserCountByStatus(
    profileId: profile.id,
    statusLabel: 'RESOLVED',
  );
  final badgesFuture = profileRepo.fetchBadgeCount(profile.id);
  // Aadhaar registration status — renders as the masked number on the header.
  final kycFuture = kycRepo.fetchRecord();

  final summaryResult = await summaryFuture;
  final reportsResult = await reportsFuture;
  final verifiedResult = await verifiedFuture;
  final resolvedResult = await resolvedFuture;
  final badgesResult = await badgesFuture;
  final kycResult = await kycFuture;

  _logPartial('summary', summaryResult);
  _logPartial('reports', reportsResult);
  _logPartial('verified', verifiedResult);
  _logPartial('resolved', resolvedResult);
  _logPartial('badges', badgesResult);
  _logPartial('aadhaar', kycResult);

  final summary = summaryResult.dataOrNull;

  return ProfileDashboardData(
    profile: profile,
    summary: summary,
    reportsSubmitted: reportsResult.dataOrNull ?? 0,
    reportsVerified: verifiedResult.dataOrNull ?? 0,
    issuesResolved: resolvedResult.dataOrNull ?? 0,
    badgeCount: summary?.badgeCount ?? badgesResult.dataOrNull ?? 0,
    aadhaarMasked: kycResult.dataOrNull?.maskedAadhaar,
    aadhaarStatus: kycResult.dataOrNull?.status,
  );
});

void _logPartial<T>(String label, Result<T> result) {
  final failure = result.failureOrNull;
  if (failure != null) {
    AppLogger.warning(
      'profileDashboard: partial failure [$label]: '
      '${failure.message}',
    );
  }
}
