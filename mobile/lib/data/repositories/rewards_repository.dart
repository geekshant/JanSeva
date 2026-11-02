import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../../core/errors/result.dart';
import '../models/badge.dart';
import '../models/leaderboard_entry.dart';
import '../models/reputation_summary.dart';
import '../models/reward.dart';
import '../models/reward_rule.dart';
import '../models/user_badge.dart';

/// Read-only access to the civic reputation system (points, levels, rules,
/// badges and contribution history).
///
/// All point values and level thresholds are owned by the database:
/// this repository only reads `reward_rules` / `level_config` and calls the
/// `get_reputation_summary()` RPC — it never computes or writes points.
/// RLS restricts every query to the signed-in citizen's own rows.
class RewardsRepository {
  RewardsRepository();

  SupabaseClient get _client => SupabaseService.client;

  /// Server-computed summary: points, level, titles and progress-to-next-level.
  ///
  /// Delegates all threshold/progress math to the `get_reputation_summary()`
  /// RPC so nothing is hard-coded in the app.
  Future<Result<ReputationSummary>> fetchSummary() async {
    try {
      final data = await _client.rpc('get_reputation_summary');
      return Result.success(
        ReputationSummary.fromJson(data as Map<String, dynamic>),
      );
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Configurable point rules (e.g. valid report +50, verified +100).
  Future<Result<List<RewardRule>>> fetchRewardRules() async {
    try {
      final data = await _client
          .from('reward_rules')
          .select()
          .eq('active', true)
          .order('points', ascending: false);
      final rules = (data as List)
          .map((e) => RewardRule.fromJson(e as Map<String, dynamic>))
          .toList();
      return Result.success(rules);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// The badge catalog (all defined badges, earned or not).
  Future<Result<List<Badge>>> fetchBadges() async {
    try {
      final data = await _client.from('badges').select().order('name');
      final badges = (data as List)
          .map((e) => Badge.fromJson(e as Map<String, dynamic>))
          .toList();
      return Result.success(badges);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Badges earned by the signed-in citizen (RLS-scoped), newest first.
  Future<Result<List<UserBadge>>> fetchEarnedBadges() async {
    try {
      final data = await _client
          .from('user_badges')
          .select('*, badges(*)')
          .order('earned_at', ascending: false);
      final earned = (data as List)
          .map((e) => UserBadge.fromJson(e as Map<String, dynamic>))
          .toList();
      return Result.success(earned);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Recent point transactions (contribution history), newest first, each
  /// joined with its related complaint number/title when present.
  Future<Result<List<Reward>>> fetchRecentRewards({int limit = 20}) async {
    try {
      final data = await _client
          .from('rewards')
          .select('*, complaints(complaint_number, title)')
          .order('created_at', ascending: false)
          .limit(limit);
      final rewards = (data as List)
          .map((e) => Reward.fromJson(e as Map<String, dynamic>))
          .toList();
      return Result.success(rewards);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// The VALID_ISSUE_REPORT award recorded for a just-submitted complaint.
  ///
  /// Used by the report success screen to show the actual points the
  /// database awarded, instead of a hard-coded value.
  Future<Result<Reward?>> fetchReportReward(String complaintId) async {
    try {
      final data = await _client
          .from('rewards')
          .select()
          .eq('complaint_id', complaintId)
          .eq('activity_type', 'VALID_ISSUE_REPORT')
          .maybeSingle();
      return Result.success(data == null ? null : Reward.fromJson(data));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Display title for a level, from the configurable `level_config` table.
  Future<Result<String>> fetchLevelTitle(int level) async {
    try {
      final data = await _client
          .from('level_config')
          .select('title')
          .eq('level', level)
          .maybeSingle();
      final title = data?['title'] as String?;
      return Result.success(title ?? 'Level $level');
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// The community leaderboard: top contributors ranked by civic points.
  ///
  /// Served by the `community_leaderboard` SECURITY DEFINER RPC, which
  /// returns rank/name/points/level and flags the caller's own row
  /// (`is_me`) so the UI can highlight the signed-in citizen. Privacy-safe:
  /// no user ids or emails are exposed.
  Future<Result<List<LeaderboardEntry>>> fetchLeaderboard({
    int limit = 50,
  }) async {
    try {
      final data = await _client.rpc(
        'community_leaderboard',
        params: {'p_limit': limit},
      );
      final list = (data as List)
          .map((e) => LeaderboardEntry.fromJson(e as Map<String, dynamic>))
          .toList();
      return Result.success(list);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }
}
