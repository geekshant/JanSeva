/// Complaint severity, mirroring the Postgres `complaint_severity` enum.
library;

import '../../core/i18n/app_localizations.dart';

enum ComplaintSeverity {
  low,
  medium,
  high,
  critical;

  static ComplaintSeverity fromString(String value) {
    return ComplaintSeverity.values.firstWhere(
      (e) => e.name.toUpperCase() == value.toUpperCase(),
      orElse: () => ComplaintSeverity.medium,
    );
  }

  String get label => name.toUpperCase();

  String get displayLabel => switch (this) {
    ComplaintSeverity.low => AppLocalizations.translate('severity.low'),
    ComplaintSeverity.medium => AppLocalizations.translate('severity.medium'),
    ComplaintSeverity.high => AppLocalizations.translate('severity.high'),
    ComplaintSeverity.critical => AppLocalizations.translate('severity.critical'),
  };
}
