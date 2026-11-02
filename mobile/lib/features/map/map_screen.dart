import 'dart:math' as math;

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:latlong2/latlong.dart';

import '../../core/config/app_config.dart';
import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/complaint_severity.dart';
import '../../data/models/complaint_status.dart';
import '../../data/models/nearby_complaint.dart';
import '../../core/widgets/category_icon.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import 'nearby_provider.dart';

/// Interactive Nearby Civic Issues map with complaint markers, clustering,
/// category/status filters, and realtime updates.
class MapScreen extends ConsumerStatefulWidget {
  const MapScreen({super.key});

  @override
  ConsumerState<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends ConsumerState<MapScreen>
    with TickerProviderStateMixin {
  final MapController _mapController = MapController();
  NearbyComplaint? _selected;
  double _currentZoom = 13.0;
  bool _hasMovedFar = false;
  LatLng? _initialCenter;

  String get _mapboxUrl {
    final token = AppConfig.mapboxAccessToken;
    return 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}{r}?access_token=$token';
  }

  @override
  void initState() {
    super.initState();
    // Subscribe to realtime
    ref.listenManual(nearbyRealtimeProvider, (_, _) {});
  }

  void _onMarkerTapped(NearbyComplaint complaint) {
    setState(() {
      _selected = complaint;
      _hasMovedFar = false;
    });
    final loc = LatLng(
      complaint.location.latitude,
      complaint.location.longitude,
    );
    _mapController.move(loc, _currentZoom.clamp(14, 18));
  }

  void _closeDetail() => setState(() => _selected = null);

  Color _markerColor(ComplaintStatus status) => switch (status) {
    ComplaintStatus.submitted => AppColors.submitted,
    ComplaintStatus.autoValidating => const Color(0xFF6366F1),
    ComplaintStatus.needsReview => const Color(0xFFF97316),
    ComplaintStatus.aiChecking => const Color(0xFF6366F1),
    ComplaintStatus.aiVerified => AppColors.verified,
    ComplaintStatus.aiReviewRequired => const Color(0xFFF97316),
    ComplaintStatus.aiFailed => AppColors.rejected,
    ComplaintStatus.evidenceRequired => AppColors.warning,
    ComplaintStatus.verified => AppColors.verified,
    ComplaintStatus.assigned => const Color(0xFF1565C0),
    ComplaintStatus.acknowledged => const Color(0xFF0EA5E9),
    ComplaintStatus.inProgress => AppColors.inProgress,
    ComplaintStatus.resolutionSubmitted => const Color(0xFF14B8A6),
    ComplaintStatus.resolutionUnderReview => const Color(0xFFF97316),
    ComplaintStatus.communityVerification => const Color(0xFFA855F7),
    ComplaintStatus.resolved => AppColors.resolved,
    ComplaintStatus.reopened => const Color(0xFFEF4444),
    ComplaintStatus.escalated => const Color(0xFFDC2626),
    ComplaintStatus.rejected => AppColors.rejected,
    ComplaintStatus.closed => const Color(0xFF6B7280),
  };

  Color _severityColor(ComplaintSeverity sev) => switch (sev) {
    ComplaintSeverity.low => Colors.green,
    ComplaintSeverity.medium => Colors.orange,
    ComplaintSeverity.high => Colors.deepOrange,
    ComplaintSeverity.critical => Colors.red,
  };

  double _zoomForRadius(NearbyRadius radius) {
    return switch (radius) {
      NearbyRadius.m500 => 16,
      NearbyRadius.km1 => 15,
      NearbyRadius.km2 => 14,
      NearbyRadius.km5 => 12,
      NearbyRadius.km10 => 11,
    };
  }

  /// Simple grid-based clustering: groups markers that are within
  /// ~30 pixels at the current zoom level into cluster markers.
  List<_MarkerOrCluster> _clusterMarkers(List<NearbyComplaint> complaints) {
    if (complaints.isEmpty) return [];

    final zoom = _currentZoom;
    // At high zoom (>=16), show all individual markers
    if (zoom >= 16) {
      return complaints.map((c) => _MarkerOrCluster.single(c)).toList();
    }

    // Cluster threshold: at zoom Z, ~40px in world coordinates
    final threshold = 50 / math.pow(2, zoom);

    final clusters = <_MarkerOrCluster>[];
    final used = <bool>[];
    for (var i = 0; i < complaints.length; i++) {
      used.add(false);
    }

    for (var i = 0; i < complaints.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      final group = <NearbyComplaint>[complaints[i]];
      for (var j = i + 1; j < complaints.length; j++) {
        if (used[j]) continue;
        final a = complaints[i].location;
        final b = complaints[j].location;
        final dLat = (a.latitude - b.latitude).abs();
        final dLng = (a.longitude - b.longitude).abs();
        if (dLat < threshold && dLng < threshold) {
          used[j] = true;
          group.add(complaints[j]);
        }
      }
      if (group.length == 1) {
        clusters.add(_MarkerOrCluster.single(group.first));
      } else {
        clusters.add(_MarkerOrCluster.group(group));
      }
    }

    return clusters;
  }

