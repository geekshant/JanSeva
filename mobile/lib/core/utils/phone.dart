/// Helpers for mobile numbers used as a login identifier.
///
/// The app stores phone numbers in their canonical Indian local form: exactly
/// 10 digits with no separators and no country prefix (`+91` / `91` / `0`).
/// All helpers are tolerant of what users paste in and never throw.
library;

/// Number of digits in a stored phone number.
const int phoneDigitCount = 10;

final RegExp _nonDigit = RegExp(r'\D');
final RegExp _looksLikeEmail = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

/// Returns [input] with every non-digit character removed.
String normalizePhoneDigits(String input) => input.replaceAll(_nonDigit, '');

/// Canonical form for `profiles.phone` and phone → account lookups.
///
/// Strips separators, then any `+91` / `91` / `0` prefix, and finally checks
/// the 10-digit length. Returns `null` when [input] cannot be a phone number.
String? normalizePhone(String input) {
  var digits = normalizePhoneDigits(input);
  if (digits.length == 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  } else if (digits.length == 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  return digits.length == phoneDigitCount ? digits : null;
}

/// Whether [input] normalises to a valid 10-digit phone number.
bool isValidPhone(String input) => normalizePhone(input) != null;

/// Whether [input] is shaped like an email address.
///
/// Deliberately permissive: Supabase owns real email validation.
bool looksLikeEmail(String input) => _looksLikeEmail.hasMatch(input.trim());

/// Formats digits as `98765 43210` (5 + 5), keeping the first 10 digits.
String formatPhone(String input) {
  final digits = normalizePhoneDigits(input);
  final limit = digits.length < phoneDigitCount ? digits.length : phoneDigitCount;
  if (limit <= 5) return digits.substring(0, limit);
  return '${digits.substring(0, 5)} ${digits.substring(5, limit)}';
}

/// `XXXXX 3210` — safe to render in the UI.
String maskPhone(String input) {
  final digits = normalizePhoneDigits(input);
  if (digits.length < 4) return 'XXXXX';
  return 'XXXXX ${digits.substring(digits.length - 4)}';
}
