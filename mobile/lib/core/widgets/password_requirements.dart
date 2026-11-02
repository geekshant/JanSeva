import 'package:flutter/material.dart';

import '../i18n/app_localizations.dart';
import '../utils/password.dart';

/// Live checklist of the basic password rules, rendered under the password
/// field while the citizen types. Each rule turns green once satisfied.
class PasswordRequirements extends StatelessWidget {
  const PasswordRequirements({super.key, required this.password});

  final String password;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final rules = <(bool, String)>[
      (
        hasMinPasswordLength(password),
        AppLocalizations.translate('auth.passwordRuleLength'),
      ),
      (
        hasPasswordLetter(password),
        AppLocalizations.translate('auth.passwordRuleLetter'),
      ),
      (
        hasPasswordDigit(password),
        AppLocalizations.translate('auth.passwordRuleDigit'),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final (met, label) in rules)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  met ? Icons.check_rounded : Icons.close_rounded,
                  size: 14,
                  color: met
                      ? Colors.green.shade700
                      : theme.colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    label,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: met
                          ? Colors.green.shade700
                          : theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
