import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/constants/app_constants.dart';
import 'core/i18n/app_localizations.dart';
import 'core/i18n/locale_controller.dart';
import 'core/routing/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/auth_provider.dart';
import 'features/notifications/push_navigation_provider.dart';

/// Root widget for JanMitra.
///
/// A [ConsumerWidget] so it can read the Riverpod-provided [GoRouter]. Light
/// and dark Material 3 themes are both configured; the system choice is
/// respected by default (no forced theme). The active locale follows the
/// Riverpod [localeProvider] so the language toggle rebuilds the whole tree.
class JanMitraApp extends ConsumerWidget {
  const JanMitraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    // Route taps on push notifications into the app (no-op when push is off).
    ref.watch(pushNavigationProvider);
    // Route password-recovery deep links to the reset screen.
    ref.watch(passwordRecoveryProvider);

    final locale = ref.watch(localeProvider);

    return MaterialApp.router(
      title: AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      routerConfig: router,
      locale: locale,
      supportedLocales: kSupportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
