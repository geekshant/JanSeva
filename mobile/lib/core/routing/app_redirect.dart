import 'app_routes.dart';

/// Routes reachable without signing in.
const publicAppRoutes = <String>{
  AppRoutes.splash,
  AppRoutes.languageSelection,
  AppRoutes.onboarding,
  AppRoutes.login,
  AppRoutes.register,
  AppRoutes.forgotPassword,
  AppRoutes.resetPassword,
};

/// The authentication rules applied by GoRouter's `redirect`.
///
/// Kept as a pure function so the routing rules can be unit-tested without
/// standing up a widget tree or a provider container.
///
/// Aadhaar linking is **optional** and never gates navigation: citizens can
/// verify at any time from Profile (`AppRoutes.aadhaarRegistration`) and are
/// never forced onto that screen.
String? appRedirect({
  required bool enableAuth,
  required bool isSignedIn,
  required String location,
}) {
  if (!enableAuth) return null;

  final goingPublic = publicAppRoutes.contains(location);

  if (!isSignedIn) {
    return goingPublic ? null : AppRoutes.login;
  }

  // Signed in from here on. The splash screen picks the first destination
  // once it has settled auth, and the recovery screen keeps its own
  // deep-link flow.
  if (location == AppRoutes.splash || location == AppRoutes.resetPassword) {
    return null;
  }

  // Signed-in users never need the public auth screens.
  return goingPublic ? AppRoutes.home : null;
}
