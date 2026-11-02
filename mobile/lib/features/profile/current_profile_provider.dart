import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/repository_providers.dart';

/// Resolves the signed-in citizen's profile id (`profiles.id`).
///
/// RLS ensures `fetchCurrentProfile` only ever returns the caller's own row,
/// so a failed lookup means "not signed in" (or profile not yet created).
///
/// Shared by the notifications feed, unread badge, and realtime filters.
final currentProfileIdProvider = FutureProvider<String>((ref) async {
  final result = await ref
      .watch(profileRepositoryProvider)
      .fetchCurrentProfile();
  if (result.isSuccess) {
    return result.dataOrNull!.id;
  }

  throw Exception(result.failureOrNull!.message);
});
