import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/core/errors/result.dart';
import 'package:janmitra/features/gamification/rewards_provider.dart';
import 'package:janmitra/data/models/badge.dart';
import 'package:janmitra/data/models/reputation_summary.dart';
import 'package:janmitra/data/models/reward.dart';
import 'package:janmitra/data/models/reward_rule.dart';
import 'package:janmitra/data/models/user_badge.dart';
import 'package:janmitra/data/repositories/repository_providers.dart';
import 'package:janmitra/data/repositories/rewards_repository.dart';

/// In-memory repository backing reputation tests — no Supabase involved.
class InMemoryRewardsRepository extends RewardsRepository {
  InMemoryRewardsRepository({
    required this.summary,
    this.rules = const [],
    this.badges = const [],
    this.earnedBadges = const [],
    this.recentRewards = const [],
    this.reportReward,
  });

  ReputationSummary summary;
  List<RewardRule> rules;
  List<Badge> badges;
  List<UserBadge> earnedBadges;
  List<Reward> recentRewards;
  Reward? reportReward;
  bool failSummary = false;

  @override
  Future<Result<ReputationSummary>> fetchSummary() async {
    if (failSummary) {
      return Result.failure(const Failure(message: 'summary unavailable'));
    }
    return Result.success(summary);
  }

  @override
  Future<Result<List<RewardRule>>> fetchRewardRules() async =>
      Result.success(rules);

  @override
  Future<Result<List<Badge>>> fetchBadges() async => Result.success(badges);

  @override
  Future<Result<List<UserBadge>>> fetchEarnedBadges() async =>
      Result.success(earnedBadges);

  @override
  Future<Result<List<Reward>>> fetchRecentRewards({int limit = 20}) async =>
      Result.success(recentRewards.take(limit).toList());

  @override
  Future<Result<Reward?>> fetchReportReward(String complaintId) async =>
      Result.success(reportReward);

  @override
  Future<Result<String>> fetchLevelTitle(int level) async =>
      Result.success('Level $level title');
}

ReputationSummary summary({
  int points = 150,
  int level = 2,
  String levelTitle = 'Active Citizen',
  int? nextLevel = 3,
  String? nextLevelTitle = 'Community Helper',
  int pointsToNext = 150,
  int progressPercent = 50,
  bool isMaxLevel = false,
  int badgeCount = 1,
}) {
  return ReputationSummary(
    points: points,
    level: level,
    levelTitle: levelTitle,
    levelMinPoints: 100,
    nextLevel: nextLevel,
    nextLevelTitle: nextLevelTitle,
    nextLevelMinPoints: 300,
    pointsToNext: pointsToNext,
    progressPercent: progressPercent,
    isMaxLevel: isMaxLevel,
    badgeCount: badgeCount,
  );
}

Reward reward({
  String id = 'r1',
  String activityType = 'VALID_ISSUE_REPORT',
  int points = 50,
  String? complaintNumber,
}) {
  return Reward(
    id: id,
    userId: 'p1',
    activityType: activityType,
    points: points,
    createdAt: DateTime(2026, 9, 23),
    complaintNumber: complaintNumber,
  );
}

ProviderContainer createContainer(InMemoryRewardsRepository repo) {
  final container = ProviderContainer(
    // Disable Riverpod's default auto-retry (10 exponential backoff attempts
    // ~38s) so error states surface immediately in tests.
    retry: (_, _) => null,
    overrides: [rewardsRepositoryProvider.overrideWith((ref) => repo)],
  );
  addTearDown(container.dispose);
  return container;
}

void main() {
  group('rewardsDashboardProvider', () {
    test('loads summary, rules, badges and history from the repository',
        () async {
      final repo = InMemoryRewardsRepository(
        summary: summary(),
        rules: const [
          RewardRule(
            activityType: 'VALID_ISSUE_REPORT',
            title: 'Valid issue report',
            points: 50,
          ),
        ],
        badges: [
          const Badge(id: 'b1', name: 'First Report'),
          const Badge(id: 'b2', name: 'Civic Watcher'),
        ],
        earnedBadges: [
          UserBadge(
            id: 'ub1',
            userId: 'p1',
            badgeId: 'b1',
            earnedAt: DateTime(2026, 9, 23),
          ),
        ],
        recentRewards: [
          reward(complaintNumber: 'JM-2026-000001'),
          reward(
            id: 'r2',
            activityType: 'DUPLICATE_OR_FAKE_REPORT',
            points: -50,
          ),
        ],
      );
      final container = createContainer(repo);

      final data = await container.read(rewardsDashboardProvider.future);

      expect(data.summary.points, 150);
      expect(data.summary.levelLabel, 'Level 2 — Active Citizen');
      expect(data.rules, hasLength(1));
      expect(data.badges, hasLength(2));
      expect(data.earnedBadgeCount, 1);
      expect(data.isBadgeEarned('b1'), isTrue);
      expect(data.isBadgeEarned('b2'), isFalse);
      expect(data.recentRewards, hasLength(2));
    });

    test('activity titles come from the configurable rules, with a fallback',
        () async {
      final repo = InMemoryRewardsRepository(
        summary: summary(),
        rules: const [
          RewardRule(
            activityType: 'VALID_ISSUE_REPORT',
            title: 'Valid issue report',
            points: 50,
          ),
        ],
        recentRewards: [
          reward(activityType: 'VALID_ISSUE_REPORT'),
          reward(
            id: 'r2',
            activityType: 'SOME_NEW_ACTIVITY',
            points: 5,
          ),
        ],
      );
      final container = createContainer(repo);

      final data = await container.read(rewardsDashboardProvider.future);

      expect(
        data.activityTitleFor(data.recentRewards[0]),
        'Valid issue report',
      );
      expect(
        data.activityTitleFor(data.recentRewards[1]),
        'Some new activity',
      );
    });

    test('throws when the server-side summary cannot be loaded', () async {
      final repo = InMemoryRewardsRepository(
        summary: summary(),
      )..failSummary = true;
      final container = createContainer(repo);

      await expectLater(
        container.read(rewardsDashboardProvider.future),
        throwsA(isA<Exception>()),
      );
    });
  });

  group('reportRewardProvider', () {
    test('returns the award row for a just-submitted complaint', () async {
      final repo = InMemoryRewardsRepository(
        summary: summary(),
        reportReward: reward(points: 50),
      );
      final container = createContainer(repo);

      final rewardRow =
          await container.read(reportRewardProvider('c1').future);

      expect(rewardRow, isNotNull);
      expect(rewardRow!.points, 50);
      expect(rewardRow.signedPoints, '+50');
    });
  });
}
