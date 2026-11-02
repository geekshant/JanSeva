import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/routing/app_router.dart';
import '../../core/routing/app_routes.dart';
import '../../data/models/aadhaar_kyc_record.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/repository_providers.dart';

/// Repository singleton provider.
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

/// Tracks authentication state across the app.
///
/// The citizen is signed in when there is a live Supabase session. Emits
/// `true` / `false`; the first event is seeded with the restored session so
/// an already-logged-in citizen is never bounced to `/login`.
///
/// Exposed as a stream provider so the router and screens react to
/// sign-in / sign-out live.
final authStateProvider = StreamProvider<bool>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  if (!repo.isConfigured) {
    // Nothing to authenticate against — stay on the public login screen.
    return const Stream<bool>.empty();
  }

  final controller = StreamController<bool>();
  controller.add(repo.currentUserId != null);

  final sub = repo.authStateChanges.listen((state) {
    if (!controller.isClosed) controller.add(state.session != null);
  });

  ref.onDispose(() {
    sub.cancel();
    controller.close();
  });

  return controller.stream;
});

/// Whether the signed-in citizen has linked their Aadhaar (KYC record).
///
/// Linking is optional: nothing in the router depends on this value. It is
/// read by the Aadhaar screen (to re-check after a submit) and by Profile,
/// which renders the masked number together with the verified badge.
///
/// Returns `null` when signed out, when the lookup could not be completed
/// or when nothing has been linked yet.
final aadhaarVerificationProvider =
    FutureProvider<AadhaarKycRecord?>((ref) async {
  final signedIn = ref.watch(authStateProvider).value ?? false;
  if (!signedIn) return null;

  final result = await ref.watch(aadhaarKycRepositoryProvider).fetchRecord();

  // A failed lookup is deliberately reported as "not linked": the citizen
  // can simply try again from the screen, where submitting re-validates
  // server-side, instead of being locked out with no way forward.
  return result.dataOrNull;
});

/// Listens for the `passwordRecovery` auth event (triggered when the user
/// taps the reset-password link in the email) and navigates to the
/// [ResetPasswordScreen]. Watched by the root [JanMitraApp].
///
/// Watches (not reads) the router so the subscription is moved onto the
/// current [GoRouter] instance whenever auth state recreates it — a read
/// would leave this provider holding a detached router after the first
/// auth event.
final passwordRecoveryProvider = Provider<void>((ref) {
  final repo = ref.watch(authRepositoryProvider);
  final router = ref.watch(appRouterProvider);

  final sub = repo.authStateChanges.listen((state) {
    if (state.event == AuthChangeEvent.passwordRecovery) {
      router.go(AppRoutes.resetPassword);
    }
  });
  ref.onDispose(sub.cancel);
});
