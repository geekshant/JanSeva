import 'package:flutter/material.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/theme/app_spacing.dart';
import '../profile_dashboard_data.dart';

/// Account details card: e-mail, mobile number and identity-verification
/// status for the signed-in citizen.
///
/// Only the masked Aadhaar and the KYC status are ever shown — the full
/// number is never available to the client. Citizens who have not linked
/// their Aadhaar get a "Verify now" action that opens the optional linking
/// screen.
class ProfileInfoSection extends StatelessWidget {
  const ProfileInfoSection({
    super.key,
    required this.data,
    required this.onVerifyAadhaar,
  });

  final ProfileDashboardData data;
  final VoidCallback onVerifyAadhaar;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final l = context.tr;
    final profile = data.profile;

    return Container(
      key: const Key('profileInfoSection'),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l('profile.info.title'),
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          AppSpacing.hSM,
          _InfoRow(
            icon: Icons.mail_outline_rounded,
            label: l('profile.info.email'),
            value: (profile.email?.trim().isNotEmpty ?? false)
                ? profile.email!.trim()
                : l('profile.info.notSet'),
          ),
          _InfoRow(
            icon: Icons.phone_outlined,
            label: l('profile.info.phone'),
            value: (profile.phone?.trim().isNotEmpty ?? false)
                ? profile.phone!.trim()
                : l('profile.info.notSet'),
          ),
          _InfoRow(
            icon: Icons.verified_user_outlined,
            label: l('profile.info.verification'),
            value: data.aadhaarVerified
                ? l('profile.aadhaarVerified')
                : l('profile.aadhaarNotVerified'),
            valueColor: data.aadhaarVerified ? Colors.green.shade700 : null,
            trailing: data.aadhaarVerified
                ? Icon(Icons.check_circle_rounded,
                    size: 18, color: Colors.green.shade700)
                : TextButton(
                    key: const Key('profileVerifyNowButton'),
                    onPressed: onVerifyAadhaar,
                    child: Text(l('profile.verifyNow')),
                  ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    this.valueColor,
    this.trailing,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color? valueColor;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: valueColor,
                  ),
                ),
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}
