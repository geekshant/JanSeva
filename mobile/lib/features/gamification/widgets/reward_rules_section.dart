import 'package:flutter/material.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/reward_rule.dart';

/// "How points work" section: renders the configurable `reward_rules` rows
/// exactly as stored in the database (values are never computed here).
class RewardRulesSection extends StatelessWidget {
  const RewardRulesSection({super.key, required this.rules});

  final List<RewardRule> rules;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.tr('gamification.howPointsWork'),
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        if (rules.isEmpty)
          Text(
            context.tr('gamification.rulesUnavailable'),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          )
        else
          Container(
            key: const Key('rewardRules'),
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainer,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                for (var i = 0; i < rules.length; i++) ...[
                  if (i > 0) const Divider(height: 1, indent: 16, endIndent: 16),
                  _RuleTile(rule: rules[i]),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _RuleTile extends StatelessWidget {
  const _RuleTile({required this.rule});

  final RewardRule rule;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final positive = rule.points >= 0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  rule.title,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (rule.description != null &&
                    rule.description!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    rule.description!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.onSurfaceVariant,
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: (positive ? AppColors.success : AppColors.danger)
                  .withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              rule.signedPoints,
              style: theme.textTheme.labelMedium?.copyWith(
                color: positive ? AppColors.success : AppColors.danger,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
