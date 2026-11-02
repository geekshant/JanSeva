import 'package:flutter/material.dart';

/// One navigable row in the Profile menu.
class ProfileMenuEntry {
  const ProfileMenuEntry({
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.danger = false,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;
  final bool danger;
}

/// A grouped card of [ProfileMenuEntry] list tiles (My Complaints, Rewards,
/// Settings, Logout, etc.) with dividers between rows.
class ProfileMenuSection extends StatelessWidget {
  const ProfileMenuSection({
    super.key,
    required this.title,
    required this.entries,
  });

  final String title;
  final List<ProfileMenuEntry> entries;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: colors.surfaceContainer,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              for (var i = 0; i < entries.length; i++) ...[
                if (i > 0) const Divider(height: 1, indent: 56),
                _MenuTile(entry: entries[i]),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({required this.entry});

  final ProfileMenuEntry entry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final iconColor = entry.danger ? colors.error : colors.primary;
    final textColor = entry.danger ? colors.error : colors.onSurface;

    return ListTile(
      key: Key('profileMenu-${entry.title}'),
      onTap: entry.onTap,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.12),
          shape: BoxShape.circle,
        ),
        child: Icon(entry.icon, size: 20, color: iconColor),
      ),
      title: Text(
        entry.title,
        style: theme.textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.w600,
          color: textColor,
        ),
      ),
      subtitle: entry.subtitle == null
          ? null
          : Text(
              entry.subtitle!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: colors.onSurfaceVariant,
              ),
            ),
      trailing: Icon(
        Icons.chevron_right_rounded,
        color: entry.danger ? colors.error : colors.onSurfaceVariant,
      ),
    );
  }
}
