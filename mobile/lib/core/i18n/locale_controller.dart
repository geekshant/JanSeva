import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// SharedPreferences key storing the chosen language code (`en` / `hi`).
const kLocalePreferenceKey = 'janmitra_locale';

/// Initial locale used before persisted preferences load. Overridden in
/// [main] with the saved value so there is no flash of the wrong language.
final initialLocaleProvider = Provider<Locale>((ref) => const Locale('en'));

/// Current app locale, persisted to SharedPreferences.
final localeProvider = NotifierProvider<LocaleController, Locale>(
  LocaleController.new,
);

class LocaleController extends Notifier<Locale> {
  @override
  Locale build() => ref.watch(initialLocaleProvider);

  /// Switch the app language and persist the choice.
  Future<void> setLocale(Locale locale) async {
    if (locale.languageCode == state.languageCode) return;
    state = locale;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kLocalePreferenceKey, locale.languageCode);
  }

  /// Toggle between English and Hindi.
  Future<void> toggle() async => setLocale(
    state.languageCode == 'hi' ? const Locale('en') : const Locale('hi'),
  );
}

/// Loads the persisted locale before the app starts. Called from [main].
Future<Locale> loadSavedLocale() async {
  final prefs = await SharedPreferences.getInstance();
  final code = prefs.getString(kLocalePreferenceKey);
  return code == 'hi' ? const Locale('hi') : const Locale('en');
}
