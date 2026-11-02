import 'package:flutter/material.dart';

import 'app_button.dart';

/// The canonical secondary action button (outlined).
///
/// A thin convenience wrapper over [AppButton] with the outlined variant and
/// full-width by default — use for the secondary action on a screen or form
/// (e.g. "Back", "Cancel").
class SecondaryButton extends StatelessWidget {
  const SecondaryButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isExpanded = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final bool isExpanded;

  @override
  Widget build(BuildContext context) {
    return AppButton(
      label: label,
      onPressed: onPressed,
      icon: icon,
      isLoading: isLoading,
      isExpanded: isExpanded,
      variant: AppButtonVariant.outlined,
    );
  }
}
