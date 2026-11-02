import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../../core/errors/result.dart';
import '../../core/utils/phone.dart';
import '../../core/utils/app_logger.dart';

/// Wraps Supabase Auth calls so screens never touch the client directly.
///
/// Methods return [Result] so the UI can render success/error states
/// uniformly. Technical Supabase error messages are mapped to user-friendly
/// text via [_friendlyMessage] before reaching the UI.
class AuthRepository {
  AuthRepository();

  SupabaseClient get _client => SupabaseService.client;

  /// Whether Supabase has been configured — when `false` every auth method
  /// returns a friendly failure instead of throwing.
  bool get isConfigured => SupabaseService.isInitialized;

  /// Current authenticated user id, or `null` when signed out / unconfigured.
  String? get currentUserId =>
      isConfigured ? _client.auth.currentUser?.id : null;

  /// Current authenticated user's email, or `null` when signed out.
  String? get currentEmail =>
      isConfigured ? _client.auth.currentUser?.email : null;

  /// Stream of auth state changes (signed in / signed out / token refresh).
  ///
  /// Empty when Supabase is not configured so listeners never throw.
  Stream<AuthState> get authStateChanges => isConfigured
      ? _client.auth.onAuthStateChange
      : const Stream<AuthState>.empty();

  /// Signs in with an e-mail address **or** a mobile number, plus password.
  ///
  /// Supabase Auth only accepts an e-mail as the identifier, so a phone
  /// input is first resolved to the account's e-mail through the
  /// `resolve_phone_login` RPC (see `database/12_phone_login.sql`).
  ///
  /// [identifier] may therefore be `citizen@example.com` or `98765 43210`
  /// (also accepts `+91…` / `0…` forms).
  Future<Result<void>> signInWithIdentifier({
    required String identifier,
    required String password,
  }) async {
    if (!isConfigured) {
      return Result.failure(
        const Failure(message: 'auth.error.backendUnavailable'),
      );
    }
    if (password.isEmpty) {
      return Result.failure(
        const Failure(message: 'auth.error.passwordRequired'),
      );
    }

    final trimmed = identifier.trim();
    String? email;
    if (looksLikeEmail(trimmed)) {
      email = trimmed;
    } else if (isValidPhone(trimmed)) {
      final resolved = await _resolvePhoneLogin(trimmed);
      if (resolved.isFailure) {
        return Result.failure(resolved.failureOrNull!);
      }
      email = resolved.dataOrNull;
      if (email == null || email.isEmpty) {
        return Result.failure(
          const Failure(message: 'auth.error.noAccountWithPhone'),
        );
      }
    } else {
      return Result.failure(
        const Failure(message: 'auth.error.identifierInvalid'),
      );
    }

    return signIn(email: email, password: password);
  }

