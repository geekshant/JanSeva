import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/widgets/category_icon.dart';
import '../../../core/widgets/loading_view.dart';
import '../../../core/widgets/error_view.dart';
import '../report_issue_provider.dart';

/// Step 1 — Category selection.
///
/// Displays categories fetched from the Supabase `categories` table as
/// attractive cards with icons. No hard-coded categories.
class CategoryStep extends ConsumerWidget {
  const CategoryStep({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesWithAiConfigProvider);
    final selectedCategory = ref.watch(
      reportIssueProvider.select((s) => s.category),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('report.category.title'),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 4),
        Text(
          context.tr('report.category.subtitle'),
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: categoriesAsync.when(
            data: (entries) => GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.0,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: entries.length,
              itemBuilder: (context, index) {
                final entry = entries[index];
                final category = entry.category;
                final isSelected = selectedCategory?.id == category.id;
                final color = CategoryIconHelper.colorFor(index);
                return _CategoryCard(
                  category: category,
                  icon: CategoryIconHelper.iconFor(category.icon),
                  color: color,
                  isSelected: isSelected,
                  onTap: () => ref
                      .read(reportIssueProvider.notifier)
                      .setCategory(category, aiConfig: entry.aiConfig),
                );
              },
            ),
            loading: () => LoadingView(message: context.tr('report.category.loading')),
            error: (error, _) => ErrorView(
              message: error.toString(),
              onRetry: () => ref.invalidate(categoriesWithAiConfigProvider),
            ),
          ),
        ),
      ],
    );
  }
}

class _CategoryCard extends StatelessWidget {
  const _CategoryCard({
    required this.category,
    required this.icon,
    required this.color,
    required this.isSelected,
    required this.onTap,
  });

  final dynamic category;
  final IconData icon;
  final Color color;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Material(
      color: isSelected ? color.withValues(alpha: 0.12) : colors.surfaceContainer,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: isSelected
                  ? Border.all(color: color, width: 2)
                  : Border.all(color: colors.outline.withValues(alpha: 0.2)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(icon, color: color, size: 28),
                ),
                const SizedBox(height: 10),
                Flexible(
                  child: Text(
                    category.name,
                    style: theme.textTheme.labelLarge?.copyWith(
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
      ),
    );
  }
}
