/// The signed-in citizen's Aadhaar registration row (`aadhaar_kyc`).
///
/// Only the masked number and the server-computed status are ever sent to the
/// app — the raw Aadhaar number never leaves the device and is stored server
/// side as a SHA-256 digest only.
class AadhaarKycRecord {
  const AadhaarKycRecord({
    required this.maskedAadhaar,
    required this.fullName,
    required this.status,
    this.verifiedAt,
  });

  /// `XXXX XXXX 9012` — safe to render in the UI.
  final String maskedAadhaar;

  /// Name the citizen registered alongside the Aadhaar number.
  final String fullName;

  /// `pending` | `verified` | `rejected`.
  final String status;

  final DateTime? verifiedAt;

  /// Whether the citizen has completed Aadhaar registration. Until this is
  /// `true` the app blocks every action that does real work.
  bool get isVerified => status == 'verified';

  factory AadhaarKycRecord.fromJson(Map<String, dynamic> json) {
    return AadhaarKycRecord(
      maskedAadhaar: json['aadhaar_masked'] as String? ?? '',
      fullName: json['full_name'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      verifiedAt: json['verified_at'] == null
          ? null
          : DateTime.tryParse(json['verified_at'] as String),
    );
  }
}