  /// Maps a mobile number to the e-mail address of the account that owns it.
  ///
  /// Returns `Success(null)` when no account uses that number.
  Future<Result<String?>> _resolvePhoneLogin(String phone) async {
    try {
      final email = await _client.rpc(
        'resolve_phone_login',
        params: {'p_phone': phone},
      );
      if (email is String) return Result.success(email);
      return Result.success(null);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message)));
    } on Exception catch (e) {
      return Result.failure(Failure(message: _networkOrUnknown(e), exception: e));
    }
  }

  /// Signs in with email + password.
  Future<Result<void>> signIn({
    required String email,
    required String password,
  }) async {
    if (!isConfigured) {
      return Result.failure(
        const Failure(message: 'auth.error.backendUnavailable'),
      );
    }
    try {
      await _client.auth.signInWithPassword(email: email, password: password);
      return Result.success(null);
    } on AuthException catch (e) {
      return Result.failure(
        Failure(message: _friendlyMessage(e.message), exception: e),
      );
    } on Exception catch (e) {
      return Result.failure(Failure(message: _networkOrUnknown(e), exception: e));
    }
  }

  /// Creates a new account and signs the caller in.
  ///
  /// Email verification is switched off for this project (see
  /// `database/README.md`), so signup normally hands back a session. When it
  /// does not, the account is signed in explicitly instead — citizens are
  /// never parked on a "check your email" screen.
  ///
  /// [phone] is required by the app: it is stored on the profile by the
  /// `handle_new_user` trigger and becomes a second sign-in identifier.
  Future<Result<void>> signUp({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String gender,
    required String preferredLanguage,
  }) async {
    if (!isConfigured) {
      return Result.failure(
        const Failure(message: 'auth.error.backendUnavailable'),
      );
    }
    final normalizedEmail = email.trim().toLowerCase();
    final normalizedPhone = normalizePhone(phone);
    if (normalizedPhone == null) {
      return Result.failure(
        const Failure(message: 'auth.error.phoneInvalid'),
      );
    }

    // One account per mobile number. The unique index would catch this, but a
    // duplicate that reaches the trigger surfaces as Supabase's unhelpful
    // "Database error saving new user", so ask first. A failed lookup is not
    // fatal: the index still enforces the rule server-side.
    final existingPhone = await _resolvePhoneLogin(normalizedPhone);
    if (existingPhone.isSuccess &&
        (existingPhone.dataOrNull ?? '').isNotEmpty) {
      return Result.failure(
        const Failure(message: 'auth.error.phoneRegistered'),
      );
    }

    try {
      final response = await _client.auth.signUp(
        email: normalizedEmail,
        password: password,
        data: {
          'name': name,
          'phone': normalizedPhone,
          'gender': gender,
          'preferred_language': preferredLanguage,
        },
      );
      // When email confirmation is enabled, signUp returns no session even
      // though the auth user + profile were created by the trigger. Attempt an
      // explicit sign-in so a confirmed citizen lands straight in the app; if
      // confirmation is required this surfaces a clear "verify your email"
      // message instead of a misleading generic error.
      if (response.session == null) {
        AppLogger.info(
          'signUp: no session returned (email confirmation likely enabled); '
          'attempting explicit sign-in',
        );
        return await signIn(email: normalizedEmail, password: password);
      }
      return Result.success(null);
    } on AuthException catch (e) {
      AppLogger.error(
        'Registration failed:\n'
        '  type = ${e.runtimeType}\n'
        '  code = ${e.code ?? "<none>"}\n'
        '  status = ${e.statusCode ?? "<none>"}\n'
        '  message = ${e.message}',
        e,
      );
      return Result.failure(
        Failure(
          message: _friendlyMessage(e.message, code: e.code),
          exception: e,
        ),
      );
    } on Exception catch (e) {
      AppLogger.error('Registration failed (non-auth exception): $e', e);
      return Result.failure(Failure(message: _networkOrUnknown(e), exception: e));
    }
  }

  /// Signs out the current user.
  Future<Result<void>> signOut() async {
    try {
      await _client.auth.signOut();
      return Result.success(null);
    } on Exception catch (e) {
      return Result.failure(Failure(message: _networkOrUnknown(e), exception: e));
    }
  }

  /// Sends a password-reset email to [email].
  Future<Result<void>> sendPasswordReset(String email) async {
    if (!isConfigured) {
      return Result.failure(const Failure(message: 'auth.error.backendUnavailable'));
    }
    try {
      await _client.auth.resetPasswordForEmail(email);
      return Result.success(null);
    } on AuthException catch (e) {
      return Result.failure(
        Failure(message: _friendlyMessage(e.message), exception: e),
      );
    } on Exception catch (e) {
      return Result.failure(Failure(message: _networkOrUnknown(e), exception: e));
    }
  }

  /// Updates the current user's password (used after a reset email deep-link).
  Future<Result<void>> updatePassword(String newPassword) async {
    if (!isConfigured) {
      return Result.failure(const Failure(message: 'auth.error.backendUnavailable'));
    }
    try {
      await _client.auth.updateUser(UserAttributes(password: newPassword));
      return Result.success(null);
    } on AuthException catch (e) {
      return Result.failure(
        Failure(message: _friendlyMessage(e.message), exception: e),
      );
    } on Exception catch (e) {
      return Result.failure(Failure(message: _networkOrUnknown(e), exception: e));
    }
  }

  // --- Friendly error mapping ---------------------------------------------

  /// Maps raw Supabase auth error strings to plain, user-friendly messages
  /// so citizens never see technical error codes. Returns translation keys
  /// (resolved by [AppLocalizations] at the display site).
  static String _friendlyMessage(String raw, {String? code}) {
    // --- Authoritative structured codes first ---
    if (code != null) {
      switch (code) {
        case 'email_exists':
        case 'user_already_exists':
        case 'identity_already_exists':
          return 'auth.error.accountExists';
        case 'phone_exists':
          return 'auth.error.phoneRegistered';
        case 'email_not_confirmed':
        case 'phone_not_confirmed':
          return 'auth.error.emailNotVerified';
        case 'email_provider_disabled':
        case 'phone_provider_disabled':
        case 'signup_disabled':
          return 'auth.error.signupDisabled';
        case 'weak_password':
          return 'auth.error.passwordTooWeak';
        case 'over_request_rate_limit':
        case 'over_email_send_rate_limit':
        case 'over_sms_send_rate_limit':
          return 'auth.error.tooManyAttempts';
        case 'invalid_credentials':
          return 'auth.error.invalidCredentials';
      }
    }

    final lower = raw.toLowerCase();
    // PostgREST could not resolve the object (e.g. `resolve_phone_login`):
    // the project is missing `database/12_phone_login.sql`. Surface that as a
    // deploy problem instead of leaking the raw schema-cache error text.
    if (lower.contains('could not find the function') ||
        lower.contains('could not find the table') ||
        lower.contains('does not exist in the schema cache') ||
        (lower.contains('relation') && lower.contains('does not exist'))) {
      return 'auth.error.backendOutOfDate';
    }
    if (lower.contains('invalid login credentials')) {
      return 'auth.error.invalidCredentials';
    }
    if (lower.contains('phone_normalized_uniq') ||
        (lower.contains('phone') && lower.contains('already exists'))) {
      return 'auth.error.phoneRegistered';
    }
    if (lower.contains('profiles_email_uniq') ||
        (lower.contains('duplicate key') && lower.contains('email'))) {
      return 'auth.error.accountExists';
    }
    // "Database error saving new user" is what Supabase Auth returns when the
    // on_auth_user_created trigger raises (e.g. a missing function, a NOT NULL
    // violation, a unique constraint hit). It is NOT a reliable signal that the
    // email or phone is already in use — it can fire for any trigger failure.
    // Map it to a generic failure, NOT to a duplicate-account message.
    if (lower.contains('database error saving new user')) {
      return 'auth.error.signupGeneric';
    }
    if (lower.contains('email not confirmed')) {
      return 'auth.error.emailNotVerified';
    }
    if (lower.contains('user already registered') ||
        lower.contains('already been registered')) {
      return 'auth.error.accountExists';
    }
    if (lower.contains('password should be at least')) {
      return 'auth.error.passwordTooShort';
    }
    if (lower.contains('rate limit') || lower.contains('too many')) {
      return 'auth.error.tooManyAttempts';
    }
    if (lower.contains('expired') || lower.contains('token')) {
      return 'auth.error.linkExpired';
    }
    if (lower.contains('not found')) {
      return 'auth.error.noAccountWithEmail';
    }
    if (lower.contains('unable to send') || lower.contains('email_send')) {
      return 'auth.error.couldNotSendEmail';
    }
    // Fallback: generic unknown so citizens never see a raw stack/SQLSTATE.
    return 'auth.error.unknown';
  }

  /// Returns a friendly network-or-unknown message key for non-Auth errors.
  static String _networkOrUnknown(Exception e) {
    final str = e.toString().toLowerCase();
    if (str.contains('socket') ||
        str.contains('network') ||
        str.contains('connection') ||
        str.contains('timeout') ||
        str.contains('failed host lookup')) {
      return 'auth.error.network';
    }
    return 'auth.error.unknown';
  }
}
