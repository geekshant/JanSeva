import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Reads runtime configuration from the bundled `.env` asset.
///
/// Values fall back to safe defaults when the `.env` file or a key is missing,
/// so the app can still boot in placeholder mode before credentials are added.
class AppConfig {
  AppConfig._();

  static String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY'] ?? '';
  static String get mapboxAccessToken =>
      dotenv.env['MAPBOX_ACCESS_TOKEN'] ?? '';
  static String get appEnv => dotenv.env['APP_ENV'] ?? 'development';

  static bool get isProduction => appEnv == 'production';
  static bool get isDebug => !isProduction;

  /// Firebase/FCM client configuration (public identifiers only - never server
  /// keys). Returns `null` until all required keys are present, which disables
  /// push notifications gracefully while in-app notifications keep working.
  static FirebaseOptions? get firebaseOptions {
    final apiKey = dotenv.env['FIREBASE_API_KEY'] ?? '';
    final appId = dotenv.env['FIREBASE_APP_ID'] ?? '';
    final messagingSenderId = dotenv.env['FIREBASE_MESSAGING_SENDER_ID'] ?? '';
    final projectId = dotenv.env['FIREBASE_PROJECT_ID'] ?? '';
    if (apiKey.isEmpty ||
        appId.isEmpty ||
        messagingSenderId.isEmpty ||
        projectId.isEmpty) {
      return null;
    }
    return FirebaseOptions(
      apiKey: apiKey,
      appId: appId,
      messagingSenderId: messagingSenderId,
      projectId: projectId,
      storageBucket: dotenv.env['FIREBASE_STORAGE_BUCKET']?.isEmpty ?? true
          ? null
          : dotenv.env['FIREBASE_STORAGE_BUCKET'],
      authDomain: dotenv.env['FIREBASE_AUTH_DOMAIN']?.isEmpty ?? true
          ? null
          : dotenv.env['FIREBASE_AUTH_DOMAIN'],
    );
  }

  /// Whether FCM push is configured for this build.
  static bool get isPushConfigured => firebaseOptions != null;
}
