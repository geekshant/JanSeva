import 'dart:async';

import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/core/errors/result.dart';
import 'package:janmitra/features/notifications/device_token_provider.dart';
import 'package:janmitra/data/models/app_notification.dart';
import 'package:janmitra/data/repositories/notification_repository.dart';

/// In-memory [NotificationRepository] that records device-token operations.
class FakeNotificationRepository extends NotificationRepository {
  FakeNotificationRepository({this.failRegister = false});

  bool failRegister;
  String? registeredProfileId;
  String? registeredToken;
  String? registeredPlatform;
  int registerCalls = 0;

  @override
  Future<Result<void>> registerDeviceToken({
    required String profileId,
    required String token,
    String? platform,
  }) async {
    registerCalls++;
    if (failRegister) {
      return Result.failure(const Failure(message: 'register failed'));
    }
    registeredProfileId = profileId;
    registeredToken = token;
    registeredPlatform = platform;
    return Result.success(null);
  }

  @override
  Future<Result<List<AppNotification>>> fetchNotifications({
    required String profileId,
    int limit = 100,
  }) async => Result.success(const []);

  @override
  Future<Result<void>> markAsRead(String notificationId) async =>
      Result.success(null);

  @override
  Future<Result<int>> markAllAsRead(String profileId) async =>
      Result.success(0);

  @override
  Future<Result<int>> fetchUnreadCount(String profileId) async =>
      Result.success(0);

  @override
  Future<Result<void>> unregisterDeviceToken({
    required String profileId,
    required String token,
  }) async => Result.success(null);
}

/// Fake push stack so registration is testable without Firebase.
class FakePushTokenSource implements PushTokenSource {
  FakePushTokenSource({this.available = true, this.token = 'fcm-token-abc'});

  bool available;
  String? token;
  int ensureCalls = 0;
  int getTokenCalls = 0;
  final StreamController<String> _refreshController =
      StreamController<String>.broadcast();

  @override
  Future<bool> ensureAvailable() async {
    ensureCalls++;
    return available;
  }

  @override
  Future<String?> getToken() async {
    getTokenCalls++;
    return token;
  }

  @override
  Stream<String> get onTokenRefresh => _refreshController.stream;

  @override
  String get platform => 'android';

  void emitRefresh(String rotated) => _refreshController.add(rotated);

  void dispose() => _refreshController.close();
}

void main() {
  group('DeviceTokenRegistrar.register', () {
    test('associates the FCM token with the authenticated profile', () async {
      final repo = FakeNotificationRepository();
      final source = FakePushTokenSource(token: 'device-token-xyz');
      final registrar = DeviceTokenRegistrar(
        tokenSource: source,
        repository: repo,
      );

      final result = await registrar.register(profileId: 'profile-1');

      expect(result.isSuccess, isTrue);
      expect(result.dataOrNull, 'device-token-xyz');
      expect(source.ensureCalls, 1);
      expect(source.getTokenCalls, 1);
      expect(repo.registerCalls, 1);
      expect(repo.registeredProfileId, 'profile-1');
      expect(repo.registeredToken, 'device-token-xyz');
      expect(repo.registeredPlatform, 'android');
    });

    test(
      'fails when push is unavailable and never hits the repository',
      () async {
        final repo = FakeNotificationRepository();
        final source = FakePushTokenSource(available: false);
        final registrar = DeviceTokenRegistrar(
          tokenSource: source,
          repository: repo,
        );

        final result = await registrar.register(profileId: 'profile-1');

        expect(result.isFailure, isTrue);
        expect(
          result.failureOrNull!.message,
          'Push notifications are not available.',
        );
        expect(repo.registerCalls, 0);
        expect(source.getTokenCalls, 0);
      },
    );

    test('fails when the push stack returns no token', () async {
      final repo = FakeNotificationRepository();
      final source = FakePushTokenSource(token: null);
      final registrar = DeviceTokenRegistrar(
        tokenSource: source,
        repository: repo,
      );

      final result = await registrar.register(profileId: 'profile-1');

      expect(result.isFailure, isTrue);
      expect(result.failureOrNull!.message, 'Could not retrieve device token.');
      expect(repo.registerCalls, 0);
    });

    test('propagates repository failures', () async {
      final repo = FakeNotificationRepository(failRegister: true);
      final source = FakePushTokenSource();
      final registrar = DeviceTokenRegistrar(
        tokenSource: source,
        repository: repo,
      );

      final result = await registrar.register(profileId: 'profile-1');

      expect(result.isFailure, isTrue);
      expect(result.failureOrNull!.message, 'register failed');
    });

    test(
      'registerToken persists a rotated token for the same profile',
      () async {
        final repo = FakeNotificationRepository();
        final source = FakePushTokenSource();
        final registrar = DeviceTokenRegistrar(
          tokenSource: source,
          repository: repo,
        );

        final result = await registrar.registerToken(
          profileId: 'profile-1',
          token: 'rotated-token',
        );

        expect(result.isSuccess, isTrue);
        expect(repo.registeredProfileId, 'profile-1');
        expect(repo.registeredToken, 'rotated-token');
        expect(repo.registeredPlatform, 'android');
      },
    );

    test('empty token string is treated as missing', () async {
      final repo = FakeNotificationRepository();
      final source = FakePushTokenSource(token: '');
      final registrar = DeviceTokenRegistrar(
        tokenSource: source,
        repository: repo,
      );

      final result = await registrar.register(profileId: 'profile-1');

      expect(result.isFailure, isTrue);
      expect(repo.registerCalls, 0);
    });
  });
}
