import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/utils/app_logger.dart';
import '../../core/errors/result.dart';
import '../../data/models/complaint.dart';
import '../../data/models/nearby_complaint.dart';
import '../../data/repositories/complaint_repository.dart';
import '../../data/repositories/repository_providers.dart';
import '../auth/auth_provider.dart';
import 'home_dashboard_data.dart';

/// Fetches everything the Home dashboard needs, in parallel, from Supabase.
///
/// Exposed as a [FutureProvider] so the screen gets loading/data/error states
/// for free, and pull-to-refresh is just `ref.invalidate(homeDashboardProvider)`.
///
/// All statistics are computed from real database rows - no hard-coded values.
/// The nearby preview is best-effort: if GPS is unavailable or the query
/// fails, the section simply hides instead of breaking the dashboard.
final homeDashboardProvider = FutureProvider<HomeDashboardData>((ref) async {
  final authRepo = ref.watch(authRepositoryProvider);
  final profileRepo = ref.watch(profileRepositoryProvider);
  final complaintRepo = ref.watch(complaintRepositoryProvider);

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

  // 2) Kick off the remaining fetches in parallel (each Future starts
  //    executing immediately, before any await below).
  final levelTitleFuture =
      ref.watch(rewardsRepositoryProvider).fetchLevelTitle(profile.level);
  final badgeFuture = profileRepo.fetchBadgeCount(profile.id);
  final reportsFuture = complaintRepo.fetchReportsCount(profile.id);
  final recentFuture =
      complaintRepo.fetchRecentComplaints(profileId: profile.id);
  final statsFuture = complaintRepo.fetchCommunityStats();
  final evidenceRequiredFuture = complaintRepo.fetchUserCountByStatus(
    profileId: profile.id,
    statusLabel: 'EVIDENCE_REQUIRED',
  );

  // 3) Await each, keeping proper static typing (no unsafe casts).
  final levelTitleResult = await levelTitleFuture;
  final badgeResult = await badgeFuture;
  final reportsResult = await reportsFuture;
  final recentResult = await recentFuture;
  final statsResult = await statsFuture;
  final evidenceRequiredResult = await evidenceRequiredFuture;

  _logPartial('levelTitle', levelTitleResult);
  _logPartial('badges', badgeResult);
  _logPartial('reports', reportsResult);
  _logPartial('recent', recentResult);
  _logPartial('stats', statsResult);
  _logPartial('evidenceRequired', evidenceRequiredResult);

  final List<Complaint> recentComplaints = recentResult.dataOrNull ?? const [];
  final stats = statsResult.dataOrNull ?? const CommunityStats();

  return HomeDashboardData(
    profile: profile,
    levelTitle: levelTitleResult.dataOrNull ?? 'Level ${profile.level}',
    badgeCount: badgeResult.dataOrNull ?? 0,
    reportsCount: reportsResult.dataOrNull ?? 0,
    recentComplaints: recentComplaints,
    evidenceRequiredCount: evidenceRequiredResult.dataOrNull ?? 0,
    snapshot: CommunitySnapshot(
      nearbyIssues: stats.nearbyIssues,
      resolvedIssues: stats.resolvedIssues,
      inProgressIssues: stats.inProgressIssues,
      pendingIssues: stats.pendingIssues,
    ),
  );
});

/// Best-effort GPS position for the home dashboard. Returns `null` when GPS
/// is unavailable instead of throwing, so the nearby preview hides
/// gracefully without breaking the rest of the dashboard.
final currentLocationFuture = FutureProvider<Position?>((ref) async {
  try {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return null;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return null;
    }
    return await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
  } catch (e) {
    AppLogger.warning('currentLocationFuture: $e');
    return null;
  }
});

/// Best-effort nearby preview for the home dashboard.
///
/// Attempts to get the user's GPS position and fetch up to 3 nearby
/// complaints within 2 km. Returns an empty list when GPS is unavailable
/// or the query fails — the home section hides gracefully. Kept as a
/// separate provider so it loads independently and doesn't block the
/// main dashboard.
final homeNearbyPreviewProvider =
    FutureProvider<List<NearbyComplaint>>((ref) async {
  try {
    final position = await ref.watch(currentLocationFuture.future);
    if (position == null) return const [];
    final complaintRepo = ref.watch(complaintRepositoryProvider);
    final result = await complaintRepo.fetchNearbyComplaints(
      latitude: position.latitude,
      longitude: position.longitude,
      radiusMeters: 2000,
      limit: 3,
    );
    return result.dataOrNull ?? const [];
  } catch (e) {
    AppLogger.warning('homeNearbyPreview: $e');
    return const [];
  }
});

void _logPartial<T>(String label, Result<T> result) {
  final failure = result.failureOrNull;
  if (failure != null) {
    AppLogger.warning('homeDashboard: partial failure [$label]: '
        '${failure.message}');
  }
}
