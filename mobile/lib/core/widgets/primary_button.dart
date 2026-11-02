import 'package:flutter/material.dart';

import 'app_button.dart';

/// The canonical primary action button (filled).
///
/// A thin convenience wrapper over [AppButton] with the filled variant and
/// full-width by default — use for the main action on a screen or form
/// (e.g. "Submit", "Sign in").
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
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
      variant: AppButtonVariant.filled,
    );
  }
}
