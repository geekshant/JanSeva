import 'category.dart';

/// Per-category AI evidence-verification configuration, mirroring the
/// `category_ai_config` table.
///
/// Drives the photo step (min/max images, different-angle hints) and tells
/// the report flow whether AI verification is enabled for the chosen
/// category.
class CategoryAiConfig {
  const CategoryAiConfig({
    required this.categoryId,
    this.requiresImages = false,
    this.minImages = 0,
    this.maxImages = 0,
    this.requiresDifferentAngles = false,
    this.aiVerificationEnabled = false,
    this.autoPass,
    this.autoFail,
    this.manualReviewThreshold,
    this.categoryHints,
  });

  final String categoryId;
  final bool requiresImages;
  final int minImages;
  final int maxImages;
  final bool requiresDifferentAngles;
  final bool aiVerificationEnabled;
  final num? autoPass;
  final num? autoFail;
  final num? manualReviewThreshold;
  final String? categoryHints;

  factory CategoryAiConfig.fromJson(Map<String, dynamic> json) {
    return CategoryAiConfig(
      categoryId: json['category_id'] as String,
      requiresImages: (json['requires_images'] as bool?) ?? false,
      minImages: (json['min_images'] as num?)?.toInt() ?? 0,
      maxImages: (json['max_images'] as num?)?.toInt() ?? 0,
      requiresDifferentAngles:
          (json['requires_different_angles'] as bool?) ?? false,
      aiVerificationEnabled:
          (json['ai_verification_enabled'] as bool?) ?? false,
      autoPass: json['auto_pass'] as num?,
      autoFail: json['auto_fail'] as num?,
      manualReviewThreshold: json['manual_review_threshold'] as num?,
      categoryHints: json['category_hints'] as String?,
    );
  }
}

/// A category paired with its (optional) AI verification config.
class CategoryWithAiConfig {
  const CategoryWithAiConfig({required this.category, this.aiConfig});

  final Category category;
  final CategoryAiConfig? aiConfig;
}
