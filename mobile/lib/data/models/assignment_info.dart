/// Assignment information for a complaint — the department and officer it
/// was routed to, plus the routing method and timing.
///
/// The citizen sees this on the complaint detail screen so they know who is
/// handling their complaint. Sensitive officer contact details (phone, email)
/// are NOT exposed to citizens — only the officer's name, title, department,
/// and ward.
class AssignmentInfo {
  const AssignmentInfo({
    this.departmentName,
    this.departmentCode,
    this.officerName,
    this.officerTitle,
    this.ward,
    this.routingMethod,
    this.assignedAt,
  });

  /// Department name (e.g. "Public Works").
  final String? departmentName;

  /// Department code (e.g. "PWD").
  final String? departmentCode;

  /// Officer's display name (from their profile).
  final String? officerName;

  /// Officer's designation/title (e.g. "Roads Inspector").
  final String? officerTitle;

  /// Ward the officer covers / the complaint is in.
  final String? ward;

  /// How the assignment was made: "auto" (automatic) or "manual" (admin).
  final String? routingMethod;

  /// When the assignment was made (from complaint_assignments.assigned_at).
  final DateTime? assignedAt;

  /// Whether the complaint has been assigned to a department.
  bool get hasDepartment => departmentName != null && departmentName!.isNotEmpty;

  /// Whether an officer has been assigned (not just the department).
  bool get hasOfficer => officerName != null && officerName!.isNotEmpty;

  /// Human-readable routing label for the UI.
  String get routingLabel => routingMethod == 'auto' ? 'Automatic' : 'Manual';

  factory AssignmentInfo.fromJson(Map<String, dynamic> json) {
    // Parse the assigned_at from the latest complaint_assignments record.
    DateTime? assignedAt;
    final assignments = json['complaint_assignments'];
    if (assignments is List && assignments.isNotEmpty) {
      final first = assignments.first;
      if (first is Map<String, dynamic>) {
        assignedAt = first['assigned_at'] == null
            ? null
            : DateTime.tryParse(first['assigned_at'] as String);
      }
    }

    // The officer's name is nested inside officers → profiles (FK chain:
    // complaints.assigned_officer_id → officers.id → officers.profile_id →
    // profiles.id).
    final officers = json['officers'];
    String? officerName;
    if (officers is Map<String, dynamic>) {
      final profiles = officers['profiles'];
      if (profiles is Map<String, dynamic>) {
        officerName = profiles['name'] as String?;
      }
    }

    return AssignmentInfo(
      departmentName: _parseString(json['departments'], 'name'),
      departmentCode: _parseString(json['departments'], 'code'),
      officerName: officerName,
      officerTitle: _parseString(json['officers'], 'title'),
      ward: _parseString(json['officers'], 'ward'),
      routingMethod: json['routing_method'] as String?,
      assignedAt: assignedAt,
    );
  }

  /// Parses a string field from a nested JSON object (which may be null).
  static String? _parseString(Object? nested, String key) {
    if (nested is! Map<String, dynamic>) return null;
    return nested[key] as String?;
  }
}
