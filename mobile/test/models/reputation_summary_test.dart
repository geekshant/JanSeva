import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/data/models/reputation_summary.dart';

void main() {
  group('ReputationSummary', () {
    test('fromJson parses a mid-level summary from the RPC payload', () {
      final summary = ReputationSummary.fromJson({
        'points': 150,
        'level': 2,
        'level_title': 'Active Citizen',
        'level_min_points': 100,
        'next_level': 3,
        'next_level_title': 'Community Helper',
        'next_level_min_points': 300,
        'points_to_next': 150,
        'progress_percent': 50,
        'is_max_level': false,
        'badge_count': 2,
      });

      expect(summary.points, 150);
      expect(summary.level, 2);
      expect(summary.levelTitle, 'Active Citizen');
      expect(summary.levelLabel, 'Level 2 — Active Citizen');
      expect(summary.nextLevel, 3);
      expect(summary.nextLevelTitle, 'Community Helper');
      expect(summary.pointsToNext, 150);
      expect(summary.progressPercent, 50);
      expect(summary.isMaxLevel, isFalse);
      expect(summary.badgeCount, 2);
    });

    test('parses a max-level summary with null next-level fields', () {
      final summary = ReputationSummary.fromJson({
        'points': 1500,
        'level': 5,
        'level_title': 'Civic Champion',
        'level_min_points': 1000,
        'next_level': null,
        'next_level_title': null,
        'next_level_min_points': null,
        'points_to_next': 0,
        'progress_percent': 100,
        'is_max_level': true,
        'badge_count': 6,
      });

      expect(summary.level, 5);
      expect(summary.levelTitle, 'Civic Champion');
      expect(summary.levelLabel, 'Level 5 — Civic Champion');
      expect(summary.nextLevel, isNull);
      expect(summary.nextLevelTitle, isNull);
      expect(summary.isMaxLevel, isTrue);
      expect(summary.progressPercent, 100);
    });

    test('tolerates a missing payload (defensive defaults)', () {
      final summary = ReputationSummary.fromJson(const {});

      expect(summary.points, 0);
      expect(summary.level, 1);
      expect(summary.levelTitle, 'Civic Starter');
      expect(summary.progressPercent, 0);
      expect(summary.isMaxLevel, isFalse);
    });
  });
}
