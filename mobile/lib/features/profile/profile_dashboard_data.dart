import '../../data/models/profile.dart';
import '../../data/models/reputation_summary.dart';

/// Everything the Profile tab needs, fetched in parallel from Supabase.
///
/// Statistics are real, user-scoped counts — no hard-coded values.
/// `points` / `level` / reward history come from the server-owned reputation
/// system and are never writable from the client.
class ProfileDashboardData {
  const ProfileDashboardData({
    required this.profile,
    required this.reportsSubmitted,
    required this.reportsVerified,
    required this.issuesResolved,
    required this.badgeCount,
    this.summary,
    this.aadhaarMasked,
    this.aadhaarStatus,
  });

  /// The citizen's own `profiles` row (name, avatar, phone, points, level).
  final Profile profile;

  /// Masked Aadhaar number (`XXXX XXXX 9012`) from the citizen's linked
  /// Aadhaar; `null` until they have linked one. The full number is never
  /// available to the client.
  final String? aadhaarMasked;

  /// Raw KYC status (`pending` / `verified` / `rejected`) or `null` when no
  /// Aadhaar has been linked.
  final String? aadhaarStatus;

  /// Whether the linked Aadhaar passed verification.
  bool get aadhaarVerified => aadhaarStatus == 'verified';

  /// Server-computed reputation (points, level title, badge count) when the
  /// `get_reputation_summary()` RPC succeeds; null falls back to profile.
  final ReputationSummary? summary;

  /// Total complaints filed by this citizen.
  final int reportsSubmitted;

  /// This citizen's complaints with status VERIFIED.
  final int reportsVerified;

  /// This citizen's complaints with status RESOLVED.
  final int issuesResolved;

  /// Badges earned (`user_badges` count, or summary badge_count).
  final int badgeCount;

  /// Points to display — summary is authoritative when available.
  int get pointsEarned => summary?.points ?? profile.points;

  /// "Level 3 — Community Helper" style label for the header.
  String get levelLabel {
    final s = summary;
    if (s != null) return s.levelLabel;
    return 'Level ${profile.level}';
  }

  /// Progress toward the next level (0–100); null when unknown.
  int? get progressPercent => summary?.progressPercent;
}