  @override
  Widget build(BuildContext context) {
    final l = context.tr;
    final radius = ref.watch(nearbyRadiusProvider);
    final hasFilters = ref.watch(hasActiveFiltersProvider);
    final locationAsync = ref.watch(currentLocationProvider);
    final complaintsAsync = ref.watch(nearbyComplaintsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l('map.title')),
        actions: [
          // Radius selector
          PopupMenuButton<NearbyRadius>(
            icon: const Icon(Icons.explore_outlined),
            tooltip: l('map.searchRadius'),
            onSelected: (value) {
              ref.read(nearbyRadiusProvider.notifier).set(value);
              _closeDetail();
              _hasMovedFar = false;
              if (_initialCenter != null) {
                _mapController.move(_initialCenter!, _zoomForRadius(value));
              }
            },
            itemBuilder: (context) => NearbyRadius.values.map((r) {
              return PopupMenuItem(
                value: r,
                child: Row(
                  children: [
                    if (r == radius)
                      const Icon(Icons.check, size: 18)
                    else
                      const SizedBox(width: 18),
                    const SizedBox(width: 8),
                    Text(r.label),
                  ],
                ),
              );
            }).toList(),
          ),
          // Filter button
          IconButton(
            icon: Badge(
              isLabelVisible: hasFilters,
              label: const Text('F'),
              child: const Icon(Icons.filter_list_rounded),
            ),
            tooltip: l('map.filter'),
            onPressed: () => _showFilterDialog(context, l),
          ),
          // Refresh
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: l('common.refresh'),
            onPressed: () => refreshNearby(ref),
          ),
        ],
      ),
      body: SafeArea(
        child: locationAsync.when(
          data: (position) {
            _initialCenter ??= LatLng(position.latitude, position.longitude);
            return _buildMap(context, l, complaintsAsync, position, radius);
          },
          loading: () => LoadingView(message: l('map.gettingLocation')),
          error: (error, _) => ErrorView(
            message: error.toString(),
            icon: Icons.location_off_rounded,
            title: l('map.locationUnavailable'),
            onRetry: () => ref.invalidate(currentLocationProvider),
          ),
        ),
      ),
    );
  }

  Widget _buildMap(
    BuildContext context,
    String Function(String key, {Map<String, dynamic> args}) l,
    AsyncValue<List<NearbyComplaint>> complaintsAsync,
    Position position,
    NearbyRadius radius,
  ) {
    final userLatLng = LatLng(position.latitude, position.longitude);
    final complaints = complaintsAsync.value ?? [];

    // Compute clusters
    final clusters = _clusterMarkers(complaints);

    return Stack(
      children: [
        // ── Map base ──────────────────────────────────────────
        ClipRRect(
          borderRadius: _selected != null
              ? const BorderRadius.vertical(top: Radius.circular(20))
              : BorderRadius.zero,
          child: FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _initialCenter ?? userLatLng,
              initialZoom: _zoomForRadius(radius),
              minZoom: 3,
              maxZoom: 20,
              onPositionChanged: (camera, hasGesture) {
                if (!mounted) return;
                final newZoom = camera.zoom;
                if ((newZoom - _currentZoom).abs() > 0.5) {
                  setState(() => _currentZoom = newZoom);
                }
                // Check if user moved far from initial center
                if (_initialCenter != null) {
                  final dist = const Distance().distance(
                    _initialCenter!,
                    camera.center,
                  );
                  if (dist > radius.meters * 1.5 && !_hasMovedFar) {
                    setState(() => _hasMovedFar = true);
                  }
                }
              },
              onTap: (_, _) => _closeDetail(),
            ),
            children: [
              TileLayer(
                urlTemplate: _mapboxUrl,
                userAgentPackageName: 'com.janmitra',
                maxZoom: 20,
              ),

              // ── User location marker ──────────────────────
              MarkerLayer(
                markers: [
                  Marker(
                    point: userLatLng,
                    width: 24,
                    height: 24,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Container(
                          width: 14,
                          height: 14,
                          decoration: BoxDecoration(
                            color: Colors.blue,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),

              // ── Complaint markers / clusters ───────────────
              complaintsAsync.when(
                data: (_) => MarkerLayer(
                  markers: clusters.map((mc) {
                    if (mc.isCluster) {
                      return _buildClusterMarker(mc);
                    }
                    final c = mc.complaints.first;
                    final isSelected = _selected?.id == c.id;
                    return Marker(
                      point: LatLng(c.location.latitude, c.location.longitude),
                      width: 44,
                      height: 44,
                      child: GestureDetector(
                        onTap: () => _onMarkerTapped(c),
                        child: _MarkerIcon(
                          color: _markerColor(c.status),
                          icon: CategoryIconHelper.iconFor(c.categoryIcon),
                          isSelected: isSelected,
                          severity: c.severity,
                        ),
                      ),
                    );
                  }).toList(),
                ),
                loading: () => const MarkerLayer(markers: []),
                error: (_, _) => const MarkerLayer(markers: []),
              ),
            ],
          ),
        ),

        // ── Count badge ────────────────────────────────────────
        Positioned(
          top: 8,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surfaceContainer,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 4,
                  ),
                ],
              ),
              child: complaintsAsync.when(
                data: (list) => Text(
                  l(
                    'map.issuesWithin',
                    args: {'count': list.length, 'radius': radius.label},
                  ),
                  style: Theme.of(context).textTheme.labelMedium
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                loading: () => const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                error: (_, _) => Text(
                  l('map.failedLoad'),
                  style: Theme.of(context).textTheme.labelMedium
                      ?.copyWith(color: Theme.of(context).colorScheme.error),
                ),
              ),
            ),
          ),
        ),

        // ── Floating controls (right side) ─────────────────────
        Positioned(
          right: 12,
          bottom: _selected == null ? 100 : 380,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _FloatingButton(
                icon: Icons.add,
                onPressed: () => _mapController.move(
                  _mapController.camera.center,
                  (_currentZoom + 1).clamp(3, 20),
                ),
              ),
              const SizedBox(height: 8),
              _FloatingButton(
                icon: Icons.remove,
                onPressed: () => _mapController.move(
                  _mapController.camera.center,
                  (_currentZoom - 1).clamp(3, 20),
                ),
              ),
              const SizedBox(height: 8),
              _FloatingButton(
                icon: Icons.my_location_rounded,
                color: Theme.of(context).colorScheme.primaryContainer,
                onPressed: () {
                  _mapController.move(userLatLng, _zoomForRadius(radius));
                  setState(() => _hasMovedFar = false);
                },
              ),
            ],
          ),
        ),

        // ── Loading overlay ────────────────────────────────────
        if (complaintsAsync.isLoading && !complaintsAsync.hasValue)
          Positioned(
            top: 50,
            left: 0,
            right: 0,
            child: Center(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        l('map.loading'),
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

        // ── Error overlay ─────────────────────────────────────
        if (complaintsAsync.hasError)
          Positioned(
            top: 50,
            left: 16,
            right: 16,
            child: Card(
              color: Theme.of(context).colorScheme.errorContainer,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    Icon(
                      Icons.wifi_off_rounded,
                      color: Theme.of(context).colorScheme.error,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        l('map.couldLoad'),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onErrorContainer,
                        ),
                      ),
                    ),
                    TextButton(
                      onPressed: () => refreshNearby(ref),
                      child: Text(l('common.retry')),
                    ),
                  ],
                ),
              ),
            ),
          ),

        // ── Empty state ────────────────────────────────────────
        if (complaintsAsync.hasValue && complaints.isEmpty)
          Positioned(
            bottom: _selected == null ? 16 : 380,
            left: 16,
            right: 16,
            child: Center(
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.check_circle_outline_rounded,
                        size: 48,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l('map.noIssuesTitle'),
                        style: Theme.of(context).textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l('map.noIssuesMsg'),
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          OutlinedButton.icon(
                            onPressed: () => refreshNearby(ref),
                            icon: const Icon(Icons.refresh, size: 18),
                            label: Text(l('common.refresh')),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton.icon(
                            onPressed: () => _showRadiusDialog(context, l),
                            icon: const Icon(Icons.expand, size: 18),
                            label: Text(l('map.changeRadius')),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

        // ── Search this area button ────────────────────────────
        if (_hasMovedFar && _selected == null)
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: Center(
              child: FilledButton.icon(
                onPressed: () {
                  final center = _mapController.camera.center;
                  _initialCenter = center;
                  setState(() => _hasMovedFar = false);
                  refreshNearby(ref);
                },
                icon: const Icon(Icons.search_rounded),
                label: Text(l('map.searchArea')),
              ),
            ),
          ),

        // ── Complaint detail bottom sheet ─────────────────────
        if (_selected != null)
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: _ComplaintDetailSheet(
              complaint: _selected!,
              onClose: _closeDetail,
              markerColor: _markerColor(_selected!.status),
              severityColor: _severityColor(_selected!.severity),
            ),
          ),
      ],
    );
  }

  Marker _buildClusterMarker(_MarkerOrCluster mc) {
    final avgLat =
        mc.complaints.map((c) => c.location.latitude).reduce((a, b) => a + b) /
        mc.complaints.length;
    final avgLng =
        mc.complaints.map((c) => c.location.longitude).reduce((a, b) => a + b) /
        mc.complaints.length;

    final count = mc.complaints.length;
    final size = count > 20
        ? 56.0
        : count > 10
        ? 48.0
        : 40.0;

    return Marker(
      point: LatLng(avgLat, avgLng),
      width: size,
      height: size,
      child: GestureDetector(
        onTap: () {
          _mapController.move(
            LatLng(avgLat, avgLng),
            (_currentZoom + 2).clamp(3, 20),
          );
        },
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary
                .withValues(alpha: 0.85),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.3),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Center(
            child: Text(
              '$count',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _showFilterDialog(
    BuildContext context,
    String Function(String key, {Map<String, dynamic> args}) l,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => _FilterDialog(ref: ref, l: l),
    );
  }

  void _showRadiusDialog(
    BuildContext context,
    String Function(String key, {Map<String, dynamic> args}) l,
  ) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l('map.searchRadius')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: NearbyRadius.values.map((r) {
            return ListTile(
              leading: Icon(
                r == ref.read(nearbyRadiusProvider)
                    ? Icons.radio_button_checked
                    : Icons.radio_button_unchecked,
              ),
              title: Text(r.label),
              onTap: () {
                ref.read(nearbyRadiusProvider.notifier).set(r);
                Navigator.pop(ctx);
              },
            );
          }).toList(),
        ),
      ),
    );
  }
}

