import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/i18n/locale_controller.dart';
import 'data/services/push_notification_service.dart';
import 'data/services/supabase_service.dart';
import 'core/utils/app_logger.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await _loadEnvironment();

  await SupabaseService.initialize();

  // Best-effort: disables itself when FIREBASE_* keys are missing or Firebase
  // cannot initialize (in-app notifications keep working regardless).
  await PushNotificationService.instance.initialize();

  // Request the OS notification permission at launch (Android 13+ / iOS)
  // independent of Firebase, so the prompt appears even when push (FCM) is
  // not configured. Idempotent: no re-prompt after the user has decided.
  await PushNotificationService.instance.requestNotificationPermission();

  // Load the user's saved language so the app boots in the right locale
  // (no flash of the wrong language on cold start).
  final initialLocale = await loadSavedLocale();

  runApp(
    ProviderScope(
      overrides: [initialLocaleProvider.overrideWithValue(initialLocale)],
      child: const JanMitraApp(),
    ),
  );
}

/// Loads the bundled `.env` asset. Fails gracefully (placeholder mode) if the
/// file or any value is missing, so the app always boots.
Future<void> _loadEnvironment() async {
  try {
    await dotenv.load(fileName: '.env');
    AppLogger.info('Environment loaded.');
  } on Exception catch (e) {
    AppLogger.warning('.env not found ($e). Running in placeholder mode.');
  }
}
