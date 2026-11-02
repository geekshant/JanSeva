import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_radius.dart';
import '../../features/notifications/device_token_provider.dart';
import '../../features/notifications/notifications_provider.dart';
import '../../features/notifications/notifications_realtime_provider.dart';
import '../../features/realtime/complaint_changes_provider.dart';

/// The main navigation shell hosting four tabs (Home, My Complaints,
/// Notifications, Profile) with a prominent center **Report** action button
/// that floats above the bar.
///
/// As a [ConsumerWidget] it keeps Supabase Realtime subscriptions alive
/// across all tabs (complaints + notifications), registers the FCM device
/// token, and refreshes the unread notification badge automatically.
class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(realtimeRefresherProvider);
    ref.watch(notificationsRealtimeRefresherProvider);
    ref.watch(deviceTokenRegistrationProvider);

    final unreadCount = ref.watch(unreadNotificationsCountProvider);

    return Scaffold(
      body: navigationShell,
      floatingActionButton: _ReportFab(
        onPressed: () => context.push(AppRoutes.reportIssue),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: _MainNavBar(
        selectedIndex: navigationShell.currentIndex,
        unreadCount: unreadCount,
        onDestinationSelected: (index) => navigationShell.goBranch(
          index,
          initialLocation: index == navigationShell.currentIndex,
        ),
      ),
    );
  }
}

/// The prominent center Report button — a raised circular button with the
/// brand gradient and a plus icon. Visually distinct from the nav items
/// without overwhelming the interface.
class _ReportFab extends StatelessWidget {
  const _ReportFab({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      onPressed: onPressed,
      elevation: 4,
      heroTag: 'report_fab',
      shape: const CircleBorder(),
      child: const Icon(Icons.add_rounded, size: 28),
    );
  }
}

/// A custom bottom navigation bar with four items arranged around the center
/// FAB notch. Two items on each side: [Home, Complaints] | FAB |
/// [Notifications, Profile].
class _MainNavBar extends StatelessWidget {
  const _MainNavBar({
    required this.selectedIndex,
    required this.unreadCount,
    required this.onDestinationSelected,
  });

  final int selectedIndex;
  final int unreadCount;
  final ValueChanged<int> onDestinationSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final l = context.tr;

    return Container(
      decoration: BoxDecoration(
        color: colors.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            children: [
              _NavDestination(
                icon: Icons.home_outlined,
                activeIcon: Icons.home_rounded,
                label: l('nav.home'),
                isSelected: selectedIndex == 0,
                onTap: () => onDestinationSelected(0),
              ),
              _NavDestination(
                icon: Icons.receipt_long_outlined,
                activeIcon: Icons.receipt_long_rounded,
                label: l('nav.complaints'),
                isSelected: selectedIndex == 1,
                onTap: () => onDestinationSelected(1),
              ),
              // Spacer for the center FAB
              const SizedBox(width: 56),
              _NavDestination(
                icon: Icons.notifications_outlined,
                activeIcon: Icons.notifications_rounded,
                label: l('nav.alerts'),
                isSelected: selectedIndex == 2,
                badge: unreadCount,
                onTap: () => onDestinationSelected(2),
              ),
              _NavDestination(
                icon: Icons.person_outline,
                activeIcon: Icons.person_rounded,
                label: l('nav.profile'),
                isSelected: selectedIndex == 3,
                onTap: () => onDestinationSelected(3),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavDestination extends StatelessWidget {
  const _NavDestination({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.badge,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final int? badge;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final color = isSelected ? colors.primary : colors.onSurfaceVariant;

    return Expanded(
      child: InkWell(
        borderRadius: AppRadius.rMD,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(
                    isSelected ? activeIcon : icon,
                    size: 24,
                    color: color,
                  ),
                  if (badge != null && badge! > 0)
                    Positioned(
                      right: -10,
                      top: -4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 1,
                        ),
                        decoration: BoxDecoration(
                          color: colors.error,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: colors.surface,
                            width: 1.5,
                          ),
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 16,
                          minHeight: 16,
                        ),
                        child: Text(
                          badge! > 99 ? '99+' : '$badge',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colors.onError,
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: color,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
