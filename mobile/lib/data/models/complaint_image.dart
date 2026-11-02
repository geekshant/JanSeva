import 'geo_point.dart';

/// An image attached to a complaint, mapped from `complaint_images`.
class ComplaintImage {
  const ComplaintImage({
    required this.id,
    required this.complaintId,
    required this.storagePath,
    required this.imageUrl,
  });

  final String id;
  final String complaintId;
  final String storagePath;
  final String imageUrl;

  factory ComplaintImage.fromJson(Map<String, dynamic> json) {
    return ComplaintImage(
      id: json['id'] as String,
      complaintId: json['complaint_id'] as String,
      storagePath: json['storage_path'] as String,
      imageUrl: json['image_url'] as String,
    );
  }

  /// Parses a list of nested image rows from a Supabase join response.
  /// Returns the first image's URL, or `null` if none exist.
  static String? firstImageUrlFromJson(Object? value) {
    if (value is! List || value.isEmpty) return null;
    final first = value.first;
    if (first is! Map<String, dynamic>) return null;
    return first['image_url'] as String?;
  }

  /// Parses a list of nested image rows into [GeoPoint] is not applicable here;
  /// kept simple for the thumbnail use case.
  static List<ComplaintImage> listFromJson(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map<String, dynamic>>()
        .map(ComplaintImage.fromJson)
        .toList(growable: false);
  }
}
