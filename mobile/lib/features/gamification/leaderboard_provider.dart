import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/leaderboard_entry.dart';
import '../../data/repositories/repository_providers.dart';

/// Fetches the community leaderboard (top contributors by civic points).
///
/// Delegates to [RewardsRepository.fetchLeaderboard] so no Supabase call
/// lives in the state/UI layer. The repository returns a `Result`; a failure
/// is rethrown here so the `FutureProvider` surfaces it as an error state
/// (consumed by the screen's `.when(error:)` branch).
final leaderboardProvider =
    FutureProvider.autoDispose<List<LeaderboardEntry>>((ref) async {
  final repo = ref.watch(rewardsRepositoryProvider);
  final result = await repo.fetchLeaderboard(limit: 50);
  return result.when(
    success: (entries) => entries,
    failure: (failure) => throw Exception(failure.message),
  );
});
