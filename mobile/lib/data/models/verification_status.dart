/// Community verification lifecycle status, mirroring the
/// `complaints.verification_status` column.
enum VerificationStatus {
  pending,
  confirmed,
  reopened,
  needsReview;

  /// Parses the lowercase DB label. Returns `null` for empty/null input.
  static VerificationStatus? fromString(String? value) {
    if (value == null || value.isEmpty) return null;
    switch (value) {
      case 'pending':
        return VerificationStatus.pending;
      case 'confirmed':
        return VerificationStatus.confirmed;
      case 'reopened':
        return VerificationStatus.reopened;
      case 'needs_review':
        return VerificationStatus.needsReview;
      default:
        return null;
    }
  }

  /// Short human-readable label for chips.
  String get displayLabel => switch (this) {
        VerificationStatus.pending => 'Verification Open',
        VerificationStatus.confirmed => 'Confirmed',
        VerificationStatus.reopened => 'Reopened',
        VerificationStatus.needsReview => 'Needs Review',
      };
}
