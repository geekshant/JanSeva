import 'package:intl/intl.dart';

import 'complaint_severity.dart';
import 'complaint_status.dart';
import 'geo_point.dart';

/// A privacy-safe representation of a nearby complaint for the map view.
///
/// Unlike [Complaint], this does NOT contain `user_id` or the full
/// description — only what's needed to display a marker and a detail sheet.
class NearbyComplaint {
  const NearbyComplaint({
    required this.id,
    required this.complaintNumber,
    required this.categoryId,
    required this.title,
    this.description,
    this.severity = ComplaintSeverity.medium,
    this.status = ComplaintStatus.submitted,
    this.address,
    required this.createdAt,
    this.categoryName,
    this.categoryIcon,
    required this.location,
    this.distanceMeters,
    this.departmentName,
    this.imageUrl,
    this.slaDeadline,
    this.slaStatus,
  });

  final String id;
  final String complaintNumber;
  final String categoryId;
  final String title;
  final String? description;
  final ComplaintSeverity severity;
  final ComplaintStatus status;
  final String? address;
  final DateTime createdAt;
  final String? categoryName;
  final String? categoryIcon;
  final GeoPoint location;
  final double? distanceMeters;
  final String? departmentName;
  final String? imageUrl;
  final DateTime? slaDeadline;
  final String? slaStatus;

  factory NearbyComplaint.fromJson(Map<String, dynamic> json) {
    final loc = GeoPoint.tryFromGeoJson(json['location']);
    return NearbyComplaint(
      id: json['id'] as String,
      complaintNumber: json['complaint_number'] as String,
      categoryId: json['category_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      severity: ComplaintSeverity.fromString(
        (json['severity'] as String?) ?? 'MEDIUM',
      ),
      status: ComplaintStatus.fromString(
        (json['status'] as String?) ?? 'SUBMITTED',
      ),
      address: json['address'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      categoryName: json['category_name'] as String?,
      categoryIcon: json['category_icon'] as String?,
      location: loc ?? const GeoPoint(latitude: 0, longitude: 0),
      distanceMeters: (json['distance_meters'] as num?)?.toDouble(),
      departmentName: json['department_name'] as String?,
      imageUrl: json['image_url'] as String?,
      slaDeadline: json['sla_deadline'] != null
          ? DateTime.tryParse(json['sla_deadline'] as String)
          : null,
      slaStatus: json['sla_status'] as String?,
    );
  }

  String get formattedDate => DateFormat('d MMM yyyy').format(createdAt);

  String get distanceLabel {
    final d = distanceMeters;
    if (d == null) return '';
    if (d < 1000) return '${d.round()} m';
    return '${(d / 1000).toStringAsFixed(1)} km';
  }

  String get timeAgo {
    final diff = DateTime.now().difference(createdAt);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return formattedDate;
  }
}

/// A heatmap grid point representing complaint density at a location.
class HeatmapPoint {
  const HeatmapPoint({
    required this.latitude,
    required this.longitude,
    required this.intensity,
  });

  final double latitude;
  final double longitude;
  final int intensity;

  factory HeatmapPoint.fromJson(Map<String, dynamic> json) {
    return HeatmapPoint(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      intensity: json['intensity'] as int,
    );
  }
}
