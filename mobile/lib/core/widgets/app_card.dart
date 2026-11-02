import 'package:flutter/material.dart';

import '../theme/app_shadows.dart';
import '../theme/app_spacing.dart';

/// Shadow level for [AppCard].
enum AppCardElevation { none, card, elevated }

/// A professional, restrained surface container.
///
/// The workhorse card of the design system: rounded [AppRadius.rLG] surface
/// with a subtle shadow by default. Prefer surface-tonal separation over
/// heavy elevation. Use [AppCardElevation.elevated] for sheets/dialogs and
/// [AppCardElevation.none] for an inset/flat look.
class AppCard extends StatelessWidget {
  const AppCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.margin,
    this.elevation = AppCardElevation.card,
    this.borderColor,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets? padding;
  final EdgeInsets? margin;
  final AppCardElevation elevation;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: AppRadius.rLG,
        boxShadow: switch (elevation) {
          AppCardElevation.none => AppShadows.none,
          AppCardElevation.card => AppShadows.card,
          AppCardElevation.elevated => AppShadows.elevated,
        },
        border: borderColor != null ? Border.all(color: borderColor!) : null,
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.rLG,
          child: Padding(
            padding: padding ?? AppSpacing.cardPadding,
            child: child,
          ),
        ),
      ),
    );
  }
}
