import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../core/theme/app_colors.dart';

/// The kind of notification, mirrored from the `notifications.type` column.
///
/// Values match the database triggers in `database/06_notifications.sql`.
enum AppNotificationType {
  complaintSubmitted('COMPLAINT_SUBMITTED'),
  complaintVerified('COMPLAINT_VERIFIED'),
  complaintAssigned('COMPLAINT_ASSIGNED'),
  complaintInProgress('COMPLAINT_IN_PROGRESS'),
  complaintResolved('COMPLAINT_RESOLVED'),
  rewardEarned('REWARD_EARNED'),
  badgeEarned('BADGE_EARNED'),
  unknown('UNKNOWN');

  const AppNotificationType(this.storageValue);

  /// Value stored in the database `type` column.
  final String storageValue;

  static AppNotificationType fromString(String? value) {
    for (final type in AppNotificationType.values) {
      if (type.storageValue == value) return type;
    }
    return AppNotificationType.unknown;
  }

  /// Human-readable category label.
  String get label => switch (this) {
    AppNotificationType.complaintSubmitted => 'Complaint Submitted',
    AppNotificationType.complaintVerified => 'Complaint Verified',
    AppNotificationType.complaintAssigned => 'Complaint Assigned',
    AppNotificationType.complaintInProgress => 'Complaint In Progress',
    AppNotificationType.complaintResolved => 'Complaint Resolved',
    AppNotificationType.rewardEarned => 'Reward Earned',
    AppNotificationType.badgeEarned => 'Badge Earned',
    AppNotificationType.unknown => 'Notification',
  };

  /// Leading icon for the notification tile.
  IconData get icon => switch (this) {
    AppNotificationType.complaintSubmitted =>
      Icons.report_gmailerrorred_outlined,
    AppNotificationType.complaintVerified => Icons.verified_outlined,
    AppNotificationType.complaintAssigned => Icons.assignment_outlined,
    AppNotificationType.complaintInProgress => Icons.engineering_outlined,
    AppNotificationType.complaintResolved => Icons.check_circle_outline_rounded,
    AppNotificationType.rewardEarned => Icons.stars_outlined,
    AppNotificationType.badgeEarned => Icons.military_tech_outlined,
    AppNotificationType.unknown => Icons.notifications_outlined,
  };

  /// Accent color for the leading icon.
  Color get color => switch (this) {
    AppNotificationType.complaintSubmitted => AppColors.underReview,
    AppNotificationType.complaintVerified => AppColors.verified,
    AppNotificationType.complaintAssigned => AppColors.info,
    AppNotificationType.complaintInProgress => AppColors.inProgress,
    AppNotificationType.complaintResolved => AppColors.resolved,
    AppNotificationType.rewardEarned => AppColors.warning,
    AppNotificationType.badgeEarned => AppColors.duplicate,
    AppNotificationType.unknown => AppColors.submitted,
  };
}

/// A persistent in-app notification, mapped from the `notifications` table.
class AppNotification {
  const AppNotification({
    required this.id,
    required this.userId,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
    this.readAt,
    this.complaintId,
    this.data,
  });

  final String id;
  final String userId;
  final String title;
  final String message;
  final AppNotificationType type;
  final bool isRead;
  final DateTime createdAt;
  final DateTime? readAt;

  /// Related complaint, when the notification is complaint-scoped.
  final String? complaintId;

  /// Extra structured payload (points, badge name, ...).
  final Map<String, dynamic>? data;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] as String,
      message: json['message'] as String,
      type: AppNotificationType.fromString(json['type'] as String?),
      isRead: json['is_read'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      readAt: json['read_at'] == null
          ? null
          : DateTime.parse(json['read_at'] as String),
      complaintId: json['complaint_id'] as String?,
      data: json['data'] is Map<String, dynamic>
          ? json['data'] as Map<String, dynamic>
          : null,
    );
  }

  AppNotification copyWith({bool? isRead, DateTime? readAt}) {
    return AppNotification(
      id: id,
      userId: userId,
      title: title,
      message: message,
      type: type,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
      readAt: readAt ?? this.readAt,
      complaintId: complaintId,
      data: data,
    );
  }

  /// Whether tapping this notification should open a complaint.
  bool get relatesToComplaint => complaintId != null && complaintId!.isNotEmpty;

  /// Formatted timestamp, e.g. "23 Sep 2026, 04:12 PM".
  String get formattedTimestamp =>
      DateFormat('d MMM yyyy, hh:mm a').format(createdAt.toLocal());
}
