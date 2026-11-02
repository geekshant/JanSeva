import 'package:intl/intl.dart';

import 'geo_point.dart';

/// A nearby resolved complaint awaiting community verification, mapped from
/// the `verifiable_complaints` RPC. Image `storage_path`s are signed
/// client-side before display (the `complaint_images` bucket is private).
class VerifiableComplaint {
  VerifiableComplaint({
    required this.id,
    required this.complaintNumber,
    required this.title,
    this.categoryName,
    this.categoryIcon,
    this.address,
    required this.createdAt,
    this.resolvedAt,
    this.location,
    this.distanceMeters,
    this.beforeImagePath,
    this.afterImagePath,
    this.beforeImageUrl,
    this.afterImageUrl,
    this.verifiedCount = 0,
    this.rejectedCount = 0,
    this.hasVerified = false,
  });

  final String id;
  final String complaintNumber;
  final String title;
  final String? categoryName;
  final String? categoryIcon;
  final String? address;
  final DateTime createdAt;
  final DateTime? resolvedAt;
  final GeoPoint? location;
  final double? distanceMeters;

  /// Storage paths for the first "before" (original) and "after" (resolution)
  /// images. Signed into display URLs by the repository.
  final String? beforeImagePath;
  final String? afterImagePath;

  /// Signed display URLs populated by the repository from [beforeImagePath] /
  /// [afterImagePath] (the `complaint_images` bucket is private, so the stored
  /// path must be signed before it can be rendered).
  final String? beforeImageUrl;
  final String? afterImageUrl;

  final int verifiedCount;
  final int rejectedCount;

  /// Whether the current user has already submitted a response.
  final bool hasVerified;

  factory VerifiableComplaint.fromJson(Map<String, dynamic> json) {
    return VerifiableComplaint(
      id: json['id'] as String,
      complaintNumber: json['complaint_number'] as String,
      title: json['title'] as String,
      categoryName: json['category_name'] as String?,
      categoryIcon: json['category_icon'] as String?,
      address: json['address'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      resolvedAt: json['resolved_at'] == null
          ? null
          : DateTime.parse(json['resolved_at'] as String),
      location: GeoPoint.tryFromGeoJson(json['location']),
      distanceMeters: (json['distance_meters'] as num?)?.toDouble(),
      beforeImagePath: json['before_image_path'] as String?,
      afterImagePath: json['after_image_path'] as String?,
      beforeImageUrl: json['before_image_url'] as String?,
      afterImageUrl: json['after_image_url'] as String?,
      verifiedCount: (json['verified_count'] as num?)?.toInt() ?? 0,
      rejectedCount: (json['rejected_count'] as num?)?.toInt() ?? 0,
      hasVerified: json['has_verified'] as bool? ?? false,
    );
  }

  /// Formats [createdAt] as e.g. "23 Sep 2026".
  String get formattedDate => DateFormat('d MMM yyyy').format(createdAt);

  /// Human-readable distance, e.g. "320 m" or "1.2 km".
  String get distanceLabel {
    final d = distanceMeters;
    if (d == null) return '';
    if (d < 1000) return '${d.round()} m';
    return '${(d / 1000).toStringAsFixed(1)} km';
  }
}
