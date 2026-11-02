/// Aggregate verification counts for a complaint, returned by the
/// `submit_community_verification` RPC after a citizen responds.
class VerificationSummary {
  const VerificationSummary({
    required this.total,
    required this.verified,
    required this.rejected,
    required this.verificationRate,
    required this.status,
  });

  final int total;
  final int verified;
  final int rejected;
  final int verificationRate;
  final String status;

  factory VerificationSummary.fromJson(Map<String, dynamic> json) {
    return VerificationSummary(
      total: (json['total'] as num?)?.toInt() ?? 0,
      verified: (json['verified'] as num?)?.toInt() ?? 0,
      rejected: (json['rejected'] as num?)?.toInt() ?? 0,
      verificationRate: (json['verification_rate'] as num?)?.toInt() ?? 0,
      status: (json['status'] as String?) ?? 'pending',
    );
  }
}
