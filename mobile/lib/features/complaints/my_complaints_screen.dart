import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/widgets/empty_view.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../realtime/complaint_changes_provider.dart';
import 'complaint_filter_provider.dart';
import 'my_complaints_provider.dart';
import 'widgets/complaint_card.dart';

/// "My Complaints" tab — lists all complaints filed by the current user,
/// with search, status filtering, sorting, and real-time updates.
///
/// Filter tabs: All / Active / Resolved / Reopened.
/// Search matches title, complaint number, category, and address.
/// Sort: Recently Updated (default) / Newest / Oldest.
///
/// Subscribes to [realtimeRefresherProvider] so the list refreshes
/// automatically when a complaint's status changes in the database.
class MyComplaintsScreen extends ConsumerStatefulWidget {
  const MyComplaintsScreen({super.key});

  @override
  ConsumerState<MyComplaintsScreen> createState() =>
      _MyComplaintsScreenState();
}

class _MyComplaintsScreenState extends ConsumerState<MyComplaintsScreen> {
  final _searchController = TextEditingController();
  bool _showSearch = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(realtimeRefresherProvider);
    final l = context.tr;

    final complaintsAsync = ref.watch(myComplaintsProvider);
    final filter = ref.watch(complaintFilterProvider);
    final sort = ref.watch(complaintSortProvider);
    final search = ref.watch(complaintSearchProvider);
    final filtered = ref.watch(filteredComplaintsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l('complaint.myComplaints')),
        actions: [
          IconButton(
            icon: Icon(_showSearch ? Icons.close_rounded : Icons.search_rounded),
            tooltip: l('complaint.search'),
            onPressed: () {
              setState(() => _showSearch = !_showSearch);
              if (!_showSearch) {
                _searchController.clear();
                ref.read(complaintSearchProvider.notifier).set('');
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.add_location_alt_rounded),
            tooltip: l('complaint.reportIssue'),
            onPressed: () => context.push(AppRoutes.reportIssue),
          ),
        ],
        bottom: _showSearch
            ? PreferredSize(
                preferredSize: const Size.fromHeight(56),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: TextField(
                    controller: _searchController,
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: l('complaint.searchHint'),
                      prefixIcon:
                          const Icon(Icons.search_rounded, size: 20),
                      suffixIcon: search.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 20),
                              onPressed: () {
                                _searchController.clear();
                                ref
                                    .read(complaintSearchProvider.notifier)
                                    .set('');
                              },
                            )
                          : null,
                      isDense: true,
                    ),
                    onChanged: (value) =>
                        ref.read(complaintSearchProvider.notifier).set(value),
                  ),
                ),
              )
            : null,
      ),
      body: SafeArea(
        child: complaintsAsync.when(
          data: (complaints) {
            if (complaints.isEmpty) {
              return EmptyView(
                icon: Icons.receipt_long_outlined,
                title: l('complaint.empty.title'),
                message: l('complaint.empty.message'),
                actionLabel: l('complaint.empty.action'),
                onAction: () => context.push(AppRoutes.reportIssue),
              );
            }

            return Column(
              children: [
                // --- Filter chips + sort ---
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 12, 8),
                  child: Row(
                    children: [
                      Expanded(
                        child: _FilterChips(
                          filter: filter,
                          onChanged: (f) => ref
                              .read(complaintFilterProvider.notifier)
                              .set(f),
                        ),
                      ),
                      _SortButton(
                        sort: sort,
                        onChanged: (s) => ref
                            .read(complaintSortProvider.notifier)
                            .set(s),
                      ),
                    ],
                  ),
                ),
                // --- List ---
                Expanded(
                  child: filtered.isEmpty
                      ? EmptyView(
                          icon: Icons.search_off_rounded,
                          title: l('complaint.filteredEmpty.title'),
                          message: l('complaint.filteredEmpty.message'),
                        )
                      : RefreshIndicator(
                          onRefresh: () async =>
                              ref.invalidate(myComplaintsProvider),
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 4, 16, 88),
                            itemCount: filtered.length,
                            itemBuilder: (context, index) =>
                                ComplaintListCard(complaint: filtered[index]),
                          ),
                        ),
                ),
              ],
            );
          },
          loading: () => LoadingView(message: l('complaint.loading')),
          error: (error, _) => ErrorView(
            message: error.toString(),
            onRetry: () => ref.invalidate(myComplaintsProvider),
          ),
        ),
      ),
    );
  }
}

/// A horizontally scrollable row of filter chips.
class _FilterChips extends StatelessWidget {
  const _FilterChips({required this.filter, required this.onChanged});

  final ComplaintFilter filter;
  final ValueChanged<ComplaintFilter> onChanged;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: ComplaintFilter.values.map((f) {
          final isSelected = f == filter;
          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: FilterChip(
              label: Text(f.label),
              selected: isSelected,
              onSelected: (_) => onChanged(f),
              selectedColor: colors.primaryContainer,
              labelStyle: TextStyle(
                color: isSelected
                    ? colors.onPrimaryContainer
                    : colors.onSurfaceVariant,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                fontSize: 13,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 4),
              visualDensity: VisualDensity.compact,
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// A compact dropdown for the sort option.
class _SortButton extends StatelessWidget {
  const _SortButton({required this.sort, required this.onChanged});

  final ComplaintSortOption sort;
  final ValueChanged<ComplaintSortOption> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return PopupMenuButton<ComplaintSortOption>(
      onSelected: onChanged,
      itemBuilder: (context) => ComplaintSortOption.values
          .map((s) => PopupMenuItem(
                value: s,
                child: Row(
                  children: [
                    Icon(
                      s == sort ? Icons.check_rounded : null,
                      size: 18,
                      color: colors.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(s.label),
                  ],
                ),
              ))
          .toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: colors.surfaceContainer,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.sort_rounded, size: 16, color: colors.onSurfaceVariant),
            const SizedBox(width: 4),
            Text(
              sort.label,
              style: theme.textTheme.labelSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 2),
            Icon(Icons.arrow_drop_down_rounded,
                size: 18, color: colors.onSurfaceVariant),
          ],
        ),
      ),
    );
  }
}
