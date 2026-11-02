import 'package:flutter/material.dart';

/// Visual variants for [AppButton].
enum AppButtonVariant { filled, tonal, outlined, text }

/// A reusable, theme-aligned button with variants, an optional leading icon,
/// a built-in loading state, and an optional full-width mode.
///
/// Prefer this over raw [FilledButton] / [OutlinedButton] across the app so
/// button styling stays consistent.
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.filled,
    this.icon,
    this.isLoading = false,
    this.isExpanded = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool isLoading;
  final bool isExpanded;

  bool get _isDisabled => onPressed == null || isLoading;

  @override
  Widget build(BuildContext context) {
    final Widget child = _buildChild();
    final Widget button = switch (variant) {
      AppButtonVariant.filled => FilledButton(
          onPressed: _isDisabled ? null : onPressed,
          child: child,
        ),
      AppButtonVariant.tonal => FilledButton.tonal(
          onPressed: _isDisabled ? null : onPressed,
          child: child,
        ),
      AppButtonVariant.outlined => OutlinedButton(
          onPressed: _isDisabled ? null : onPressed,
          child: child,
        ),
      AppButtonVariant.text => TextButton(
          onPressed: _isDisabled ? null : onPressed,
          child: child,
        ),
    };

    if (!isExpanded) return button;
    return SizedBox(width: double.infinity, child: button);
  }

  Widget _buildChild() {
    if (isLoading) {
      return const SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(strokeWidth: 2.5),
      );
    }
    if (icon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 20),
          const SizedBox(width: 8),
          Text(label),
        ],
      );
    }
    return Text(label);
  }
}
