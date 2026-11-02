import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/i18n/app_localizations.dart';
import '../../../core/widgets/app_button.dart';
import '../profile_dashboard_data.dart';

/// Profile header: avatar, name, civic level, location, Aadhaar status and
/// civic points on a branded gradient card, with an "Edit profile" action.
class ProfileHeader extends StatelessWidget {
  const ProfileHeader({
    super.key,
    required this.data,
    required this.onEdit,
    required this.onVerifyAadhaar,
  });

  final ProfileDashboardData data;
  final VoidCallback onEdit;

  /// Opens the optional Aadhaar linking screen when the citizen has not
  /// linked (or has not verified) a number yet.
  final VoidCallback onVerifyAadhaar;

  static final _pointsFormat = NumberFormat.decimalPattern();

  /// "Ward 12, Jaipur" — respects the citizen's `privacy_show_ward` setting.
  String? get _locationLabel {
    final profile = data.profile;
    final ward = profile.privacyShowWard ? profile.ward?.trim() : null;
    final city = profile.city?.trim();
    final parts = [
      if (ward != null && ward.isNotEmpty) ward,
      if (city != null && city.isNotEmpty) city,
    ];
    return parts.isEmpty ? null : parts.join(', ');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final profile = data.profile;

    return Container(
      key: const Key('profileHeader'),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [colors.primary, colors.primary.withValues(alpha: 0.85)],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        children: [
          Stack(
            alignment: Alignment.center,
            children: [
              _Avatar(url: profile.avatarUrl),
              Positioned(
                right: 0,
                bottom: 0,
                child: Material(
                  color: Colors.white,
                  shape: const CircleBorder(),
                  elevation: 2,
                  child: InkWell(
                    key: const Key('editProfileButton'),
                    customBorder: const CircleBorder(),
                    onTap: onEdit,
                    child: const Padding(
                      padding: EdgeInsets.all(8),
                      child: Icon(Icons.edit_rounded, size: 18),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            profile.name,
            key: const Key('profileName'),
            textAlign: TextAlign.center,
            style: theme.textTheme.titleLarge?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.military_tech_rounded,
                  color: Colors.white,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    data.levelLabel,
                    key: const Key('profileLevel'),
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (_locationLabel != null) ...[
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.location_on_outlined,
                  color: Colors.white,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    _locationLabel!,
                    key: const Key('profileLocation'),
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.labelMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          if (data.aadhaarMasked != null) ...[
            Container(
              key: const Key('profileAadhaar'),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.badge_outlined,
                    color: Colors.white,
                    size: 16,
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      context.tr(
                        'profile.aadhaarNumber',
                        args: {'number': data.aadhaarMasked!},
                      ),
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Icon(
                    data.aadhaarVerified
                        ? Icons.verified_rounded
                        : Icons.pending_outlined,
                    color: data.aadhaarVerified
                        ? const Color(0xFF4ADE80)
                        : Colors.white70,
                    size: 16,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    data.aadhaarVerified
                        ? context.tr('profile.aadhaarVerified')
                        : context.tr('profile.aadhaarNotVerified'),
                    key: const Key('profileAadhaarStatus'),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: data.aadhaarVerified
                          ? const Color(0xFF4ADE80)
                          : Colors.white70,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ] else ...[
            InkWell(
              key: const Key('profileVerifyAadhaar'),
              onTap: onVerifyAadhaar,
              borderRadius: BorderRadius.circular(999),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.45),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.add_task_rounded,
                      color: Colors.white,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      context.tr('profile.verifyAadhaar'),
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
          Text(
            context.tr('gamification.points',
                args: {'count': _pointsFormat.format(data.pointsEarned)}),
            key: const Key('profilePoints'),
            style: theme.textTheme.headlineSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 16),
          AppButton(
            label: context.tr('settings.editProfile'),
            icon: Icons.edit_rounded,
            variant: AppButtonVariant.outlined,
            isExpanded: true,
            onPressed: onEdit,
          ),
        ],
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    if (url == null || url!.isEmpty) {
      return CircleAvatar(
        radius: 44,
        backgroundColor: Colors.white.withValues(alpha: 0.2),
        child: const Icon(Icons.person_rounded, size: 44, color: Colors.white),
      );
    }
    return CircleAvatar(
      radius: 44,
      backgroundColor: Colors.white.withValues(alpha: 0.2),
      backgroundImage: CachedNetworkImageProvider(url!),
      onBackgroundImageError: (_, _) {},
      child: const Icon(Icons.person_rounded, size: 44, color: Colors.white),
    );
  }
}
