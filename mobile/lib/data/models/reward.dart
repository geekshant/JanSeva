import 'package:intl/intl.dart';

/// A point transaction from the `rewards` table.
///
/// Rows are inserted exclusively by server-side functions/triggers
/// (`award_points()`); the mobile client has no INSERT policy on `rewards`.
class Reward {
  const Reward({
    required this.id,
    required this.userId,
    required this.activityType,
    required this.points,
    required this.createdAt,
    this.complaintId,
    this.description,
    this.complaintNumber,
    this.complaintTitle,
  });

  final String id;
  final String userId;
  final String? complaintId;
  final String activityType;
  final int points;
  final String? description;
  final DateTime createdAt;

  /// Nested `complaints(complaint_number, title)` projection, when joined.
  final String? complaintNumber;
  final String? complaintTitle;

  factory Reward.fromJson(Map<String, dynamic> json) {
    final complaint = json['complaints'];
    return Reward(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      complaintId: json['complaint_id'] as String?,
      activityType: json['activity_type'] as String,
      points: (json['points'] as num?)?.toInt() ?? 0,
      description: json['description'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      complaintNumber: complaint is Map<String, dynamic>
          ? complaint['complaint_number'] as String?
          : null,
      complaintTitle:
          complaint is Map<String, dynamic> ? complaint['title'] as String? : null,
    );
  }

  /// True for penalty entries (e.g. DUPLICATE_OR_FAKE_REPORT).
  bool get isPenalty => points < 0;

  /// Formats [createdAt] as e.g. "23 Sep 2026".
  String get formattedDate => DateFormat('d MMM yyyy').format(createdAt);

  /// Signed display value, e.g. "+50" or "-50".
  String get signedPoints => (points > 0 ? '+$points' : '$points');
}
