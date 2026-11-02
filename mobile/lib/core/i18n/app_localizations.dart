import 'package:flutter/material.dart';

import 'strings_en.dart';
import 'strings_hi.dart';

/// Supported app languages.
const kSupportedLocales = <Locale>[Locale('en'), Locale('hi')];

/// Lightweight, hand-rolled localizations for JanMitra.
///
/// Strings live in [stringsEn] / [stringsHi] as flat `Map<String, String>`
/// keyed hierarchically (e.g. `complaint.status.resolved`). Placeholders use
/// the `{name}` form and are substituted by [tr].
///
/// Two access paths exist:
/// * [of] / [BuildContext.tr] — the preferred path inside widgets.
/// * the static [tr] — usable from non-widget code (enums, repositories,
///   providers) once the delegate has loaded for the current frame. The
///   static locale is kept in sync with the active instance in [load].
class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static AppLocalizations of(BuildContext context) =>
      Localizations.of<AppLocalizations>(context, AppLocalizations)!;

  Map<String, String> get _strings =>
      locale.languageCode == 'hi' ? stringsHi : stringsEn;

  /// Instance translation with `{name}` placeholder substitution.
  String tr(String key, {Map<String, dynamic> args = const {}}) =>
      _translate(_strings, key, args);

  // ---- static access (no BuildContext required) ----

  /// The locale of the most recently loaded [AppLocalizations] instance.
  /// Defaults to English until the delegate has loaded.
  static Locale _currentLocale = const Locale('en');
  static Locale get currentLocale => _currentLocale;

  static Map<String, String> get _currentStrings =>
      _currentLocale.languageCode == 'hi' ? stringsHi : stringsEn;

  /// Static translation usable from non-widget code (enums, repositories,
  /// providers). Uses the locale of the most recently loaded instance.
  static String translate(String key, {Map<String, dynamic> args = const {}}) =>
      _translate(_currentStrings, key, args);

  static String _translate(
    Map<String, String> strings,
    String key,
    Map<String, dynamic> args,
  ) {
    var value = strings[key];
    if (value == null) return key;
    if (args.isEmpty) return value;
    args.forEach((name, val) {
      value = value!.replaceAll('{$name}', val.toString());
    });
    return value!;
  }
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) =>
      ['en', 'hi'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) async {
    AppLocalizations._currentLocale = locale;
    return AppLocalizations(locale);
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

/// Convenient access from any widget.
extension AppLocalizationsX on BuildContext {
  AppLocalizations get loc => AppLocalizations.of(this);

  /// Translate a string key with optional `{name}` placeholder args.
  String tr(String key, {Map<String, dynamic> args = const {}}) =>
      AppLocalizations.of(this).tr(key, args: args);
}
