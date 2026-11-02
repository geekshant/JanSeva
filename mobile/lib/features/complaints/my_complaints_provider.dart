import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/complaint.dart';
import '../../data/repositories/repository_providers.dart';
import '../auth/auth_provider.dart';

/// Fetches ALL of the current user's complaints (not just the 5 most recent).
final myComplaintsProvider =
    FutureProvider<List<Complaint>>((ref) async {
  final authRepo = ref.watch(authRepositoryProvider);
  final complaintRepo = ref.watch(complaintRepositoryProvider);

  final userId = authRepo.currentUserId;
  if (userId == null) {
    throw StateError('Not signed in.');
  }

  final profileResult = await ref.watch(profileRepositoryProvider).fetchCurrentProfile();
  if (profileResult.isFailure) {
    throw Exception(profileResult.failureOrNull!.message);
  }
  final profileId = profileResult.dataOrNull!.id;

  final result = await complaintRepo.fetchRecentComplaints(
    profileId: profileId,
    limit: 100,
  );

  return result.when(
    success: (complaints) => complaints,
    failure: (failure) => throw Exception(failure.message),
  );
});
