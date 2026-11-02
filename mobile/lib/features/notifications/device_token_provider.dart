import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/services/push_notification_service.dart';
import '../../core/utils/app_logger.dart';
import '../../core/errors/result.dart';
import '../../data/repositories/notification_repository.dart';
import '../../data/repositories/repository_providers.dart';
import '../auth/auth_provider.dart';
import '../profile/current_profile_provider.dart';

/// Source of the device registration token.
///
/// Abstracted so token registration can be unit-tested without Firebase.
abstract interface class PushTokenSource {
  /// Ensures the underlying push stack is ready (initializes if needed).
  Future<bool> ensureAvailable();

  /// Current registration token, or `null` when unavailable.
  Future<String?> getToken();

  /// Token rotation stream from the push stack.
  ///
  /// Empty when push is unavailable, so listeners can attach unconditionally.
  Stream<String> get onTokenRefresh;

  /// Platform label stored alongside the token.
  String get platform;
}

/// Production [PushTokenSource] backed by Firebase Cloud Messaging.
class FcmPushTokenSource implements PushTokenSource {
  FcmPushTokenSource([PushNotificationService? service])
    : _service = service ?? PushNotificationService.instance;

  final PushNotificationService _service;

  @override
  Future<bool> ensureAvailable() async {
    if (_service.isAvailable) return true;
    return _service.initialize();
  }

  @override
  Future<String?> getToken() async {
    await _service.requestPermission();
    return _service.getToken();
  }

  @override
  Stream<String> get onTokenRefresh {
    // FirebaseMessaging.instance throws when Firebase is not initialized,
    // so only expose the real stream once push is live.
    if (!_service.isAvailable) return const Stream<String>.empty();
    return _service.onTokenRefresh;
  }

  @override
  String get platform => pushPlatformName();
}

/// Registers the device's FCM token against the signed-in user's profile.
///
/// Flow: ensure push is available -> request permission -> fetch token ->
/// upsert into `device_tokens` (RLS forces `user_id = own profile`).
class DeviceTokenRegistrar {
  DeviceTokenRegistrar({required this.tokenSource, required this.repository});

  final PushTokenSource tokenSource;
  final NotificationRepository repository;

  /// Registers the current device token for [profileId].
  ///
  /// Returns the registered token on success, or a [Failure] describing why
  /// registration was skipped/failed (push unavailable, no token, network).
  Future<Result<String>> register({required String profileId}) async {
    final available = await tokenSource.ensureAvailable();
    if (!available) {
      return Result.failure(
        const Failure(message: 'Push notifications are not available.'),
      );
    }

    final token = await tokenSource.getToken();
    if (token == null || token.isEmpty) {
      return Result.failure(
        const Failure(message: 'Could not retrieve device token.'),
      );
    }

    final result = await repository.registerDeviceToken(
      profileId: profileId,
      token: token,
      platform: tokenSource.platform,
    );
    if (result.isFailure) {
      return Result.failure(result.failureOrNull!);
    }
    return Result.success(token);
  }

  /// Registers a rotated token (from `onTokenRefresh`) for [profileId].
  Future<Result<void>> registerToken({
    required String profileId,
    required String token,
  }) async {
    final result = await repository.registerDeviceToken(
      profileId: profileId,
      token: token,
      platform: tokenSource.platform,
    );
    if (result.isFailure) return Result.failure(result.failureOrNull!);
    return Result.success(null);
  }
}

final deviceTokenRegistrarProvider = Provider<DeviceTokenRegistrar>((ref) {
  return DeviceTokenRegistrar(
    tokenSource: FcmPushTokenSource(),
    repository: ref.watch(notificationRepositoryProvider),
  );
});

/// Watches auth state and keeps the FCM token registered for the signed-in
/// user, including silent token rotations.
///
/// Watched by the main shell so it stays alive for the whole session.
final deviceTokenRegistrationProvider = Provider<void>((ref) {
  final signedIn = ref.watch(authStateProvider).value ?? false;
  if (!signedIn) return;

  final registrar = ref.read(deviceTokenRegistrarProvider);
  final profileRepo = ref.read(profileRepositoryProvider);
  final profileFuture = ref.read(currentProfileIdProvider.future);

  StreamSubscription<String>? refreshSub;
  var disposed = false;
  ref.onDispose(() {
    disposed = true;
    refreshSub?.cancel();
  });

  Future<void> register({String? rotatedToken}) async {
    try {
      final profileId = await profileFuture;
      if (disposed) return;

      // Respect the citizen's push preference (`profiles.notify_push`, set
      // on the Notifications & privacy screen): no token, no push.
      final profileResult = await profileRepo.fetchCurrentProfile();
      if (disposed) return;
      if (!(profileResult.dataOrNull?.notifyPush ?? true)) {
        AppLogger.info(
          'Push notifications are off in preferences; skipping token '
          'registration.',
        );
        return;
      }

      if (rotatedToken == null) {
        final result = await registrar.register(profileId: profileId);
        if (disposed) return;
        result.when(
          success: (token) => AppLogger.info(
            'FCM device token registered (${token.length} chars).',
          ),
          failure: (failure) => AppLogger.warning(
            'FCM token registration failed: ${failure.message}',
          ),
        );
      } else {
        final result = await registrar.registerToken(
          profileId: profileId,
          token: rotatedToken,
        );
        if (disposed) return;
        result.when(
          success: (_) =>
              AppLogger.info('FCM device token rotated; re-registered.'),
          failure: (failure) => AppLogger.warning(
            'FCM token re-registration failed: ${failure.message}',
          ),
        );
      }
    } on Exception catch (e) {
      if (!disposed) AppLogger.warning('FCM token registration error: $e');
    }
  }

  // Initial registration, then keep up with silent token rotations.
  register().whenComplete(() {
    if (disposed) return;
    refreshSub ??= registrar.tokenSource.onTokenRefresh.listen((token) {
      register(rotatedToken: token);
    });
  });
});
