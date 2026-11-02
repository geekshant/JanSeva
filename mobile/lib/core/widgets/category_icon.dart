import 'package:flutter/material.dart';

/// Maps category `icon` text values (from the database) to [IconData].
class CategoryIconHelper {
  CategoryIconHelper._();

  static IconData iconFor(String? name) {
    switch (name) {
      case 'report_problem':
        return Icons.report_problem_rounded;
      case 'add_road':
        return Icons.add_road_rounded;
      case 'delete_outline':
        return Icons.delete_outline_rounded;
      case 'water_drop':
        return Icons.water_drop_rounded;
      case 'lightbulb_outline':
        return Icons.lightbulb_outline_rounded;
      case 'domain_disabled':
        return Icons.domain_disabled_rounded;
      case 'engineering':
        return Icons.engineering_rounded;
      case 'pets':
        return Icons.pets_rounded;
      case 'security':
        return Icons.security_rounded;
      case 'category':
        return Icons.category_rounded;
      default:
        return Icons.category_rounded;
    }
  }

  /// Distinct accent color per category index, for attractive cards.
  static Color colorFor(int index) {
    const colors = [
      Color(0xFFE53935),
      Color(0xFFD81B60),
      Color(0xFF8E24AA),
      Color(0xFF5E35B1),
      Color(0xFF3949AB),
      Color(0xFF1E88E5),
      Color(0xFF039BE5),
      Color(0xFF00897B),
      Color(0xFF43A047),
      Color(0xFF7CB342),
    ];
    return colors[index % colors.length];
  }
}
