import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/utils/app_logger.dart';
import '../../data/models/verifiable_complaint.dart';
import '../../data/repositories/repository_providers.dart';
import '../map/nearby_provider.dart';

/// Fetches nearby resolved complaints awaiting community verification.
/// Reuses [currentLocationProvider] for the user's GPS position and
/// re-fetches when the radius changes.
final verifiableComplaintsProvider =
    FutureProvider<List<VerifiableComplaint>>((ref) async {
  final radius = ref.watch(nearbyRadiusProvider);
  final position = await ref.watch(currentLocationProvider.future);
  final repo = ref.watch(verificationRepositoryProvider);

  AppLogger.info('verification: fetching verifiable complaints within '
      '${radius.label} of ${position.latitude}, ${position.longitude}');

  final result = await repo.fetchVerifiableComplaints(
    latitude: position.latitude,
    longitude: position.longitude,
    radiusMeters: radius.meters,
  );

  return result.when(
    success: (complaints) {
      AppLogger.info('verification: found ${complaints.length} verifiable');
      return complaints;
    },
    failure: (failure) {
      AppLogger.error('verification: query failed: ${failure.message}',
          failure.exception);
      throw Exception(failure.message);
    },
  );
});
