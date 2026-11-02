/// Centralized route path constants for JanMitra.
///
/// Keeping paths in one place avoids magic strings across the router and the
/// screens that navigate between them.
class AppRoutes {
  AppRoutes._();

  // --- Entry / auth --------------------------------------------------------
  static const String splash = '/';
  static const String languageSelection = '/language-selection';
  static const String onboarding = '/onboarding';
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String resetPassword = '/reset-password';

  /// Optional after sign-in: citizens link their Aadhaar from Profile to get
  /// a verified badge. The router never forces them onto this screen.
  static const String aadhaarRegistration = '/aadhaar-registration';

  // --- Main bottom-navigation shell ---------------------------------------
  static const String home = '/home';
  static const String complaints = '/complaints';
  static const String notifications = '/notifications';
  static const String profile = '/profile';

  // --- Pushed (non-shell) screens -----------------------------------------
  static const String reportIssue = '/report-issue';
  static const String reportSuccess = '/report-success';
  static const String map = '/map';
  static const String communityVerification = '/community-verification';
  static const String rewards = '/rewards';
  static const String leaderboard = '/leaderboard';

  // --- Safety ---------------------------------------------------------------
  static const String safety = '/safety';
  static const String safetyContacts = '/safety/contacts';
  static const String safetyCheckIn = '/safety/check-in';
  static const String safetyNearby = '/safety/nearby';
  static const String safetyReport = '/safety/report';

  // --- Profile sub-screens -------------------------------------------------
  static const String editProfile = '/profile/edit';
  static const String settings = '/profile/settings';
  static const String preferences = '/profile/preferences';
  static const String privacySettings = '/profile/privacy-settings';
  static const String badges = '/profile/badges';
  static const String contributionHistory = '/profile/contribution-history';
  static const String helpSupport = '/profile/help';
  static const String privacyPolicy = '/profile/privacy-policy';
  static const String termsConditions = '/profile/terms';

  /// Complaint detail; append `/<id>` (used by notification navigation).
  static const String complaintDetail = '/complaint';
}
