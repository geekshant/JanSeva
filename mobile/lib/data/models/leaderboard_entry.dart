/// A single entry in the community leaderboard.
class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.name,
    required this.points,
    required this.level,
    required this.isMe,
  });

  final int rank;
  final String name;
  final int points;
  final int level;
  final bool isMe;

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    return LeaderboardEntry(
      rank: (json['rank'] as num).toInt(),
      name: json['name'] as String,
      points: (json['points'] as num).toInt(),
      level: (json['level'] as num).toInt(),
      isMe: json['is_me'] as bool? ?? false,
    );
  }
}
