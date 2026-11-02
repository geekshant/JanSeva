import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/config/app_config.dart';
import '../../../core/i18n/app_localizations.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/section_header.dart';
import '../../../data/models/geo_point.dart';
import '../report_issue_provider.dart';

/// Step 3 — Location capture.
///
/// Offers device GPS detection and a Mapbox-tiled map for manual adjustment.
/// The citizen can:
/// * tap "Use my current location" for GPS detection
/// * tap the map or drag the marker to adjust manually
///
/// If location permission is denied, the map remains fully usable as a
/// manual alternative — reporting is never blocked unnecessarily.
/// All coordinates are PostGIS-compatible (WGS 84 / EPSG:4326).
class LocationStep extends ConsumerStatefulWidget {
  const LocationStep({super.key});

  @override
  ConsumerState<LocationStep> createState() => _LocationStepState();
}

class _LocationStepState extends ConsumerState<LocationStep> {
  final MapController _mapController = MapController();
  final GlobalKey _mapKey = GlobalKey();
  Geocoding? _geocoding;
  bool _isLocating = false;
  bool _isDragging = false;
  LatLng? _dragLatLng;
  bool _mapExpanded = false;
  String _statusMessage = '';

  /// Bhopal city bounds for geofencing (lat/lng ranges).
  static const _defaultLocation = LatLng(23.2599, 77.4126);
  static const double _bhopalMinLat = 23.10;
  static const double _bhopalMaxLat = 23.40;
  static const double _bhopalMinLng = 77.25;
  static const double _bhopalMaxLng = 77.55;

  bool _isInBhopal(double lat, double lng) =>
      lat >= _bhopalMinLat &&
      lat <= _bhopalMaxLat &&
      lng >= _bhopalMinLng &&
      lng <= _bhopalMaxLng;

  @override
  void initState() {
    super.initState();
    try {
      _geocoding = Geocoding();
    } on Object {
      _geocoding = null;
    }
  }

  LatLng? _globalToLatLng(Offset globalPosition) {
    final renderBox = _mapKey.currentContext?.findRenderObject();
    if (renderBox is! RenderBox) return null;
    final local = renderBox.globalToLocal(globalPosition);
    return _mapController.camera.screenOffsetToLatLng(local);
  }

  String get _mapboxUrl {
    final token = AppConfig.mapboxAccessToken;
    return 'https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}{r}?access_token=$token';
  }

  // --- GPS detection -------------------------------------------------------

