/// Helpers for the Aadhaar registration flow.
///
/// An Aadhaar number is exactly 12 digits, usually written as four
/// space-separated groups of four (`1234 5678 9012`). All helpers here are
/// tolerant of the separators users paste in, and never throw.
library;

/// Number of digits in an Aadhaar number.
const int aadhaarDigitCount = 12;

final RegExp _nonDigit = RegExp(r'\D');

/// Returns [input] with every non-digit character removed.
String normalizeAadhaar(String input) => input.replaceAll(_nonDigit, '');

/// Whether [input] holds exactly 12 digits — the rule for registration.
bool isValidAadhaar(String input) =>
    normalizeAadhaar(input).length == aadhaarDigitCount;

/// Formats digits into `XXXX XXXX XXXX` groups (max 12 digits).
///
/// Input may contain spaces or dashes; they are stripped first.
String formatAadhaar(String input) {
  final digits = normalizeAadhaar(input);
  final buffer = StringBuffer();
  final limit = digits.length < aadhaarDigitCount
      ? digits.length
      : aadhaarDigitCount;
  for (var i = 0; i < limit; i++) {
    if (i > 0 && i % 4 == 0) buffer.write(' ');
    buffer.write(digits[i]);
  }
  return buffer.toString();
}

/// Masks an Aadhaar number for display: `XXXX XXXX 9012`.
String maskAadhaar(String input) {
  final digits = normalizeAadhaar(input);
  if (digits.length < 4) return 'XXXX';
  return 'XXXX XXXX ${digits.substring(digits.length - 4)}';
}
