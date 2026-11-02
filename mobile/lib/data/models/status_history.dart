import 'package:intl/intl.dart';

import 'complaint_status.dart';

/// A single entry in the complaint status history, mapped from the
/// `complaint_status_history` table.
class StatusHistoryEntry {
  const StatusHistoryEntry({
    required this.id,
    required this.status,
    required this.createdAt,
    this.comment,
  });

  final String id;
  final ComplaintStatus status;
  final DateTime createdAt;
  final String? comment;

  factory StatusHistoryEntry.fromJson(Map<String, dynamic> json) {
    return StatusHistoryEntry(
      id: json['id'] as String,
      status: ComplaintStatus.fromString(
        (json['status'] as String?) ?? 'SUBMITTED',
      ),
      createdAt: DateTime.parse(json['created_at'] as String),
      comment: json['comment'] as String?,
    );
  }

  /// Formats [createdAt] as e.g. "26 Sep 2026, 2:30 PM".
  String get formattedDateTime =>
      DateFormat('d MMM yyyy, h:mm a').format(createdAt.toLocal());
}

/// Resolution evidence image, mapped from the `resolution_evidence` table.
/// These are "after" photos uploaded by the admin/officer when marking a
/// complaint as resolved.
class ResolutionEvidence {
  const ResolutionEvidence({
    required this.id,
    required this.storagePath,
    required this.createdAt,
    this.imageUrl,
    this.caption,
  });

  final String id;
  final String storagePath;
  final String? imageUrl;
  final String? caption;
  final DateTime createdAt;

  factory ResolutionEvidence.fromJson(Map<String, dynamic> json) {
    return ResolutionEvidence(
      id: json['id'] as String,
      storagePath: json['storage_path'] as String,
      imageUrl: json['image_url'] as String?,
      caption: json['caption'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  String get formattedDate => DateFormat('d MMM yyyy').format(createdAt);
}
