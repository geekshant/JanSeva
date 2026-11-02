import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/safety_models.dart';
import '../../data/repositories/repository_providers.dart';

/// Nearby safe places screen â€” shows police/hospitals/safe places on a list.
class SafetyNearbyScreen extends ConsumerStatefulWidget {
  const SafetyNearbyScreen({super.key});

  @override
  ConsumerState<SafetyNearbyScreen> createState() => _SafetyNearbyScreenState();
}

class _SafetyNearbyScreenState extends ConsumerState<SafetyNearbyScreen> {
  bool _loading = false;
  List<SafetyPlace> _places = [];
  String? _error;

  Future<void> _loadPlaces() async {
    final l = context.tr;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 10),
        ),
      );
      final result = await ref.read(safetyRepositoryProvider).findNearbyPlaces(
        latitude: position.latitude,
        longitude: position.longitude,
      );
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (result.isFailure) {
          _error = result.failureOrNull?.message ?? l('safety.nearbyNone');
        } else {
          _places = result.dataOrNull ?? [];
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = l('safety.locationError');
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _loadPlaces();
  }

  Color _placeColor(String type) {
    switch (type) {
      case 'POLICE': return Colors.blue;
      case 'HOSPITAL': return Colors.red;
      case 'SAFE_PLACE': return Colors.green;
      default: return Colors.grey;
    }
  }

  IconData _placeIcon(String type) {
    switch (type) {
      case 'POLICE': return Icons.local_police;
      case 'HOSPITAL': return Icons.local_hospital;
      case 'SAFE_PLACE': return Icons.shield;
      default: return Icons.location_on;
    }
  }

  String _placeTypeLabel(String type, String Function(String key, {Map<String, dynamic> args}) l) {
    switch (type) {
      case 'POLICE': return l('safety.nearbyPolice');
      case 'HOSPITAL': return l('safety.nearbyHospital');
      case 'SAFE_PLACE': return l('safety.nearbySafePlace');
      default: return type;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = context.tr;

    return Scaffold(
      appBar: AppBar(title: Text(l('safety.nearby'))),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadPlaces,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
            children: [
              Text(l('safety.nearbyDesc'), style: Theme.of(context).textTheme.bodyMedium),
              AppSpacing.hLG,
              if (_loading) ...[
                const Center(child: CircularProgressIndicator()),
              ] else if (_error != null) ...[
                Card(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!))),
              ] else if (_places.isEmpty) ...[
                Card(child: Padding(padding: const EdgeInsets.all(24), child: Text(l('safety.nearbyNone')))),
              ] else ...[
                ..._places.map((place) => Card(
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _placeColor(place.type).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(_placeIcon(place.type), color: _placeColor(place.type)),
                    ),
                    title: Text(place.name, style: Theme.of(context).textTheme.titleSmall),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_placeTypeLabel(place.type, l)),
                        if (place.address != null) Text(place.address!, style: Theme.of(context).textTheme.bodySmall),
                        Row(
                          children: [
                            if (place.distanceLabel.isNotEmpty)
                              Text(place.distanceLabel, style: TextStyle(color: _placeColor(place.type), fontWeight: FontWeight.w600)),
                            if (place.is24x7) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(4)),
                                child: Text(l('safety.nearbyOpen24x7'), style: const TextStyle(fontSize: 10, color: Colors.green, fontWeight: FontWeight.w500)),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                    trailing: place.phone != null
                        ? IconButton(icon: const Icon(Icons.phone, color: Colors.green), onPressed: () => _call(place.phone!))
                        : null,
                    isThreeLine: true,
                    onTap: () => _openDirections(place),
                  ),
                )),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _call(String phone) async {
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not open dialer for $phone')));
    }
  }

  void _openDirections(SafetyPlace place) async {
    final uri = Uri.parse('https://maps.google.com/?q=${place.latitude},${place.longitude}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not open maps for ${place.name}')));
    }
  }
}
