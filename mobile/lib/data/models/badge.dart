/// A civic badge (reference data from the `badges` table).
class Badge {
  const Badge({
    required this.id,
    required this.name,
    this.description,
    this.icon,
    this.criteria,
  });

  final String id;
  final String name;
  final String? description;
  final String? icon;
  final String? criteria;

  factory Badge.fromJson(Map<String, dynamic> json) {
    return Badge(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      criteria: json['criteria'] as String?,
    );
  }
}
