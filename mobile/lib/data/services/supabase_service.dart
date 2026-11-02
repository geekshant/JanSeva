import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/config/app_config.dart';
import '../../core/utils/app_logger.dart';

/// Thrown by [SupabaseService.client] when Supabase is not configured.
///
/// Implements [Exception] (unlike a bare `StateError`) so every repository's
/// `on Exception` handlers can turn it into a friendly message instead of an
/// unhandled error that leaves spinners stuck.
class SupabaseNotConfiguredException implements Exception {
  const SupabaseNotConfiguredException([this.message = defaultMessage]);

  static const String defaultMessage =
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY '
      'in .env, then call SupabaseService.initialize().';

  final String message;

  @override
  String toString() => message;
}

/// Initializes and exposes the Supabase client.
///
/// Credentials are read from [AppConfig]. If they are missing the app does not
/// crash — it logs a warning and runs in placeholder mode. The [client]
/// getter then throws a clear [SupabaseNotConfiguredException] if something
/// tries to use Supabase before it has been configured.
class SupabaseService {
  SupabaseService._();

  static bool _initialized = false;

  /// Initializes Supabase once. Safe to call multiple times.
  ///
  /// Awaited by `main()` so session restoration and the deep-link observer
  /// finish before the first frame instead of surfacing as unhandled async
  /// errors later.
  static Future<void> initialize() async {
    if (_initialized) return;

    final url = AppConfig.supabaseUrl;
    final key = AppConfig.supabaseAnonKey;

    // Diagnostic: log whether config is available (masked — never log the
    // full URL with path or the key value).
    AppLogger.info(
      'Supabase config: URL present=${url.isNotEmpty}, '
      'key present=${key.isNotEmpty}, '
      'url host=${url.isEmpty ? "(missing)" : Uri.tryParse(url)?.host ?? "(invalid)"}',
    );

    if (url.isEmpty || key.isEmpty) {
      AppLogger.warning(
        'Supabase credentials missing. Set SUPABASE_URL and '
        'SUPABASE_ANON_KEY in .env to enable backend features.',
      );
      return;
    }

    try {
      await Supabase.initialize(
        url: url,
        publishableKey: key,
        debug: AppConfig.isDebug,
      );
      _initialized = true;
      AppLogger.info('Supabase initialized.');
    } on Exception catch (e) {
      // Keep placeholder mode instead of crashing the whole app.
      _initialized = false;
      AppLogger.error('Supabase initialization failed.', e);
    }
  }

  static bool get isInitialized => _initialized;

  /// Returns the configured Supabase client.
  /// Throws [SupabaseNotConfiguredException] if [initialize] has not
  /// configured credentials.
  static SupabaseClient get client {
    if (!_initialized) {
      throw const SupabaseNotConfiguredException();
    }
    return Supabase.instance.client;
  }
}
