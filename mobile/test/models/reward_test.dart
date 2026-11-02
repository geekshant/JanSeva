import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/data/models/reward.dart';
import 'package:janmitra/data/models/reward_rule.dart';

void main() {
  group('Reward', () {
    test('fromJson parses a reward with its related complaint', () {
      final reward = Reward.fromJson({
        'id': 'r1',
        'user_id': 'p1',
        'complaint_id': 'c1',
        'activity_type': 'VALID_ISSUE_REPORT',
        'points': 50,
        'description': 'Valid issue report: JM-2026-000001',
        'created_at': '2026-09-23T10:00:00+00:00',
        'complaints': {
          'complaint_number': 'JM-2026-000001',
          'title': 'Pothole on Main Road',
        },
      });

      expect(reward.activityType, 'VALID_ISSUE_REPORT');
      expect(reward.points, 50);
      expect(reward.complaintId, 'c1');
      expect(reward.complaintNumber, 'JM-2026-000001');
      expect(reward.complaintTitle, 'Pothole on Main Road');
      expect(reward.isPenalty, isFalse);
      expect(reward.signedPoints, '+50');
      expect(reward.formattedDate, '23 Sep 2026');
    });

    test('penalty rewards are negative and format with a minus sign', () {
      final reward = Reward.fromJson({
        'id': 'r2',
        'user_id': 'p1',
        'complaint_id': null,
        'activity_type': 'DUPLICATE_OR_FAKE_REPORT',
        'points': -50,
        'created_at': '2026-09-24T08:30:00+00:00',
      });

      expect(reward.isPenalty, isTrue);
      expect(reward.signedPoints, '-50');
      expect(reward.complaintNumber, isNull);
      expect(reward.complaintId, isNull);
    });
  });

  group('RewardRule', () {
    test('fromJson parses configurable point values', () {
      final rule = RewardRule.fromJson({
        'activity_type': 'VERIFIED_REPORT',
        'title': 'Verified report',
        'points': 100,
        'description': 'Points when your report is verified',
        'active': true,
      });

      expect(rule.activityType, 'VERIFIED_REPORT');
      expect(rule.points, 100);
      expect(rule.signedPoints, '+100');
      expect(rule.active, isTrue);
    });

    test('negative rules format with a minus sign', () {
      const rule = RewardRule(
        activityType: 'DUPLICATE_OR_FAKE_REPORT',
        title: 'Duplicate/fake report',
        points: -50,
      );
      expect(rule.signedPoints, '-50');
    });
  });
}
