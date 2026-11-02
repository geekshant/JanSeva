import 'package:flutter/material.dart' hide Badge;
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/core/errors/result.dart';
import 'package:janmitra/core/i18n/app_localizations.dart';
import 'package:janmitra/features/gamification/rewards_screen.dart';
import 'package:janmitra/data/models/badge.dart';
import 'package:janmitra/data/models/reputation_summary.dart';
import 'package:janmitra/data/models/reward.dart';
import 'package:janmitra/data/models/reward_rule.dart';
import 'package:janmitra/data/models/user_badge.dart';
import 'package:janmitra/data/repositories/repository_providers.dart';
import 'package:janmitra/data/repositories/rewards_repository.dart';

class FakeRewardsRepository extends RewardsRepository {
  FakeRewardsRepository({
    required this.summary,
    this.rules = const [],
    this.badges = const [],
    this.earnedBadges = const [],
    this.recentRewards = const [],
  });

  final ReputationSummary summary;
  final List<RewardRule> rules;
  final List<Badge> badges;
  final List<UserBadge> earnedBadges;
  final List<Reward> recentRewards;

  @override
  Future<Result<ReputationSummary>> fetchSummary() async =>
      Result.success(summary);

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
      Result.success(recentRewards);

  @override
  Future<Result<Reward?>> fetchReportReward(String complaintId) async =>
      Result.success(null);

  @override
  Future<Result<String>> fetchLevelTitle(int level) async =>
      Result.success('Civic Starter');
}

Widget buildUnderTest(FakeRewardsRepository repo) {
  return ProviderScope(
    overrides: [rewardsRepositoryProvider.overrideWith((ref) => repo)],
    child: MaterialApp(
      home: const RewardsScreen(),
      supportedLocales: kSupportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    ),
  );
}

