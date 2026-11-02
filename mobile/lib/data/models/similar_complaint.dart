import 'package:intl/intl.dart';

import 'complaint_severity.dart';
import 'complaint_status.dart';

/// A privacy-safe candidate returned by the `find_similar_complaints` RPC.
///
/// Used by the Report Issue flow to surface nearby reports of the same
/// category so a citizen can decide to join an existing civic incident
/// instead of creating a duplicate. This deliberately exposes NO user
/// identifiers — only title, category, distance, status and (when the
/// candidate already belongs to an incident) the incident's report count.
class SimilarComplaint {
  const SimilarComplaint({
    required this.id,
    required this.complaintNumber,
    required this.title,
    required this.categoryId,
    required this.categoryName,
    required this.severity,
    required this.status,
    required this.address,
    required this.createdAt,
    required this.distanceMeters,
    required this.titleSimilarity,
    this.incidentId,
    this.incidentNumber,
    this.incidentReportCount = 0,
    this.incidentStatus,
  });

  final String id;
  final String complaintNumber;
  final String title;
  final String categoryId;
  final String categoryName;
  final ComplaintSeverity severity;
  final ComplaintStatus status;
  final String address;
  final DateTime createdAt;
  final double distanceMeters;
  final double titleSimilarity;

  /// Non-null when this candidate already belongs to a civic incident,
  /// meaning the citizen can join that existing incident directly.
  final String? incidentId;
  final String? incidentNumber;
  final int incidentReportCount;
  final String? incidentStatus;

  factory SimilarComplaint.fromJson(Map<String, dynamic> json) {
    return SimilarComplaint(
      id: json['complaint_id'] as String,
      complaintNumber: json['complaint_number'] as String,
      title: json['title'] as String,
      categoryId: json['category_id'] as String,
      categoryName: (json['category_name'] as String?) ?? '',
      severity: ComplaintSeverity.fromString(
        (json['severity'] as String?) ?? 'MEDIUM',
      ),
      status: ComplaintStatus.fromString(
        (json['status'] as String?) ?? 'SUBMITTED',
      ),
      address: (json['address'] as String?) ?? '',
      createdAt: DateTime.parse(json['created_at'] as String),
      distanceMeters:
          (json['distance_meters'] as num?)?.toDouble() ?? 0.0,
      titleSimilarity:
          (json['title_similarity'] as num?)?.toDouble() ?? 0.0,
      incidentId: json['incident_id'] as String?,
      incidentNumber: json['incident_number'] as String?,
      incidentReportCount:
          (json['incident_report_count'] as num?)?.toInt() ?? 0,
      incidentStatus: json['incident_status'] as String?,
    );
  }

  /// Whether this candidate is already part of a civic incident.
  bool get isPartOfIncident => incidentId != null;

  /// Total citizens backing this report (self + incident members if grouped).
  int get supporterCount => isPartOfIncident ? incidentReportCount : 1;

  /// Formats [createdAt] as e.g. "23 Sep 2026".
  String get formattedDate => DateFormat('d MMM yyyy').format(createdAt);

  /// Human-readable distance, e.g. "320 m" or "1.2 km".
  String get distanceLabel {
    final d = distanceMeters;
    if (d < 1000) return '${d.round()} m';
    return '${(d / 1000).toStringAsFixed(1)} km';
  }
}
