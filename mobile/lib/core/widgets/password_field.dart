import 'package:flutter/material.dart';

import '../i18n/app_localizations.dart';
import 'app_text_field.dart';

/// A password [AppTextField] with a built-in show/hide visibility toggle.
///
/// Every screen that asks for a password uses this field, so the "view
/// password" option is always available. The toggle is a suffix icon inside
/// the field; tapping it flips between obscured and plain text without
/// losing focus or caret position.
class PasswordField extends StatefulWidget {
  const PasswordField({
    super.key,
    required this.label,
    this.hint,
    this.controller,
    this.focusNode,
    this.keyboardType,
    this.textInputAction,
    this.prefixIcon,
    this.errorText,
    this.validator,
    this.onChanged,
    this.onSubmitted,
    this.enabled = true,
  });

  final String label;
  final String? hint;
  final TextEditingController? controller;
  final FocusNode? focusNode;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final IconData? prefixIcon;
  final String? errorText;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final bool enabled;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _obscured = true;

  void _toggle() => setState(() => _obscured = !_obscured);

  @override
  Widget build(BuildContext context) {
    return AppTextField(
      label: widget.label,
      hint: widget.hint,
      controller: widget.controller,
      focusNode: widget.focusNode,
      keyboardType: widget.keyboardType,
      textInputAction: widget.textInputAction,
      obscureText: _obscured,
      prefixIcon: widget.prefixIcon ?? Icons.lock_outline_rounded,
      errorText: widget.errorText,
      validator: widget.validator,
      onChanged: widget.onChanged,
      onSubmitted: widget.onSubmitted,
      enabled: widget.enabled,
      suffixIcon: IconButton(
        icon: Icon(
          _obscured
              ? Icons.visibility_off_outlined
              : Icons.visibility_outlined,
        ),
        tooltip: context.tr(
          _obscured ? 'auth.showPassword' : 'auth.hidePassword',
        ),
        onPressed: _toggle,
      ),
    );
  }
}