/// Pumps the screen in a tall viewport so every ListView section (history
/// sits far below the fold on a default 800x600 test surface) is built.
Future<void> pumpRewardsScreen(
  WidgetTester tester,
  FakeRewardsRepository repo,
) async {
  tester.view.physicalSize = const Size(400, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(buildUnderTest(repo));
  await tester.pumpAndSettle();
}

void main() {
  final summary = ReputationSummary(
    points: 150,
    level: 2,
    levelTitle: 'Active Citizen',
    levelMinPoints: 100,
    nextLevel: 3,
    nextLevelTitle: 'Community Helper',
    nextLevelMinPoints: 300,
    pointsToNext: 150,
    progressPercent: 50,
    isMaxLevel: false,
    badgeCount: 2,
  );

  final rules = const [
    RewardRule(
      activityType: 'VALID_ISSUE_REPORT',
      title: 'Valid issue report',
      points: 50,
      description: 'Points for reporting a valid civic issue',
    ),
    RewardRule(
      activityType: 'DUPLICATE_OR_FAKE_REPORT',
      title: 'Duplicate/fake report',
      points: -50,
    ),
  ];

  final badges = const [
    Badge(
      id: 'b1',
      name: 'First Report',
      description: 'Submitted your first civic issue',
      icon: 'flag',
    ),
    Badge(
      id: 'b2',
      name: 'Civic Watcher',
      description: 'Reported 5 civic issues',
      icon: 'visibility',
    ),
    Badge(
      id: 'b3',
      name: 'Trusted Citizen',
      description: 'Had 3 reports verified by the team',
      icon: 'verified',
    ),
  ];

  final earned = [
    UserBadge(
      id: 'ub1',
      userId: 'p1',
      badgeId: 'b1',
      earnedAt: DateTime(2026, 9, 23),
      badge: badges[0],
    ),
  ];

  final history = [
    Reward(
      id: 'r1',
      userId: 'p1',
      complaintId: 'c1',
      activityType: 'VALID_ISSUE_REPORT',
      points: 50,
      createdAt: DateTime(2026, 9, 23),
      complaintNumber: 'JM-2026-000001',
    ),
    Reward(
      id: 'r2',
      userId: 'p1',
      complaintId: 'c2',
      activityType: 'DUPLICATE_OR_FAKE_REPORT',
      points: -50,
      createdAt: DateTime(2026, 9, 22),
      complaintNumber: 'JM-2026-000002',
    ),
  ];

  testWidgets(
    'shows total points, current level and progress to the next level',
    (tester) async {
      await pumpRewardsScreen(
        tester,
        FakeRewardsRepository(
          summary: summary,
          rules: rules,
          badges: badges,
          earnedBadges: earned,
          recentRewards: history,
        ),
      );

      expect(find.byKey(const Key('rewardsSummaryCard')), findsOneWidget);
      expect(find.byKey(const Key('totalPoints')), findsOneWidget);
      expect(find.text('150 Points'), findsOneWidget);
      expect(find.text('Level 2 — Active Citizen'), findsOneWidget);
      expect(
        find.text('150 pts to Level 3 — Community Helper'),
        findsOneWidget,
      );
      expect(find.byKey(const Key('levelProgress')), findsOneWidget);
    },
  );

  testWidgets('shows badges with earned/locked state', (tester) async {
    await pumpRewardsScreen(
      tester,
      FakeRewardsRepository(
        summary: summary,
        badges: badges,
        earnedBadges: earned,
        rules: rules,
        recentRewards: history,
      ),
    );

    expect(find.text('Badges'), findsOneWidget);
    expect(find.text('1 of 3 earned'), findsOneWidget);
    expect(find.byKey(const Key('badge-First Report')), findsOneWidget);
    expect(find.byKey(const Key('badge-Civic Watcher')), findsOneWidget);
    expect(find.byKey(const Key('badge-Trusted Citizen')), findsOneWidget);
    expect(find.text('Earned'), findsOneWidget);
    expect(find.text('Locked'), findsNWidgets(2));
  });

  testWidgets('renders contribution history with activity, points, date and '
      'related complaint', (tester) async {
    await pumpRewardsScreen(
      tester,
      FakeRewardsRepository(
        summary: summary,
        badges: badges,
        earnedBadges: earned,
        rules: rules,
        recentRewards: history,
      ),
    );

    expect(find.text('Contribution History'), findsOneWidget);
    // Activity labels come from reward_rules.
    expect(find.text('Valid issue report'), findsWidgets);
    expect(find.text('Duplicate/fake report'), findsWidgets);
    // Related complaints.
    expect(find.text('Complaint JM-2026-000001'), findsOneWidget);
    expect(find.text('Complaint JM-2026-000002'), findsOneWidget);
    // Points and dates.
    expect(find.text('+50'), findsWidgets);
    expect(find.text('-50'), findsWidgets);
    expect(find.text('23 Sep 2026'), findsOneWidget);
    expect(find.text('22 Sep 2026'), findsOneWidget);
    expect(find.byKey(const Key('reward-r1')), findsOneWidget);
    expect(find.byKey(const Key('reward-r2')), findsOneWidget);
  });

  testWidgets('shows the configurable point rules section', (tester) async {
    await pumpRewardsScreen(
      tester,
      FakeRewardsRepository(
        summary: summary,
        badges: badges,
        earnedBadges: earned,
        rules: rules,
        recentRewards: history,
      ),
    );

    expect(find.text('How points work'), findsOneWidget);
    expect(find.byKey(const Key('rewardRules')), findsOneWidget);
    expect(find.text('Points for reporting a valid civic issue'), findsOneWidget);
  });

  testWidgets('shows the empty history state when there are no rewards',
      (tester) async {
    await pumpRewardsScreen(
      tester,
      FakeRewardsRepository(
        summary: ReputationSummary(
          points: 0,
          level: 1,
          levelTitle: 'Civic Starter',
          levelMinPoints: 0,
          nextLevel: 2,
          nextLevelTitle: 'Active Citizen',
          nextLevelMinPoints: 100,
          pointsToNext: 100,
          progressPercent: 0,
          isMaxLevel: false,
          badgeCount: 0,
        ),
        badges: badges,
      ),
    );

    expect(find.text('0 Points'), findsOneWidget);
    expect(find.text('Level 1 — Civic Starter'), findsOneWidget);
    expect(find.text('No contributions yet'), findsOneWidget);
  });
}
