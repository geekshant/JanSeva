/// A civic issue category (reference data from the `categories` table).
class Category {
  const Category({
    required this.id,
    required this.name,
    this.description,
    this.icon,
    this.active = true,
  });

  final String id;
  final String name;
  final String? description;
  final String? icon;
  final bool active;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      icon: json['icon'] as String?,
      active: (json['active'] as bool?) ?? true,
    );
  }
}
