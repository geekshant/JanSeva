import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/section_header.dart';
import '../../../data/models/complaint_severity.dart';
import '../report_issue_provider.dart';

/// Step 4 — Details: title, description, and severity.
///
/// Uses [AppTextField] for consistent field styling and [AppSpacing] tokens.
class DetailsStep extends ConsumerWidget {
  const DetailsStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(reportIssueProvider);
    final notifier = ref.read(reportIssueProvider.notifier);
    final theme = Theme.of(context);
    final l = context.tr;

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: l('report.details.title'),
            subtitle: l('report.details.subtitle'),
          ),
          AppSpacing.hXL,
          // Title
          TextField(
            maxLength: 200,
            onChanged: notifier.setTitle,
            decoration: InputDecoration(
              labelText: l('report.details.titleLabel'),
              hintText: l('report.details.titleHint'),
              prefixIcon: const Icon(Icons.title_rounded),
              counterText: '',
            ),
          ),
          const SizedBox(height: 4),
          Text(
            l('report.details.charCount', args: {'count': state.title.length}),
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          AppSpacing.hXL,
          // Description
          TextField(
            maxLines: 5,
            onChanged: notifier.setDescription,
            decoration: InputDecoration(
              labelText: l('report.details.descriptionLabel'),
              hintText: l('report.details.descriptionHint'),
              prefixIcon: const Icon(Icons.description_outlined),
              alignLabelWithHint: true,
            ),
          ),
          AppSpacing.hXL,
          // Severity
          Text(
            l('report.details.severity'),
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            l('report.details.severityQuestion'),
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          AppSpacing.hMD,
          _SeveritySelector(
            severity: state.severity,
            onChanged: notifier.setSeverity,
          ),
        ],
      ),
    );
  }
}

class _SeveritySelector extends StatelessWidget {
  const _SeveritySelector({required this.severity, required this.onChanged});

  final ComplaintSeverity severity;
  final ValueChanged<ComplaintSeverity> onChanged;

  @override
  Widget build(BuildContext context) {
    final options = ComplaintSeverity.values;
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((s) {
        final isSelected = s == severity;
        final color = _colorFor(s);
        return ChoiceChip(
          label: Text(s.displayLabel),
          selected: isSelected,
          selectedColor: color.withValues(alpha: 0.15),
          labelStyle: TextStyle(
            color: isSelected ? color : Theme.of(context).colorScheme.onSurfaceVariant,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
          ),
          avatar: Icon(_iconFor(s), size: 18, color: color),
          onSelected: (_) => onChanged(s),
        );
      }).toList(),
    );
  }

  Color _colorFor(ComplaintSeverity s) => switch (s) {
        ComplaintSeverity.low => const Color(0xFF43A047),
        ComplaintSeverity.medium => const Color(0xFFFB8C00),
        ComplaintSeverity.high => const Color(0xFFE53935),
        ComplaintSeverity.critical => const Color(0xFFC62828),
      };

  IconData _iconFor(ComplaintSeverity s) => switch (s) {
        ComplaintSeverity.low => Icons.arrow_downward_rounded,
        ComplaintSeverity.medium => Icons.remove_rounded,
        ComplaintSeverity.high => Icons.arrow_upward_rounded,
        ComplaintSeverity.critical => Icons.priority_high_rounded,
      };
}