// =============================================================================
// Marker / cluster data class
// =============================================================================
class _MarkerOrCluster {
  final List<NearbyComplaint> complaints;
  final bool isCluster;

  const _MarkerOrCluster._(this.complaints, this.isCluster);

  factory _MarkerOrCluster.single(NearbyComplaint c) =>
      _MarkerOrCluster._([c], false);
  factory _MarkerOrCluster.group(List<NearbyComplaint> group) =>
      _MarkerOrCluster._(group, true);
}

// =============================================================================
// Marker icon widget
// =============================================================================
class _MarkerIcon extends StatelessWidget {
  const _MarkerIcon({
    required this.color,
    required this.icon,
    required this.isSelected,
    required this.severity,
  });

  final Color color;
  final IconData icon;
  final bool isSelected;
  final ComplaintSeverity severity;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        border: Border.all(
          color: isSelected
              ? Colors.white
              : Colors.white.withValues(alpha: 0.7),
          width: isSelected ? 3 : 2,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Center(child: Icon(icon, color: Colors.white, size: 20)),
          // Severity indicator dot
          Positioned(
            right: -2,
            top: -2,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: switch (severity) {
                  ComplaintSeverity.critical => Colors.red,
                  ComplaintSeverity.high => Colors.deepOrange,
                  ComplaintSeverity.medium => Colors.orange,
                  ComplaintSeverity.low => Colors.green,
                },
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// =============================================================================
// Floating button
// =============================================================================
class _FloatingButton extends StatelessWidget {
  const _FloatingButton({
    required this.icon,
    required this.onPressed,
    this.color,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color ?? Theme.of(context).colorScheme.surfaceContainer,
      borderRadius: BorderRadius.circular(10),
      elevation: 2,
      child: InkWell(
        borderRadius: BorderRadius.circular(10),
        onTap: onPressed,
        child: SizedBox(width: 40, height: 40, child: Icon(icon, size: 20)),
      ),
    );
  }
}

// =============================================================================
// Complaint detail bottom sheet
// =============================================================================
class _ComplaintDetailSheet extends StatelessWidget {
  const _ComplaintDetailSheet({
    required this.complaint,
    required this.onClose,
    required this.markerColor,
    required this.severityColor,
  });

  final NearbyComplaint complaint;
  final VoidCallback onClose;
  final Color markerColor;
  final Color severityColor;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final l = context.tr;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * 0.45,
      ),
      decoration: BoxDecoration(
        color: colors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 8, bottom: 4),
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: colors.outline.withValues(alpha: 0.4),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 8, 0),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: markerColor.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        CategoryIconHelper.iconFor(complaint.categoryIcon),
                        color: markerColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        complaint.categoryName ?? l('map.unknownCategory'),
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded),
                      onPressed: onClose,
                    ),
                  ],
                ),
              ),
              // Body
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Complaint number
                    Text(
                      complaint.complaintNumber,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colors.onSurfaceVariant,
                        fontFamily: 'monospace',
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Title
                    Text(
                      complaint.title,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 8),
                    // Status + severity badges
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        _Badge(
                          label: complaint.status.displayLabel,
                          color: markerColor,
                        ),
                        _Badge(
                          label: complaint.severity.name.toUpperCase(),
                          color: severityColor,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Distance + time
                    Row(
                      children: [
                        if (complaint.distanceMeters != null) ...[
                          Icon(
                            Icons.straighten_rounded,
                            size: 14,
                            color: colors.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            complaint.distanceLabel,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(width: 12),
                        ],
                        Icon(
                          Icons.access_time_rounded,
                          size: 14,
                          color: colors.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            l(
                              'map.reportedAgo',
                              args: {
                                'time': complaint.timeAgo.replaceAll(
                                  ' ago',
                                  '',
                                ),
                              },
                            ),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    // Description
                    if (complaint.description != null &&
                        complaint.description!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        complaint.description!,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: colors.onSurfaceVariant,
                        ),
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                    // Evidence image
                    if (complaint.imageUrl != null &&
                        complaint.imageUrl!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: CachedNetworkImage(
                          imageUrl: complaint.imageUrl!,
                          height: 120,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          placeholder: (_, _) => Container(
                            height: 120,
                            color: colors.surfaceContainer,
                            child: const Center(
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          ),
                          errorWidget: (_, _, _) => const SizedBox.shrink(),
                        ),
                      ),
                    ],
                    // Department
                    if (complaint.departmentName != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(
                            Icons.business_outlined,
                            size: 14,
                            color: colors.onSurfaceVariant,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            complaint.departmentName!,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: colors.onSurfaceVariant,
                            ),
                          ),
                        ],
                      ),
                    ],
                    // SLA status
                    if (complaint.slaStatus != null &&
                        complaint.slaStatus != 'none') ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Icon(
                            Icons.timer_outlined,
                            size: 14,
                            color: _slaColor(complaint.slaStatus!),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _slaLabel(complaint.slaStatus!, l),
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: _slaColor(complaint.slaStatus!),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 16),
                    // View Complaint button
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: () {
                          context.push(
                            '${AppRoutes.complaintDetail}/${complaint.id}',
                          );
                        },
                        icon: const Icon(Icons.visibility_outlined),
                        label: Text(l('map.viewDetails')),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _slaColor(String status) => switch (status) {
    'on_track' => Colors.green,
    'due_soon' => Colors.orange,
    'at_risk' => Colors.deepOrange,
    'breached' => Colors.red,
    'resolved' => Colors.grey,
    _ => Colors.grey,
  };

  String _slaLabel(
    String status,
    String Function(String key, {Map<String, dynamic> args}) l,
  ) => switch (status) {
    'on_track' => l('map.slaOnTrack'),
    'due_soon' => l('map.slaDueSoon'),
    'at_risk' => l('map.slaAtRisk'),
    'breached' => l('map.slaBreached'),
    'resolved' => l('map.slaOnTrack'),
    _ => l('map.slaNone'),
  };
}

// =============================================================================
// Status badge widget
// =============================================================================
class _Badge extends StatelessWidget {
  const _Badge({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelSmall
            ?.copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

// =============================================================================
// Filter dialog (category + status)
// =============================================================================
class _FilterDialog extends ConsumerStatefulWidget {
  const _FilterDialog({required this.ref, required this.l});

  final WidgetRef ref;
  final String Function(String key, {Map<String, dynamic> args}) l;

  @override
  ConsumerState<_FilterDialog> createState() => _FilterDialogState();
}

class _FilterDialogState extends ConsumerState<_FilterDialog>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Category list with IDs and display names
  static const _categories = [
    ('2cb0a81d-79d1-473d-857c-08a852d3e428', 'Road Damage', Icons.add_road),
    ('f8d0041b-5711-4f7e-bc19-82302480299e', 'Pothole', Icons.report_problem),
    (
      '79cd8dc4-0b8d-47f5-be2e-3bf9833fb411',
      'Garbage / Sanitation',
      Icons.delete_outline,
    ),
    (
      '044d6862-7b08-4e17-9015-502bbb27b306',
      'Damaged Infrastructure',
      Icons.domain_disabled,
    ),
    ('fdb41e40-5a52-4d1c-84ff-ba52bc3df3f5', 'Public Safety', Icons.security),
    (
      '8389cbf5-d4c3-44a2-af14-c71b7c5c6d91',
      'Water / Drainage',
      Icons.water_drop,
    ),
    (
      'ca4dc215-95f2-4569-90a2-3c5bf96d9321',
      'Streetlight',
      Icons.lightbulb_outline,
    ),
    ('c78be637-b804-4c9a-a936-1c82367d9ffe', 'Stray Animals', Icons.pets),
    ('89bc0510-47b2-427f-a2fc-10e0abd620fa', 'Other', Icons.category),
  ];

  static const _statuses = [
    ('SUBMITTED', 'Submitted'),
    ('VERIFIED', 'Verified'),
    ('ASSIGNED', 'Assigned'),
    ('IN_PROGRESS', 'In Progress'),
    ('RESOLVED', 'Resolved'),
    ('CLOSED', 'Closed'),
    ('EVIDENCE_REQUIRED', 'More Evidence Needed'),
    ('AI_REVIEW_REQUIRED', 'AI Review Required'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = widget.l;
    final selectedCats = ref.watch(selectedCategoryIdsProvider);
    final selectedStatuses = ref.watch(selectedStatusesProvider);

    return AlertDialog(
      title: Text(l('map.filter')),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TabBar(
              controller: _tabController,
              tabs: [
                Tab(text: l('map.filterCategories')),
                Tab(text: l('map.filterStatuses')),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 260,
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Category filter list
                  ListView(
                    shrinkWrap: true,
                    children: [
                      CheckboxListTile(
                        title: Text(l('map.selectAll')),
                        value: selectedCats.isEmpty,
                        onChanged: (_) => ref
                            .read(selectedCategoryIdsProvider.notifier)
                            .clear(),
                        dense: true,
                      ),
                      const Divider(height: 1),
                      ..._categories.map((cat) {
                        final isSelected = selectedCats.contains(cat.$1);
                        return CheckboxListTile(
                          title: Row(
                            children: [
                              Icon(cat.$3, size: 20),
                              const SizedBox(width: 8),
                              Text(cat.$2),
                            ],
                          ),
                          value: isSelected,
                          onChanged: (_) => ref
                              .read(selectedCategoryIdsProvider.notifier)
                              .toggle(cat.$1),
                          dense: true,
                        );
                      }),
                    ],
                  ),
                  // Status filter list
                  ListView(
                    shrinkWrap: true,
                    children: [
                      CheckboxListTile(
                        title: Text(l('map.selectAll')),
                        value: selectedStatuses.isEmpty,
                        onChanged: (_) =>
                            ref.read(selectedStatusesProvider.notifier).clear(),
                        dense: true,
                      ),
                      const Divider(height: 1),
                      ..._statuses.map((status) {
                        final isSelected = selectedStatuses.contains(status.$1);
                        return CheckboxListTile(
                          title: Text(status.$2),
                          value: isSelected,
                          onChanged: (_) => ref
                              .read(selectedStatusesProvider.notifier)
                              .toggle(status.$1),
                          dense: true,
                        );
                      }),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () {
            ref.read(selectedCategoryIdsProvider.notifier).clear();
            ref.read(selectedStatusesProvider.notifier).clear();
          },
          child: Text(l('map.clearFilters')),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context),
          child: Text(l('map.applyFilter')),
        ),
      ],
    );
  }
}
