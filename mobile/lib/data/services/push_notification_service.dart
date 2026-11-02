import 'dart:async';
import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../../core/config/app_config.dart';
import '../../core/utils/app_logger.dart';

/// Firebase Cloud Messaging facade for the app.
///
/// Responsibilities:
/// * Initialize Firebase from the public client config in `.env` (graceful
///   no-op when unconfigured, so in-app notifications always work).
/// * Request notification permission.
/// * Expose the device registration token (associated with the signed-in user
///   by the device token registrar - the token itself is not a secret).
/// * Display foreground messages via flutter_local_notifications.
/// * Surface notification taps (`onMessageOpened`) for navigation.
///
/// SECURITY: this service only ever holds Firebase *client* identifiers
/// (API key / app id / sender id - public by design). The server credentials
/// used to *send* pushes live exclusively in the trusted backend / Edge
/// Function secrets and are never bundled into Flutter.
class PushNotificationService {
  PushNotificationService._();

  static final PushNotificationService instance = PushNotificationService._();

  bool _initialized = false;
  bool _permissionRequested = false;
  FlutterLocalNotificationsPlugin? _localNotifications;
  final StreamController<Map<String, String>> _messageOpenedController =
      StreamController<Map<String, String>>.broadcast();

  /// True once Firebase has been initialized successfully.
  bool get isAvailable => _initialized;

  /// Emits the data payload when the user taps a notification
  /// (background -> foreground, or app opened from a tap).
  Stream<Map<String, String>> get onMessageOpened =>
      _messageOpenedController.stream;

  /// FCM token rotation events (re-register when this fires).
  Stream<String> get onTokenRefresh =>
      FirebaseMessaging.instance.onTokenRefresh;

  /// Initializes the local-notifications stack plus, when configured, Firebase
  /// Cloud Messaging. Returns `false` (and logs) when FCM is not configured or
  /// initialization fails - callers must treat this as "FCM disabled", never as
  /// a fatal error. Local notifications are set up regardless of Firebase so
  /// in-app notifications and the OS permission prompt keep working.
  Future<bool> initialize() async {
    if (_initialized) return true;

    // Local notifications (channel + tap handling) work with or without
    // Firebase, so set them up first regardless of FCM availability.
    await _initializeLocalNotifications();

    final options = AppConfig.firebaseOptions;
    if (options == null) {
      AppLogger.info(
        'Push (FCM) disabled: FIREBASE_* keys missing from .env '
        '(local notifications still work).',
      );
      return false;
    }

    try {
      await Firebase.initializeApp(options: options);

      FirebaseMessaging.onMessage.listen(_onForegroundMessage);
      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        _messageOpenedController.add(Map<String, String>.from(message.data));
      });

      _initialized = true;
      AppLogger.info('Firebase Cloud Messaging initialized.');
      return true;
    } on Exception catch (e, st) {
      AppLogger.error('Firebase initialization failed; push disabled.', e, st);
      return false;
    } on Object catch (e, st) {
      // PlatformException and friends are not always Exception subclasses.
      AppLogger.error('Firebase initialization failed; push disabled.', e, st);
      return false;
    }
  }

  Future<void> _initializeLocalNotifications() async {
    const settings = InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    );
    final plugin = FlutterLocalNotificationsPlugin();
    await plugin.initialize(
      settings: settings,
      onDidReceiveNotificationResponse: (response) {
        final payload = response.payload;
        if (payload == null || payload.isEmpty) return;
        try {
          final data = (jsonDecode(payload) as Map).cast<String, String>();
          _messageOpenedController.add(data);
        } on Exception catch (e) {
          AppLogger.warning('Bad notification tap payload: $e');
        }
      },
    );

    final android = plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        'janmitra_alerts',
        'JanMitra Alerts',
        description: 'Complaint updates, rewards and badges',
        importance: Importance.high,
      ),
    );
    _localNotifications = plugin;
  }

  /// Requests the OS notification permission (Android 13+ POST_NOTIFICATIONS /
  /// iOS alert+badge+sound) via flutter_local_notifications. Works WITHOUT
  /// Firebase, so the prompt appears at launch even when push (FCM) is not
  /// configured. Idempotent: the OS only prompts until the user decides, after
  /// which this returns the current authorization state.
  ///
  /// Must be called after [initialize]. Returns `false` when local
  /// notifications could not be initialized or the request failed.
  Future<bool> requestNotificationPermission() async {
    final plugin = _localNotifications;
    if (plugin == null) return false;
    try {
      if (defaultTargetPlatform == TargetPlatform.android) {
        final android = plugin.resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>();
        final granted = await android?.requestNotificationsPermission();
        AppLogger.info('Local notification permission (Android): $granted');
        return granted ?? false;
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        final ios = plugin.resolvePlatformSpecificImplementation<
            IOSFlutterLocalNotificationsPlugin>();
        final granted = await ios?.requestPermissions(
          alert: true,
          badge: true,
          sound: true,
        );
        AppLogger.info('Local notification permission (iOS): $granted');
        return granted ?? false;
      }
    } on Exception catch (e) {
      AppLogger.warning('Local notification permission request failed: $e');
    }
    return false;
  }

  /// Requests notification permission (Android 13+ / iOS). Idempotent.
  Future<bool> requestPermission() async {
    if (!_initialized) return false;
    if (_permissionRequested) {
      final settings = await FirebaseMessaging.instance
          .getNotificationSettings();
      return settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional;
    }
    try {
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      _permissionRequested = true;
      AppLogger.info(
        'Notification permission: ${settings.authorizationStatus}',
      );
      return settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional;
    } on Exception catch (e) {
      AppLogger.warning('Notification permission request failed: $e');
      return false;
    }
  }

  /// The FCM registration token, or `null` when push is unavailable.
  Future<String?> getToken() async {
    if (!_initialized) return null;
    try {
      return await FirebaseMessaging.instance.getToken();
    } on Exception catch (e) {
      AppLogger.warning('FCM getToken failed: $e');
      return null;
    }
  }

  /// Cold-start data payload when the app was launched by tapping a
  /// notification, or `null`.
  Future<Map<String, String>?> getInitialMessage() async {
    if (!_initialized) return null;
    try {
      final message = await FirebaseMessaging.instance.getInitialMessage();
      return message == null ? null : Map<String, String>.from(message.data);
    } on Exception catch (e) {
      AppLogger.warning('getInitialMessage failed: $e');
      return null;
    }
  }

  /// Removes the token from Firebase (best effort).
  Future<void> deleteToken() async {
    if (!_initialized) return;
    try {
      await FirebaseMessaging.instance.deleteToken();
    } on Exception catch (e) {
      AppLogger.warning('FCM deleteToken failed: $e');
    }
  }

  void _onForegroundMessage(RemoteMessage message) {
    final notification = message.notification;
    if (notification == null) return;

    _localNotifications?.show(
      id: notification.hashCode,
      title: notification.title ?? 'JanMitra',
      body: notification.body ?? '',
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'janmitra_alerts',
          'JanMitra Alerts',
          channelDescription: 'Complaint updates, rewards and badges',
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
      payload: jsonEncode(message.data),
    );
  }
}

/// Platform label stored in the `device_tokens.platform` column.
String pushPlatformName() {
  return switch (defaultTargetPlatform) {
    TargetPlatform.android => 'android',
    TargetPlatform.iOS => 'ios',
    _ => 'unknown',
  };
}
