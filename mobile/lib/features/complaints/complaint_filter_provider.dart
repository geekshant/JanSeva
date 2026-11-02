import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/i18n/app_localizations.dart';
import '../../data/models/complaint.dart';
import '../../data/models/complaint_status.dart';
import 'my_complaints_provider.dart';

/// Filter tabs for the My Complaints screen.
enum ComplaintFilter {
  all('complaint.filter.all'),
  active('complaint.filter.active'),
  resolved('complaint.filter.resolved'),
  reopened('complaint.filter.reopened');

  const ComplaintFilter(this._key);
  final String _key;
  String get label => AppLocalizations.translate(_key);

  /// Returns `true` if [status] matches this filter.
  bool matches(ComplaintStatus status) {
    switch (this) {
      case ComplaintFilter.all:
        return true;
      case ComplaintFilter.active:
        return status == ComplaintStatus.submitted ||
            status == ComplaintStatus.verified ||
            status == ComplaintStatus.assigned ||
            status == ComplaintStatus.inProgress;
      case ComplaintFilter.resolved:
        return status == ComplaintStatus.resolved;
      case ComplaintFilter.reopened:
        // "Reopened" maps to rejected status in the current enum (issues
        // that were rejected/need attention again). The DB's
        // `verification_status` column handles the true "reopened" flow;
        // this filter surfaces complaints that need citizen attention.
        return status == ComplaintStatus.rejected;
    }
  }
}

/// Sort options for the My Complaints screen.
enum ComplaintSortOption {
  newest('complaint.sort.newest'),
  oldest('complaint.sort.oldest'),
  recentlyUpdated('complaint.sort.recentlyUpdated');

  const ComplaintSortOption(this._key);
  final String _key;
  String get label => AppLocalizations.translate(_key);

  int compare(Complaint a, Complaint b) {
    switch (this) {
      case ComplaintSortOption.newest:
        return b.createdAt.compareTo(a.createdAt);
      case ComplaintSortOption.oldest:
        return a.createdAt.compareTo(b.createdAt);
      case ComplaintSortOption.recentlyUpdated:
        final aTime = a.updatedAt ?? a.createdAt;
        final bTime = b.updatedAt ?? b.createdAt;
        return bTime.compareTo(aTime);
    }
  }
}

/// The active filter chip, driven by the UI.
final complaintFilterProvider =
    NotifierProvider<ComplaintFilterNotifier, ComplaintFilter>(() {
  return ComplaintFilterNotifier();
});

class ComplaintFilterNotifier extends Notifier<ComplaintFilter> {
  @override
  ComplaintFilter build() => ComplaintFilter.all;

  void set(ComplaintFilter filter) => state = filter;
}

/// The active sort option, driven by the UI.
final complaintSortProvider =
    NotifierProvider<ComplaintSortNotifier, ComplaintSortOption>(() {
  return ComplaintSortNotifier();
});

class ComplaintSortNotifier extends Notifier<ComplaintSortOption> {
  @override
  ComplaintSortOption build() => ComplaintSortOption.recentlyUpdated;

  void set(ComplaintSortOption sort) => state = sort;
}

/// The search query typed by the user (empty = no search).
final complaintSearchProvider =
    NotifierProvider<ComplaintSearchNotifier, String>(() {
  return ComplaintSearchNotifier();
});

class ComplaintSearchNotifier extends Notifier<String> {
  @override
  String build() => '';

  void set(String query) => state = query.trim();
}

/// The filtered + searched + sorted list, derived from [myComplaintsProvider].
/// Pure client-side: the base provider already fetches up to 100 complaints,
/// so filtering/searching/sorting happens in-memory without extra DB calls.
final filteredComplaintsProvider = Provider<List<Complaint>>((ref) {
  final List<Complaint> allComplaints = ref.watch(myComplaintsProvider).maybeWhen(
        data: (list) => list,
        orElse: () => const [],
      );
  final filter = ref.watch(complaintFilterProvider);
  final sort = ref.watch(complaintSortProvider);
  final search = ref.watch(complaintSearchProvider);

  List<Complaint> result =
      allComplaints.where((c) => filter.matches(c.status)).toList();

  if (search.isNotEmpty) {
    final lower = search.toLowerCase();
    result = result
        .where((c) =>
            c.title.toLowerCase().contains(lower) ||
            c.complaintNumber.toLowerCase().contains(lower) ||
            (c.category?.name.toLowerCase().contains(lower) ?? false) ||
            (c.address?.toLowerCase().contains(lower) ?? false))
        .toList();
  }

  result.sort((Complaint a, Complaint b) => sort.compare(a, b));
  return result;
});
