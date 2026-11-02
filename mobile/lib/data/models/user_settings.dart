/// Accessibility + DND settings for a citizen, mapped from `user_settings`.
///
/// Stored server-side so settings sync across devices. RLS: self-only.
class UserSettings {
  const UserSettings({
    required this.userId,
    this.fontScale = 1.0,
    this.highContrast = false,
    this.reduceMotion = false,
    this.screenReaderHints = false,
    this.largerTouchTargets = false,
    this.dndStart,
    this.dndEnd,
    this.muteAllNotifications = false,
    this.updatedAt,
  });

  final String userId;
  final double fontScale;
  final bool highContrast;
  final bool reduceMotion;
  final bool screenReaderHints;
  final bool largerTouchTargets;
  final String? dndStart; // "22:00" or null
  final String? dndEnd; // "07:00" or null
  final bool muteAllNotifications;
  final String? updatedAt;

  UserSettings copyWith({
    double? fontScale,
    bool? highContrast,
    bool? reduceMotion,
    bool? screenReaderHints,
    bool? largerTouchTargets,
    String? dndStart,
    String? dndEnd,
    bool? muteAllNotifications,
  }) {
    return UserSettings(
      userId: userId,
      fontScale: fontScale ?? this.fontScale,
      highContrast: highContrast ?? this.highContrast,
      reduceMotion: reduceMotion ?? this.reduceMotion,
      screenReaderHints: screenReaderHints ?? this.screenReaderHints,
      largerTouchTargets: largerTouchTargets ?? this.largerTouchTargets,
      dndStart: dndStart ?? this.dndStart,
      dndEnd: dndEnd ?? this.dndEnd,
      muteAllNotifications: muteAllNotifications ?? this.muteAllNotifications,
      updatedAt: updatedAt,
    );
  }

  factory UserSettings.fromJson(Map<String, dynamic> json) {
    return UserSettings(
      userId: json['user_id'] as String,
      fontScale: (json['font_scale'] as num?)?.toDouble() ?? 1.0,
      highContrast: json['high_contrast'] as bool? ?? false,
      reduceMotion: json['reduce_motion'] as bool? ?? false,
      screenReaderHints: json['screen_reader_hints'] as bool? ?? false,
      largerTouchTargets: json['larger_touch_targets'] as bool? ?? false,
      dndStart: json['dnd_start'] as String?,
      dndEnd: json['dnd_end'] as String?,
      muteAllNotifications: json['mute_all_notifications'] as bool? ?? false,
      updatedAt: json['updated_at'] as String?,
    );
  }
}

/// Per-category notification channel preferences, mapped from
/// `notification_preferences`.
class NotificationPreference {
  const NotificationPreference({
    required this.userId,
    required this.category,
    this.pushEnabled = true,
    this.emailEnabled = false,
    this.smsEnabled = false,
    this.inAppEnabled = true,
  });

  final String userId;
  final String category;
  final bool pushEnabled;
  final bool emailEnabled;
  final bool smsEnabled;
  final bool inAppEnabled;

  NotificationPreference copyWith({
    bool? pushEnabled,
    bool? emailEnabled,
    bool? smsEnabled,
    bool? inAppEnabled,
  }) {
    return NotificationPreference(
      userId: userId,
      category: category,
      pushEnabled: pushEnabled ?? this.pushEnabled,
      emailEnabled: emailEnabled ?? this.emailEnabled,
      smsEnabled: smsEnabled ?? this.smsEnabled,
      inAppEnabled: inAppEnabled ?? this.inAppEnabled,
    );
  }

  factory NotificationPreference.fromJson(Map<String, dynamic> json) {
    return NotificationPreference(
      userId: json['user_id'] as String,
      category: json['category'] as String,
      pushEnabled: json['push_enabled'] as bool? ?? true,
      emailEnabled: json['email_enabled'] as bool? ?? false,
      smsEnabled: json['sms_enabled'] as bool? ?? false,
      inAppEnabled: json['in_app_enabled'] as bool? ?? true,
    );
  }
}

/// All notification category keys used by the app. These map to the
/// `notification_preferences.category` column.
class NotificationCategory {
  NotificationCategory._();
  static const complaintStatus = 'complaint_status';
  static const aiResult = 'ai_result';
  static const communityVerification = 'community_verification';
  static const resolution = 'resolution';
  static const reopenedRejected = 'reopened_rejected';
  static const slaWarning = 'sla_warning';
  static const rewards = 'rewards';
  static const announcements = 'announcements';
  static const productUpdates = 'product_updates';

  static const all = [
    complaintStatus,
    aiResult,
    communityVerification,
    resolution,
    reopenedRejected,
    slaWarning,
    rewards,
    announcements,
    productUpdates,
  ];
}
