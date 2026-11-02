import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../constants/app_constants.dart';
import 'app_redirect.dart';
import 'router_refresh.dart';
import '../../features/auth/aadhaar_registration_screen.dart';
import '../../features/auth/auth_provider.dart';
import '../../features/auth/forgot_password_screen.dart';
import '../../features/auth/language_selection_screen.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/onboarding_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/auth/reset_password_screen.dart';
import '../../features/complaints/complaint_detail_screen.dart';
import '../../features/complaints/my_complaints_screen.dart';
import '../../features/gamification/leaderboard_screen.dart';
import '../../features/gamification/rewards_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/map/map_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/profile/badges_screen.dart';
import '../../features/profile/contribution_history_screen.dart';
import '../../features/profile/edit_profile_screen.dart';
import '../../features/profile/preferences_screen.dart';
import '../../features/profile/privacy_settings_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/profile/settings_screen.dart';
import '../../features/profile/static_content_screen.dart';
import '../../features/report_issue/report_issue_screen.dart';
import '../../features/report_issue/success_screen.dart';
import '../../features/safety/safety_screen.dart';
import '../../features/safety/safety_contacts_screen.dart';
import '../../features/safety/safety_checkin_screen.dart';
import '../../features/safety/safety_nearby_screen.dart';
import '../../features/safety/safety_report_screen.dart';
import '../../features/splash/splash_screen.dart';
import '../../features/verification/verification_screen.dart';
import '../../data/models/complaint.dart';
import 'app_routes.dart';
import 'main_shell.dart';

/// Provides the app-wide [GoRouter], gated by Supabase auth state.
///
/// When auth is disabled (`enableAuth = false`), no redirects occur. When
/// auth is enabled, a `redirect` callback keeps signed-out users on public
/// auth screens and bounces signed-in users into the app. Aadhaar
/// verification is optional and never redirects; citizens open it from
/// Profile when they want to link their number.
final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);
  final isSignedIn = authState.value ?? false;

  final routes = <RouteBase>[
    GoRoute(
      path: AppRoutes.splash,
      builder: (context, state) => const SplashScreen(),
    ),
    GoRoute(
      path: AppRoutes.languageSelection,
      builder: (context, state) => const LanguageSelectionScreen(),
    ),
    GoRoute(
      path: AppRoutes.onboarding,
      builder: (context, state) => const OnboardingScreen(),
    ),
    if (AppConstants.enableAuth) ...[
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.resetPassword,
        builder: (context, state) => const ResetPasswordScreen(),
      ),
      GoRoute(
        path: AppRoutes.aadhaarRegistration,
        builder: (context, state) => const AadhaarRegistrationScreen(),
      ),
    ],
    GoRoute(
      path: AppRoutes.reportIssue,
      builder: (context, state) => const ReportIssueScreen(),
    ),
    GoRoute(
      path: AppRoutes.reportSuccess,
      builder: (context, state) =>
          SuccessScreen(complaint: state.extra as Complaint?),
    ),
    GoRoute(
      path: AppRoutes.map,
      builder: (context, state) => const MapScreen(),
    ),
    GoRoute(
      path: AppRoutes.communityVerification,
      builder: (context, state) => const VerificationScreen(),
    ),
    GoRoute(
      path: AppRoutes.safety,
      builder: (context, state) => const SafetyScreen(),
    ),
    GoRoute(
      path: AppRoutes.safetyContacts,
      builder: (context, state) => const SafetyContactsScreen(),
    ),
    GoRoute(
      path: AppRoutes.safetyCheckIn,
      builder: (context, state) => const SafetyCheckInScreen(),
    ),
    GoRoute(
      path: AppRoutes.safetyNearby,
      builder: (context, state) => const SafetyNearbyScreen(),
    ),
    GoRoute(
      path: AppRoutes.safetyReport,
      builder: (context, state) => const SafetyReportScreen(),
    ),
    GoRoute(
      path: AppRoutes.rewards,
      builder: (context, state) => const RewardsScreen(),
    ),
    GoRoute(
      path: AppRoutes.leaderboard,
      builder: (context, state) => const LeaderboardScreen(),
    ),
    GoRoute(
      path: AppRoutes.editProfile,
      builder: (context, state) => const EditProfileScreen(),
    ),
    GoRoute(
      path: AppRoutes.settings,
      builder: (context, state) => const SettingsScreen(),
    ),
    GoRoute(
      path: AppRoutes.preferences,
      builder: (context, state) => const PreferencesScreen(),
    ),
    GoRoute(
      path: AppRoutes.privacySettings,
      builder: (context, state) => const PrivacySettingsScreen(),
    ),
    GoRoute(
      path: AppRoutes.badges,
      builder: (context, state) => const BadgesScreen(),
    ),
    GoRoute(
      path: AppRoutes.contributionHistory,
      builder: (context, state) => const ContributionHistoryScreen(),
    ),
    GoRoute(
      path: AppRoutes.helpSupport,
      builder: (context, state) => StaticContentScreen.helpAndSupport(),
    ),
    GoRoute(
      path: AppRoutes.privacyPolicy,
      builder: (context, state) => StaticContentScreen.privacyPolicy(),
    ),
    GoRoute(
      path: AppRoutes.termsConditions,
      builder: (context, state) => StaticContentScreen.termsAndConditions(),
    ),
    GoRoute(
      path: '${AppRoutes.complaintDetail}/:id',
      builder: (context, state) =>
          ComplaintDetailScreen(complaintId: state.pathParameters['id']!),
    ),
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          MainShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.home,
              builder: (context, state) => const HomeScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.complaints,
              builder: (context, state) => const MyComplaintsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.notifications,
              builder: (context, state) => const NotificationsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: AppRoutes.profile,
              builder: (context, state) => const ProfileScreen(),
            ),
          ],
        ),
      ],
    ),
  ];

  return GoRouter(
    initialLocation: AppRoutes.splash,
    debugLogDiagnostics: kDebugMode,
    routes: routes,
    refreshListenable: ref.watch(routerRefreshProvider),
    redirect: (context, state) => appRedirect(
      enableAuth: AppConstants.enableAuth,
      isSignedIn: isSignedIn,
      location: state.matchedLocation,
    ),
  );
});
