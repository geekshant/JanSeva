import 'package:flutter/foundation.dart';

/// Thin logging wrapper so the app never calls `print` directly (which the
/// `avoid_print` lint forbids). Uses `debugPrint` so logs are gated behind
/// debug mode and respect the Flutter logging conventions.
class AppLogger {
  AppLogger._();

  static void info(String message) => debugPrint('[JanMitra INFO] $message');

  static void warning(String message) => debugPrint('[JanMitra WARN] $message');

  static void error(String message, [Object? error, StackTrace? stackTrace]) {
    debugPrint('[JanMitra ERROR] $message');
    if (error != null) debugPrint('  cause: $error');
    if (stackTrace != null) debugPrint('  stack: $stackTrace');
  }
}
