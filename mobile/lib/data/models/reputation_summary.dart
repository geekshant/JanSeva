/// The citizen's reputation summary, as computed server-side by the
/// `get_reputation_summary()` RPC.
///
/// Level titles and thresholds come from the `level_config` table and all
/// progress math happens in the database — Flutter only renders these values.
class ReputationSummary {
  const ReputationSummary({
    required this.points,
    required this.level,
    required this.levelTitle,
    required this.levelMinPoints,
    required this.pointsToNext,
    required this.progressPercent,
    required this.isMaxLevel,
    required this.badgeCount,
    this.nextLevel,
    this.nextLevelTitle,
    this.nextLevelMinPoints,
  });

  final int points;
  final int level;
  final String levelTitle;
  final int levelMinPoints;
  final int? nextLevel;
  final String? nextLevelTitle;
  final int? nextLevelMinPoints;
  final int pointsToNext;
  final int progressPercent;
  final bool isMaxLevel;
  final int badgeCount;

  factory ReputationSummary.fromJson(Map<String, dynamic> json) {
    return ReputationSummary(
      points: (json['points'] as num?)?.toInt() ?? 0,
      level: (json['level'] as num?)?.toInt() ?? 1,
      levelTitle: json['level_title'] as String? ?? 'Civic Starter',
      levelMinPoints: (json['level_min_points'] as num?)?.toInt() ?? 0,
      nextLevel: (json['next_level'] as num?)?.toInt(),
      nextLevelTitle: json['next_level_title'] as String?,
      nextLevelMinPoints: (json['next_level_min_points'] as num?)?.toInt(),
      pointsToNext: (json['points_to_next'] as num?)?.toInt() ?? 0,
      progressPercent: (json['progress_percent'] as num?)?.toInt() ?? 0,
      isMaxLevel: json['is_max_level'] as bool? ?? false,
      badgeCount: (json['badge_count'] as num?)?.toInt() ?? 0,
    );
  }

  /// "Level 3 — Community Helper", ready for display.
  String get levelLabel => 'Level $level — $levelTitle';
}
