import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/utils/app_logger.dart';
import '../../data/models/nearby_complaint.dart';
import '../../data/repositories/repository_providers.dart';
import '../../data/services/supabase_service.dart';

/// Radius options for the nearby issues map (in meters).
enum NearbyRadius {
  m500(500, 'map.radius.500m'),
  km1(1000, 'map.radius.1km'),
  km2(2000, 'map.radius.2km'),
  km5(5000, 'map.radius.5km'),
  km10(10000, 'map.radius.10km');

  const NearbyRadius(this.meters, this._key);
  final int meters;
  final String _key;
  String get label => AppLocalizations.translate(_key);
}

/// The currently selected radius.
final nearbyRadiusProvider =
    NotifierProvider<NearbyRadiusNotifier, NearbyRadius>(() {
  return NearbyRadiusNotifier();
});

class NearbyRadiusNotifier extends Notifier<NearbyRadius> {
  @override
  NearbyRadius build() => NearbyRadius.km2;

  void set(NearbyRadius radius) => state = radius;
}

/// Selected category IDs for filtering (empty = all categories).
final selectedCategoryIdsProvider =
    NotifierProvider<SelectedCategoryIdsNotifier, Set<String>>(() {
  return SelectedCategoryIdsNotifier();
});

class SelectedCategoryIdsNotifier extends Notifier<Set<String>> {
  @override
  Set<String> build() => {};

  void toggle(String categoryId) {
    final current = Set<String>.from(state);
    if (current.contains(categoryId)) {
      current.remove(categoryId);
    } else {
      current.add(categoryId);
    }
    state = current;
  }

  void clear() => state = {};
}

/// Selected statuses for filtering (empty = all statuses).
final selectedStatusesProvider =
    NotifierProvider<SelectedStatusesNotifier, Set<String>>(() {
  return SelectedStatusesNotifier();
});

class SelectedStatusesNotifier extends Notifier<Set<String>> {
  @override
  Set<String> build() => {};

  void toggle(String status) {
    final current = Set<String>.from(state);
    if (current.contains(status)) {
      current.remove(status);
    } else {
      current.add(status);
    }
    state = current;
  }

  void clear() => state = {};
}

/// Whether any filter is active.
final hasActiveFiltersProvider = Provider<bool>((ref) {
  return ref.watch(selectedCategoryIdsProvider).isNotEmpty ||
      ref.watch(selectedStatusesProvider).isNotEmpty;
});

/// The user's current GPS position.
final currentLocationProvider = FutureProvider<Position>((ref) async {
  final serviceEnabled = await Geolocator.isLocationServiceEnabled();
  if (!serviceEnabled) {
    throw Exception('Location services are disabled. '
        'Please enable GPS in your device settings.');
  }

  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.denied) {
    throw Exception('Location permission denied. '
        'Please grant location access to see nearby issues.');
  }
  if (permission == LocationPermission.deniedForever) {
    throw Exception('Location permission permanently denied. '
        'Please enable it in app settings.');
  }

  return Geolocator.getCurrentPosition(
    locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
  );
});

/// A trigger that increments whenever the user manually refreshes or when
/// realtime invalidation fires. The complaints provider watches this.
final _refreshTriggerProvider = NotifierProvider<_RefreshNotifier, int>(() {
  return _RefreshNotifier();
});

class _RefreshNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void trigger() => state++;
}

/// Fetches nearby complaints within the selected radius, filtered by
/// category and status. Re-fetches automatically when any filter changes.
final nearbyComplaintsProvider =
    FutureProvider<List<NearbyComplaint>>((ref) async {
  // Watch all dependencies so the provider re-fetches on change
  final radius = ref.watch(nearbyRadiusProvider);
  final categoryIds = ref.watch(selectedCategoryIdsProvider);
  final statuses = ref.watch(selectedStatusesProvider);
  ref.watch(_refreshTriggerProvider);
  final position = await ref.watch(currentLocationProvider.future);
  final complaintRepo = ref.watch(complaintRepositoryProvider);

  AppLogger.info('nearby: fetching complaints within ${radius.label} '
      'of ${position.latitude}, ${position.longitude} '
      'with ${categoryIds.length} categories, ${statuses.length} statuses');

  final result = await complaintRepo.fetchNearbyComplaints(
    latitude: position.latitude,
    longitude: position.longitude,
    radiusMeters: radius.meters,
    categoryIds: categoryIds.isEmpty ? null : categoryIds.toList(),
    statuses: statuses.isEmpty ? null : statuses.toList(),
  );

  return result.when(
    success: (complaints) {
      AppLogger.info('nearby: found ${complaints.length} complaints');
      return complaints;
    },
    failure: (failure) {
      AppLogger.error('nearby: query failed: ${failure.message}',
          failure.exception);
      throw Exception(failure.message);
    },
  );
});

/// Realtime subscription that triggers refresh when complaints change.
final nearbyRealtimeProvider = StreamProvider<void>((ref) {
  final controller = StreamController<void>.broadcast();

  final channel = SupabaseService.client
      .channel('nearby-complaints-realtime')
      .onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'complaints',
        callback: (_) {
          Future.delayed(const Duration(milliseconds: 500), () {
            if (controller.hasListener) {
              ref.read(_refreshTriggerProvider.notifier).trigger();
            }
          });
        },
      )
      .onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'complaint_images',
        callback: (_) {
          Future.delayed(const Duration(milliseconds: 500), () {
            if (controller.hasListener) {
              ref.read(_refreshTriggerProvider.notifier).trigger();
            }
          });
        },
      )
      .subscribe();

  ref.onDispose(() {
    SupabaseService.client.removeChannel(channel);
    controller.close();
  });

  return controller.stream;
});

/// Manual refresh function.
void refreshNearby(WidgetRef ref) {
  ref.invalidate(currentLocationProvider);
  ref.read(_refreshTriggerProvider.notifier).trigger();
}
