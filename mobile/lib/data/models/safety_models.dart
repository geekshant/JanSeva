/// Safety models for the Women Safety feature.
library;

/// Trusted contact (max 3 per user).
class SafetyContact {
  const SafetyContact({
    required this.id,
    required this.userId,
    required this.name,
    required this.phone,
    this.relationship,
    this.createdAt,
  });

  final String id;
  final String userId;
  final String name;
  final String phone;
  final String? relationship;
  final String? createdAt;

  SafetyContact copyWith({String? name, String? phone, String? relationship}) {
    return SafetyContact(
      id: id,
      userId: userId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      relationship: relationship ?? this.relationship,
      createdAt: createdAt,
    );
  }

  factory SafetyContact.fromJson(Map<String, dynamic> json) {
    return SafetyContact(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      relationship: json['relationship'] as String?,
      createdAt: json['created_at'] as String?,
    );
  }
}

/// Safety incident (SOS, check-in, anonymous report).
class SafetyIncident {
  const SafetyIncident({
    required this.id,
    required this.userId,
    required this.type,
    required this.status,
    this.latitude,
    this.longitude,
    this.address,
    this.message,
    this.anonymous = false,
    this.reportedAt,
    this.resolvedAt,
    this.resolvedNote,
  });

  final String id;
  final String userId;
  final String type; // SOS | CHECK_IN | ANONYMOUS_REPORT
  final String status; // ACTIVE | RESPONDING | RESOLVED | CANCELLED | EXPIRED
  final double? latitude;
  final double? longitude;
  final String? address;
  final String? message;
  final bool anonymous;
  final String? reportedAt;
  final String? resolvedAt;
  final String? resolvedNote;

  bool get isActive => status == 'ACTIVE' || status == 'RESPONDING';

  factory SafetyIncident.fromJson(Map<String, dynamic> json) {
    return SafetyIncident(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      address: json['address'] as String?,
      message: json['message'] as String?,
      anonymous: json['anonymous'] as bool? ?? false,
      reportedAt: json['reported_at'] as String?,
      resolvedAt: json['resolved_at'] as String?,
      resolvedNote: json['resolved_note'] as String?,
    );
  }
}

/// Safety check-in.
class SafetyCheckIn {
  const SafetyCheckIn({
    required this.id,
    required this.userId,
    required this.status,
    this.checkInAt,
    required this.expectedAt,
    this.incidentId,
  });

  final String id;
  final String userId;
  final String status; // pending | checked_in | missed
  final String? checkInAt;
  final String expectedAt;
  final String? incidentId;

  bool get isPending => status == 'pending';
  bool get isCheckedIn => status == 'checked_in';
  bool get isMissed => status == 'missed';

  DateTime get expectedAtTime => DateTime.parse(expectedAt);
  bool get isOverdue => isPending && DateTime.now().isAfter(expectedAtTime);

  factory SafetyCheckIn.fromJson(Map<String, dynamic> json) {
    return SafetyCheckIn(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      status: json['status'] as String,
      checkInAt: json['check_in_at'] as String?,
      expectedAt: json['expected_at'] as String,
      incidentId: json['incident_id'] as String?,
    );
  }
}

/// Nearby safety place (police/hospital/safe place).
class SafetyPlace {
  const SafetyPlace({
    required this.id,
    required this.name,
    required this.type,
    required this.latitude,
    required this.longitude,
    this.address,
    this.phone,
    this.is24x7 = false,
    this.distanceM,
  });

  final String id;
  final String name;
  final String type; // POLICE | HOSPITAL | SAFE_PLACE
  final double latitude;
  final double longitude;
  final String? address;
  final String? phone;
  final bool is24x7;
  final double? distanceM;

  String get distanceLabel {
    if (distanceM == null) return '';
    if (distanceM! < 1000) return '${distanceM!.round()} m';
    return '${(distanceM! / 1000).toStringAsFixed(1)} km';
  }

  factory SafetyPlace.fromJson(Map<String, dynamic> json) {
    return SafetyPlace(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      address: json['address'] as String?,
      phone: json['phone'] as String?,
      is24x7: json['is_24x7'] as bool? ?? false,
      distanceM: (json['distance_m'] as num?)?.toDouble(),
    );
  }
}
