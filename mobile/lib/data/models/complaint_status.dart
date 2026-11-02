/// Complaint lifecycle status, mirroring the Postgres `complaint_status` enum.
library;

import '../../core/i18n/app_localizations.dart';

enum ComplaintStatus {
  submitted,
  autoValidating,
  needsReview,
  aiChecking,
  aiVerified,
  aiReviewRequired,
  aiFailed,
  evidenceRequired,
  verified,
  assigned,
  acknowledged,
  inProgress,
  resolutionSubmitted,
  resolutionUnderReview,
  communityVerification,
  resolved,
  reopened,
  escalated,
  rejected,
  closed;

  /// Parses the uppercase Postgres enum label sent by Supabase.
  /// Handles both `IN_PROGRESS` (DB) and `in_progress` inputs.
  static ComplaintStatus fromString(String value) {
    String norm(String s) => s.toUpperCase().replaceAll('_', '');
    final target = norm(value);
    return ComplaintStatus.values.firstWhere(
      (e) => norm(e.name) == target,
      orElse: () => ComplaintStatus.submitted,
    );
  }

  /// The uppercase label stored in the database.
  String get label => name.toUpperCase();

  /// Short human-readable label for chips and lists (locale-aware).
  String get displayLabel => switch (this) {
    ComplaintStatus.submitted => AppLocalizations.translate(
      'complaint.status.submitted',
    ),
    ComplaintStatus.autoValidating => AppLocalizations.translate(
      'complaint.status.autoValidating',
    ),
    ComplaintStatus.needsReview => AppLocalizations.translate(
      'complaint.status.needsReview',
    ),
    ComplaintStatus.aiChecking => AppLocalizations.translate(
      'complaint.status.aiChecking',
    ),
    ComplaintStatus.aiVerified => AppLocalizations.translate(
      'complaint.status.aiVerified',
    ),
    ComplaintStatus.aiReviewRequired => AppLocalizations.translate(
      'complaint.status.aiReviewRequired',
    ),
    ComplaintStatus.aiFailed => AppLocalizations.translate(
      'complaint.status.aiFailed',
    ),
    ComplaintStatus.evidenceRequired => AppLocalizations.translate(
      'complaint.status.evidenceRequired',
    ),
    ComplaintStatus.verified => AppLocalizations.translate(
      'complaint.status.verified',
    ),
    ComplaintStatus.assigned => AppLocalizations.translate(
      'complaint.status.assigned',
    ),
    ComplaintStatus.acknowledged => AppLocalizations.translate(
      'complaint.status.acknowledged',
    ),
    ComplaintStatus.inProgress => AppLocalizations.translate(
      'complaint.status.inProgress',
    ),
    ComplaintStatus.resolutionSubmitted => AppLocalizations.translate(
      'complaint.status.resolutionSubmitted',
    ),
    ComplaintStatus.resolutionUnderReview => AppLocalizations.translate(
      'complaint.status.underReview',
    ),
    ComplaintStatus.communityVerification => AppLocalizations.translate(
      'complaint.status.communityVerification',
    ),
    ComplaintStatus.resolved => AppLocalizations.translate(
      'complaint.status.resolved',
    ),
    ComplaintStatus.reopened => AppLocalizations.translate(
      'complaint.status.reopened',
    ),
    ComplaintStatus.escalated => AppLocalizations.translate(
      'complaint.status.escalated',
    ),
    ComplaintStatus.rejected => AppLocalizations.translate(
      'complaint.status.rejected',
    ),
    ComplaintStatus.closed => AppLocalizations.translate('complaint.status.closed'),
  };

  /// Whether this status counts as "pending" (not yet started / not resolved).
  bool get isPending =>
      this == ComplaintStatus.submitted ||
      this == ComplaintStatus.autoValidating ||
      this == ComplaintStatus.needsReview ||
      this == ComplaintStatus.aiChecking ||
      this == ComplaintStatus.aiReviewRequired ||
      this == ComplaintStatus.evidenceRequired ||
      this == ComplaintStatus.verified ||
      this == ComplaintStatus.assigned ||
      this == ComplaintStatus.acknowledged;

  /// Whether this status represents a resolved/terminal state.
  bool get isTerminal =>
      this == ComplaintStatus.resolved ||
      this == ComplaintStatus.rejected ||
      this == ComplaintStatus.closed;

  /// Whether the citizen can still delete (withdraw) this complaint.
  /// Only complaints that have NOT entered the official workflow (i.e.
  /// before verification) can be deleted. Among the AI-evidence statuses,
  /// only `aiChecking` allows withdrawal — once the AI has reached a
  /// verdict the complaint has entered the workflow.
  bool get isDeletable =>
      this == ComplaintStatus.submitted ||
      this == ComplaintStatus.autoValidating ||
      this == ComplaintStatus.needsReview ||
      this == ComplaintStatus.aiChecking;
}
