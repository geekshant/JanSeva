/// A configurable point rule from the `reward_rules` table.
///
/// Point values live in the database so they can be tuned without shipping
/// a new app build. The Flutter app only renders these values.
class RewardRule {
  const RewardRule({
    required this.activityType,
    required this.title,
    required this.points,
    this.description,
    this.active = true,
  });

  final String activityType;
  final String title;
  final int points;
  final String? description;
  final bool active;

  factory RewardRule.fromJson(Map<String, dynamic> json) {
    return RewardRule(
      activityType: json['activity_type'] as String,
      title: json['title'] as String,
      points: (json['points'] as num?)?.toInt() ?? 0,
      description: json['description'] as String?,
      active: json['active'] as bool? ?? true,
    );
  }

  /// Signed display value, e.g. "+50" or "-50".
  String get signedPoints => (points > 0 ? '+$points' : '$points');
}
