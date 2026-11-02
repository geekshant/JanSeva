/// Basic password rules shared by every screen that sets a password
/// (register, set-new-password). Kept dependency-free so it can be unit
/// tested without a widget tree.
library;

/// Minimum length accepted for a new password.
const int kMinPasswordLength = 8;

/// Length rule: at least [kMinPasswordLength] characters.
bool hasMinPasswordLength(String password) => password.length >= kMinPasswordLength;

/// At least one letter (a–z / A–Z).
bool hasPasswordLetter(String password) => password.contains(RegExp(r'[A-Za-z]'));

/// At least one digit (0–9).
bool hasPasswordDigit(String password) => password.contains(RegExp(r'[0-9]'));

/// All basic rules satisfied: length, letter and digit.
bool isValidPassword(String password) =>
    hasMinPasswordLength(password) &&
    hasPasswordLetter(password) &&
    hasPasswordDigit(password);
