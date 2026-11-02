import 'badge.dart';

/// A badge earned by a user, from the `user_badges` table with its nested
/// `badges` catalog row.
class UserBadge {
  const UserBadge({
    required this.id,
    required this.userId,
    required this.badgeId,
    required this.earnedAt,
    this.badge,
  });

  final String id;
  final String userId;
  final String badgeId;
  final DateTime earnedAt;
  final Badge? badge;

  factory UserBadge.fromJson(Map<String, dynamic> json) {
    final badge = json['badges'];
    return UserBadge(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      badgeId: json['badge_id'] as String,
      earnedAt: DateTime.parse(json['earned_at'] as String),
      badge: badge is Map<String, dynamic> ? Badge.fromJson(badge) : null,
    );
  }
}
