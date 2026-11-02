import 'package:intl/intl.dart';

import 'assignment_info.dart';
import 'category.dart';
import 'complaint_severity.dart';
import 'complaint_status.dart';
import 'geo_point.dart';

/// A civic complaint, mapped from the `complaints` table (with optional nested
/// `categories` and `complaint_images` rows from Supabase joins).
class Complaint {
  const Complaint({
    required this.id,
    required this.complaintNumber,
    required this.userId,
    required this.categoryId,
    required this.title,
    this.description,
    this.severity = ComplaintSeverity.medium,
    this.status = ComplaintStatus.submitted,
    this.location,
    this.address,
    required this.createdAt,
    this.updatedAt,
    this.resolvedAt,
    this.slaDeadline,
    this.category,
    this.thumbnailUrl,
    this.incidentId,
    this.incidentNumber,
    this.incidentReportCount,
    this.incidentCitizenCount,
    this.evidenceRequestMessage,
    this.assignment,
  });

  final String id;
  final String complaintNumber;
  final String userId;
  final String categoryId;
  final String title;
  final String? description;
  final ComplaintSeverity severity;
  final ComplaintStatus status;
  final GeoPoint? location;
  final String? address;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? resolvedAt;
  final DateTime? slaDeadline;

  /// Nested category row (present when fetched with `categories(*)`).
  final Category? category;

  /// First image URL (present when fetched with `complaint_images(image_url)`).
  final String? thumbnailUrl;

  /// Id of the civic incident this complaint was grouped into, if any.
  /// Present when the complaint was joined into a duplicate incident.
  final String? incidentId;
  final String? incidentNumber;
  final int? incidentReportCount;
  final int? incidentCitizenCount;

  /// Officer's message to the citizen when more evidence is needed.
  /// Populated when the complaint status is `EVIDENCE_REQUIRED`.
  final String? evidenceRequestMessage;

  /// Department + officer assignment info (present when the complaint has been
  /// assigned). The citizen sees this on the detail screen.
  final AssignmentInfo? assignment;

  /// True when this complaint is part of a civic incident (a grouped report).
  bool get isPartOfIncident => incidentId != null;

  factory Complaint.fromJson(Map<String, dynamic> json) {
    return Complaint(
      id: json['id'] as String,
      complaintNumber: json['complaint_number'] as String,
      userId: json['user_id'] as String,
      categoryId: json['category_id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      severity: ComplaintSeverity.fromString(
        (json['severity'] as String?) ?? 'MEDIUM',
      ),
      status: ComplaintStatus.fromString(
        (json['status'] as String?) ?? 'SUBMITTED',
      ),
      location: GeoPoint.tryFromGeoJson(json['location']),
      address: json['address'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] == null
          ? null
          : DateTime.parse(json['updated_at'] as String),
      resolvedAt: json['resolved_at'] == null
          ? null
          : DateTime.parse(json['resolved_at'] as String),
      slaDeadline: json['sla_deadline'] == null
          ? null
          : DateTime.parse(json['sla_deadline'] as String),
      category: json['categories'] is Map<String, dynamic>
          ? Category.fromJson(json['categories'] as Map<String, dynamic>)
          : null,
      thumbnailUrl: _parseThumbnail(json['complaint_images']),
      incidentId: json['incident_id'] as String?,
      incidentNumber: _parseIncidentField(json['civic_incidents'], 'incident_number'),
      incidentReportCount:
          _parseIncidentInt(json['civic_incidents'], 'report_count'),
      incidentCitizenCount:
          _parseIncidentInt(json['civic_incidents'], 'citizen_count'),
      evidenceRequestMessage: json['evidence_request_message'] as String?,
      assignment: _parseAssignment(json),
    );
  }

  /// Parses the assignment info from nested `departments` + `officers` +
  /// `officer_profile` joins. Returns null when the complaint has no
  /// department assigned.
  static AssignmentInfo? _parseAssignment(Map<String, dynamic> json) {
    final dept = json['departments'];
    if (dept is! Map<String, dynamic>) return null;
    return AssignmentInfo.fromJson(json);
  }

  static String? _parseThumbnail(Object? images) {
    if (images is! List || images.isEmpty) return null;
    final first = images.first;
    if (first is! Map<String, dynamic>) return null;
    return first['image_url'] as String?;
  }

  /// Reads a string field from the nested `civic_incidents` join (which may be
  /// a single object or null when the complaint is not part of an incident).
  static String? _parseIncidentField(Object? incident, String key) {
    if (incident is! Map<String, dynamic>) return null;
    return incident[key] as String?;
  }

  static int? _parseIncidentInt(Object? incident, String key) {
    if (incident is! Map<String, dynamic>) return null;
    final v = incident[key];
    return v is num ? v.toInt() : null;
  }

  /// Formats [createdAt] as e.g. "23 Sep 2026".
  String get formattedDate => DateFormat('d MMM yyyy').format(createdAt);
}
