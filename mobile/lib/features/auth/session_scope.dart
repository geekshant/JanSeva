import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../complaints/my_complaints_provider.dart';
import '../gamification/leaderboard_provider.dart';
import '../gamification/rewards_provider.dart';
import '../home/home_dashboard_provider.dart';
import '../notifications/notifications_provider.dart';
import '../profile/current_profile_provider.dart';
import '../profile/profile_dashboard_provider.dart';
import '../safety/safety_eligibility_provider.dart';
import '../verification/verification_provider.dart';
import 'auth_provider.dart';

/// Clears every cached result that belongs to the signed-in citizen.
///
/// Riverpod keeps results for the lifetime of the app, so without this a
/// logout (or logging in as a different citizen) would briefly show the
/// previous citizen's dashboard, complaints and notifications — and, worse,
/// could let the Aadhaar gate of the previous session decide the new one.
///
/// Call it right after a successful login and after every logout.
void invalidateUserScopedData(WidgetRef ref) {
  ref.invalidate(profileDashboardProvider);
  ref.invalidate(currentProfileIdProvider);
  ref.invalidate(womenSafetyEligibilityProvider);
  ref.invalidate(homeDashboardProvider);
  ref.invalidate(rewardsDashboardProvider);
  ref.invalidate(notificationsProvider);
  ref.invalidate(myComplaintsProvider);
  ref.invalidate(leaderboardProvider);
  ref.invalidate(verifiableComplaintsProvider);
  ref.invalidate(aadhaarVerificationProvider);
}
