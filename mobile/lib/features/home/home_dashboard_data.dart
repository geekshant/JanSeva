import '../../data/models/complaint.dart';
import '../../data/models/nearby_complaint.dart';
import '../../data/models/profile.dart';

/// Community-wide complaint counts shown in the Home "Community Snapshot".
class CommunitySnapshot {
  const CommunitySnapshot({
    required this.nearbyIssues,
    required this.resolvedIssues,
    required this.inProgressIssues,
    required this.pendingIssues,
  });

  /// Total visible complaints with a location.
  final int nearbyIssues;
  final int resolvedIssues;
  final int inProgressIssues;
  final int pendingIssues;
}

/// All data needed to render the Home dashboard, fetched in parallel.
class HomeDashboardData {
  const HomeDashboardData({
    required this.profile,
    required this.levelTitle,
    required this.badgeCount,
    required this.reportsCount,
    required this.recentComplaints,
    required this.snapshot,
    this.evidenceRequiredCount = 0,
    this.nearbyPreview = const [],
  });

  final Profile profile;

  /// Level display title from the configurable `level_config` table.
  final String levelTitle;
  final int badgeCount;
  final int reportsCount;
  final List<Complaint> recentComplaints;
  final CommunitySnapshot snapshot;

  /// Number of the citizen's complaints in `EVIDENCE_REQUIRED` status —
  /// drives the "Action Required" alert on the home dashboard.
  final int evidenceRequiredCount;

  /// A small preview of nearby civic issues (max 3) for the home dashboard.
  /// Empty when GPS permission is denied or no issues are within range —
  /// the section hides gracefully in that case.
  final List<NearbyComplaint> nearbyPreview;
}
