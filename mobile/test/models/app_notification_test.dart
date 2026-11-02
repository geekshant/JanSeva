import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/data/models/app_notification.dart';

void main() {
  group('AppNotificationType', () {
    test('fromString maps database storage values', () {
      expect(
        AppNotificationType.fromString('COMPLAINT_SUBMITTED'),
        AppNotificationType.complaintSubmitted,
      );
      expect(
        AppNotificationType.fromString('COMPLAINT_VERIFIED'),
        AppNotificationType.complaintVerified,
      );
      expect(
        AppNotificationType.fromString('COMPLAINT_ASSIGNED'),
        AppNotificationType.complaintAssigned,
      );
      expect(
        AppNotificationType.fromString('COMPLAINT_IN_PROGRESS'),
        AppNotificationType.complaintInProgress,
      );
      expect(
        AppNotificationType.fromString('COMPLAINT_RESOLVED'),
        AppNotificationType.complaintResolved,
      );
      expect(
        AppNotificationType.fromString('REWARD_EARNED'),
        AppNotificationType.rewardEarned,
      );
      expect(
        AppNotificationType.fromString('BADGE_EARNED'),
        AppNotificationType.badgeEarned,
      );
    });

    test('fromString falls back to unknown', () {
      expect(
        AppNotificationType.fromString('SOMETHING_ELSE'),
        AppNotificationType.unknown,
      );
      expect(AppNotificationType.fromString(null), AppNotificationType.unknown);
    });

    test('labels cover every notification type', () {
      expect(
        AppNotificationType.complaintSubmitted.label,
        'Complaint Submitted',
      );
      expect(AppNotificationType.complaintVerified.label, 'Complaint Verified');
      expect(AppNotificationType.complaintAssigned.label, 'Complaint Assigned');
      expect(
        AppNotificationType.complaintInProgress.label,
        'Complaint In Progress',
      );
      expect(AppNotificationType.complaintResolved.label, 'Complaint Resolved');
      expect(AppNotificationType.rewardEarned.label, 'Reward Earned');
      expect(AppNotificationType.badgeEarned.label, 'Badge Earned');
    });
  });

  group('AppNotification', () {
    Map<String, dynamic> json({bool isRead = false, String? complaintId}) => {
      'id': 'n1',
      'user_id': 'p1',
      'title': 'Complaint Submitted',
      'message': 'Your complaint JM-2026-000001 has been submitted.',
      'type': 'COMPLAINT_SUBMITTED',
      'is_read': isRead,
      'read_at': isRead ? '2026-09-23T10:00:00+00:00' : null,
      'complaint_id': complaintId,
      'created_at': '2026-09-23T09:30:00+00:00',
      'data': {'complaint_id': complaintId},
    };

    test('fromJson parses a notification row', () {
      final n = AppNotification.fromJson(json(complaintId: 'c1'));
      expect(n.id, 'n1');
      expect(n.userId, 'p1');
      expect(n.title, 'Complaint Submitted');
      expect(n.type, AppNotificationType.complaintSubmitted);
      expect(n.isRead, isFalse);
      expect(n.readAt, isNull);
      expect(n.complaintId, 'c1');
      expect(n.relatesToComplaint, isTrue);
      expect(n.createdAt, DateTime.parse('2026-09-23T09:30:00+00:00'));
      expect(n.data?['complaint_id'], 'c1');
    });

    test('fromJson keeps read state and read timestamp', () {
      final n = AppNotification.fromJson(json(isRead: true));
      expect(n.isRead, isTrue);
      expect(n.readAt, isNotNull);
    });

    test('relatesToComplaint is false without a complaint id', () {
      final n = AppNotification.fromJson(json());
      expect(n.complaintId, isNull);
      expect(n.relatesToComplaint, isFalse);
    });

    test('copyWith flips read state without touching other fields', () {
      final n = AppNotification.fromJson(json());
      final readAt = DateTime(2026, 9, 24, 12);
      final updated = n.copyWith(isRead: true, readAt: readAt);

      expect(updated.isRead, isTrue);
      expect(updated.readAt, readAt);
      expect(updated.id, n.id);
      expect(updated.title, n.title);
      expect(updated.message, n.message);
      expect(updated.type, n.type);
      expect(updated.complaintId, n.complaintId);
      expect(n.isRead, isFalse, reason: 'original stays unchanged');
    });

    test('formattedTimestamp renders a readable local timestamp', () {
      final n = AppNotification.fromJson(json());
      expect(n.formattedTimestamp, isNotEmpty);
      expect(n.formattedTimestamp, contains('2026'));
    });
  });
}
