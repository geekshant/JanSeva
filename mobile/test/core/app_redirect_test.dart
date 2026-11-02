import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/core/routing/app_redirect.dart';
import 'package:janmitra/core/routing/app_routes.dart';

void main() {
  String redirect({
    required bool isSignedIn,
    required String location,
    bool enableAuth = true,
  }) =>
      appRedirect(
        enableAuth: enableAuth,
        isSignedIn: isSignedIn,
        location: location,
      ) ??
      '<stay>';

  group('auth disabled', () {
    test('never redirects', () {
      expect(
        redirect(enableAuth: false, isSignedIn: false, location: AppRoutes.home),
        '<stay>',
      );
    });
  });

  group('signed out', () {
    test('is kept on public screens', () {
      for (final route in publicAppRoutes) {
        expect(redirect(isSignedIn: false, location: route), '<stay>',
            reason: route);
      }
    });

    test('is bounced to login from any work screen', () {
      for (final route in [
        AppRoutes.home,
        AppRoutes.reportIssue,
        AppRoutes.rewards,
        AppRoutes.profile,
        AppRoutes.map,
        AppRoutes.aadhaarRegistration,
      ]) {
        expect(redirect(isSignedIn: false, location: route), AppRoutes.login,
            reason: route);
      }
    });
  });

  group('signed in', () {
    test('can reach every screen, including optional Aadhaar linking', () {
      for (final route in [
        AppRoutes.home,
        AppRoutes.complaints,
        AppRoutes.reportIssue,
        AppRoutes.map,
        AppRoutes.rewards,
        AppRoutes.leaderboard,
        AppRoutes.communityVerification,
        AppRoutes.profile,
        AppRoutes.notifications,
        AppRoutes.aadhaarRegistration,
      ]) {
        expect(redirect(isSignedIn: true, location: route), '<stay>',
            reason: route);
      }
    });

    test('lets splash and password-recovery through', () {
      expect(
        redirect(isSignedIn: true, location: AppRoutes.splash),
        '<stay>',
      );
      expect(
        redirect(isSignedIn: true, location: AppRoutes.resetPassword),
        '<stay>',
      );
    });

    test('is moved off the public auth screens', () {
      for (final route in publicAppRoutes) {
        if (route == AppRoutes.splash || route == AppRoutes.resetPassword) {
          continue;
        }
        expect(redirect(isSignedIn: true, location: route), AppRoutes.home,
            reason: route);
      }
    });
  });
}
