import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/routing/app_routes.dart';
import '../../../data/models/profile.dart';
import '../../notifications/notifications_provider.dart';

/// Home header: time-aware greeting with the user's name, a subtle location
/// context, and a notification bell with an unread badge.
class HomeHeader extends ConsumerWidget {
  const HomeHeader({super.key, required this.profile, this.locationText});

  final Profile profile;

  /// Optional location context (e.g. "Bhopal" or reverse-geocoded area).
  final String? locationText;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final unreadCount = ref.watch(unreadNotificationsCountProvider);
    final greeting = _greetingForTime(context);

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('home.greetingName', args: {
                  'greeting': greeting,
                  'name': profile.name.split(' ').first,
                }),
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 2),
              if (locationText != null && locationText!.isNotEmpty)
                Row(
                  children: [
                    Icon(Icons.location_on_rounded,
                        size: 14, color: colors.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        locationText!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                )
              else
                Text(
                  context.tr('home.communityBetter'),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
            ],
          ),
        ),
        IconButton(
          tooltip: context.tr('nav.notifications'),
          onPressed: () => context.push(AppRoutes.notifications),
          icon: Badge(
            isLabelVisible: unreadCount > 0,
            label: Text(unreadCount > 99 ? '99+' : '$unreadCount'),
            child: const Icon(Icons.notifications_outlined),
          ),
        ),
      ],
    );
  }

  String _greetingForTime(BuildContext context) {
    final hour = DateTime.now().hour;
    if (hour < 12) return context.tr('home.greetingMorning');
    if (hour < 17) return context.tr('home.greetingAfternoon');
    return context.tr('home.greetingEvening');
  }
}