  Future<void> _useCurrentLocation() async {
    setState(() {
      _isLocating = true;
      _statusMessage = '';
    });

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() => _statusMessage = context.tr('report.location.servicesOff'));
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
          setState(() => _statusMessage =
              context.tr('report.location.permissionDenied'));
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      await _updateLocation(position.latitude, position.longitude);
    } on Exception catch (e) {
      setState(() => _statusMessage =
          context.tr('report.location.fetchFailed', args: {'error': e.toString()}));
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  // --- Location update + reverse geocode -----------------------------------

  Future<void> _updateLocation(double lat, double lng) async {
    if (!_isInBhopal(lat, lng)) {
      setState(() {
        _statusMessage = context.tr('report.location.outsideBhopal');
        _dragLatLng = null;
      });
      ref.read(reportIssueProvider.notifier).setLocation(null, null);
      return;
    }

    final notifier = ref.read(reportIssueProvider.notifier);

    // Reverse geocode (optional — not available on web).
    String? address;
    if (_geocoding != null) {
      try {
        final placemarks =
            await _geocoding!.placemarkFromCoordinates(lat, lng);
        if (placemarks.isNotEmpty) {
          final p = placemarks.first;
          final parts = [
            p.street,
            p.subLocality,
            p.locality,
            p.administrativeArea,
          ].where((s) => s != null && s.isNotEmpty);
          address = parts.join(', ');
        }
      } on Exception {
        // Geocoding failure is non-critical
      }
    }

    notifier.setLocation(GeoPoint(latitude: lat, longitude: lng), address);
    _mapController.move(LatLng(lat, lng), 15);
    if (mounted) setState(() {});
  }

  // --- Build ---------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(reportIssueProvider);
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    final LatLng? selectedLatLng = _dragLatLng ??
        (state.location != null
            ? LatLng(state.location!.latitude, state.location!.longitude)
            : null);

    final markers = <Marker>[
      if (selectedLatLng != null)
        Marker(
          point: selectedLatLng,
          width: 40,
          height: 40,
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onPanStart: (details) {
              setState(() {
                _isDragging = true;
                _dragLatLng = selectedLatLng;
              });
            },
            onPanUpdate: (details) {
              final latLng = _globalToLatLng(details.globalPosition);
              if (latLng != null && mounted) {
                setState(() => _dragLatLng = latLng);
              }
            },
            onPanEnd: (_) async {
              final latLng = _dragLatLng;
              setState(() => _isDragging = false);
              if (latLng != null) {
                await _updateLocation(latLng.latitude, latLng.longitude);
              }
            },
            child: Icon(
              Icons.location_on,
              color: _isDragging ? Colors.redAccent : Colors.red,
              size: 40,
            ),
          ),
        ),
    ];

    return SingleChildScrollView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            title: context.tr('report.location.title'),
            subtitle: context.tr('report.location.subtitle'),
          ),
          AppSpacing.hLG,

          // --- GPS button ---
          SizedBox(
            width: double.infinity,
            child: FilledButton.tonalIcon(
              onPressed: _isLocating ? null : _useCurrentLocation,
              icon: _isLocating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.my_location_rounded),
              label: Text(
                _isLocating
                    ? context.tr('report.location.detecting')
                    : context.tr('report.location.useCurrent'),
              ),
            ),
          ),

          // --- Status / permission message ---
          if (_statusMessage.isNotEmpty) ...[
            AppSpacing.hSM,
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: colors.surfaceContainer,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: colors.outline.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline_rounded,
                      size: 16, color: colors.onSurfaceVariant),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _statusMessage,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          AppSpacing.hLG,

          AppSpacing.hLG,

          // --- Detected / selected location card ---
          if (state.location != null) ...[
            _DetectedLocationCard(
              latitude: state.location!.latitude,
              longitude: state.location!.longitude,
              address: state.address,
              onAdjust: () => setState(() => _mapExpanded = true),
            ),
            AppSpacing.hMD,
          ],

          // --- Map (fixed height inside scroll view) ---
          SizedBox(
            height: _mapExpanded || state.location == null ? 260 : 180,
            child: ClipRRect(
              key: _mapKey,
              borderRadius: BorderRadius.circular(16),
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: selectedLatLng ?? _defaultLocation,
                  initialZoom: 13,
                  minZoom: 10,
                  maxZoom: 18,
                  onTap: (tapPosition, point) =>
                      _updateLocation(point.latitude, point.longitude),
                  onPositionChanged: (position, hasGesture) {
                    if (!hasGesture) return;
                    final center = position.center;
                    if (!_isInBhopal(center.latitude, center.longitude)) {
                      _mapController.move(_defaultLocation, 12);
                    }
                  },
                ),
                children: [
                  TileLayer(
                    urlTemplate: _mapboxUrl,
                    userAgentPackageName: 'com.janmitra',
                    maxZoom: 20,
                  ),
                  MarkerLayer(markers: markers),
                ],
              ),
            ),
          ),
          AppSpacing.hSM,

          // --- Hint to adjust ---
          Text(
            context.tr('report.location.tapMap'),
            style: theme.textTheme.bodySmall?.copyWith(
              color: colors.onSurfaceVariant,
            ),
          ),
          // Bottom padding so content is reachable above the bottom bar
          SizedBox(height: MediaQuery.viewPaddingOf(context).bottom + 8),
        ],
      ),
    );
  }
}

/// A card showing the detected/selected location with address and
/// coordinates, plus an "Adjust Location" action.
class _DetectedLocationCard extends StatelessWidget {
  const _DetectedLocationCard({
    required this.latitude,
    required this.longitude,
    required this.address,
    required this.onAdjust,
  });

  final double latitude;
  final double longitude;
  final String? address;
  final VoidCallback onAdjust;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.primaryContainer.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colors.primary.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.location_on_rounded, size: 20, color: colors.primary),
              const SizedBox(width: 8),
              Text(
                context.tr('report.location.yourLocation'),
                style: theme.textTheme.labelLarge?.copyWith(
                  color: colors.primary,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (address != null && address!.isNotEmpty)
            Text(
              address!,
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            )
          else
            Text(
              context.tr('report.location.selected'),
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          const SizedBox(height: 4),
          Text(
            '${latitude.toStringAsFixed(5)}, ${longitude.toStringAsFixed(5)}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: colors.onSurfaceVariant,
              fontFamily: 'monospace',
            ),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: onAdjust,
              icon: const Icon(Icons.map_rounded, size: 18),
              label: Text(context.tr('report.location.adjust')),
            ),
          ),
        ],
      ),
    );
  }
}
