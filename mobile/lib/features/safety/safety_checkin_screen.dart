import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/safety_models.dart';
import '../../data/repositories/repository_providers.dart';

/// Safety check-in screen â€” set a timer, confirm "I'm safe" before it expires.
class SafetyCheckInScreen extends ConsumerStatefulWidget {
  const SafetyCheckInScreen({super.key});

  @override
  ConsumerState<SafetyCheckInScreen> createState() => _SafetyCheckInScreenState();
}

class _SafetyCheckInScreenState extends ConsumerState<SafetyCheckInScreen> {
  SafetyCheckIn? _activeCheckIn;
  Timer? _timer;
  Duration _remaining = Duration.zero;
  bool _loading = false;

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_activeCheckIn == null) return;
      final now = DateTime.now();
      final expected = _activeCheckIn!.expectedAtTime;
      final diff = expected.difference(now);
      setState(() => _remaining = diff.isNegative ? Duration.zero : diff);
      if (diff.isNegative && _activeCheckIn != null) {
        _timer?.cancel();
        _onCheckInMissed();
      }
    });
  }

  Future<void> _startCheckIn(int minutes) async {
    final l = context.tr;
    setState(() => _loading = true);
    final result = await ref.read(safetyRepositoryProvider).createCheckIn(minutes);
    if (!mounted) return;
    setState(() => _loading = false);
    if (result.isFailure) {
      _showError(l('safety.checkInFailed'));
    } else {
      setState(() => _activeCheckIn = result.dataOrNull);
      _startTimer();
    }
  }

  Future<void> _completeCheckIn() async {
    final l = context.tr;
    if (_activeCheckIn == null) return;
    final result = await ref.read(safetyRepositoryProvider).completeCheckIn(_activeCheckIn!.id);
    if (!mounted) return;
    if (result.isFailure) {
      _showError(l('safety.checkInFailed'));
    } else {
      _timer?.cancel();
      setState(() => _activeCheckIn = null);
      _showSuccess(l('safety.checkInCompleted'));
    }
  }

  void _onCheckInMissed() {
    final l = context.tr;
    setState(() => _activeCheckIn = null);
    _showError(l('safety.checkInMissed'));
    _autoTriggerSos();
  }

  Future<void> _autoTriggerSos() async {
    final l = context.tr;
    double? lat, lng;
    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
      lat = position.latitude;
      lng = position.longitude;
    } catch (_) {}

    await ref.read(safetyRepositoryProvider).triggerSos(
      latitude: lat,
      longitude: lng,
      message: 'Auto-triggered from missed safety check-in',
    );
    if (!mounted) return;
    _showSuccess(l('safety.sosActivated'));
  }

  String _formatDuration(Duration d) {
    final h = d.inHours.toString().padLeft(2, '0');
    final m = (d.inMinutes % 60).toString().padLeft(2, '0');
    final s = (d.inSeconds % 60).toString().padLeft(2, '0');
    return '$h:$m:$s';
  }

  void _showSuccess(String msg) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  void _showError(String msg) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: Theme.of(context).colorScheme.error));

  @override
  Widget build(BuildContext context) {
    final l = context.tr;
    return Scaffold(
      appBar: AppBar(title: Text(l('safety.checkIn'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
          children: [
            Text(l('safety.checkInDesc'), style: Theme.of(context).textTheme.bodyMedium),
            AppSpacing.hLG,
            if (_activeCheckIn != null) ...[
              Card(
                color: Colors.orange.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    children: [
                      const Icon(Icons.timer, size: 48, color: Colors.orange),
                      AppSpacing.hMD,
                      Text(l('safety.checkInActive'),
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.orange)),
                      AppSpacing.hSM,
                      Text(l('safety.checkInTimeRemaining', args: {'time': _formatDuration(_remaining)}),
                          style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, fontFeatures: [FontFeature.tabularFigures()])),
                      AppSpacing.hLG,
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          onPressed: _completeCheckIn,
                          icon: const Icon(Icons.check_circle),
                          label: Text(l('safety.checkInSafe')),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ] else if (_loading) ...[
              const Center(child: CircularProgressIndicator()),
            ] else ...[
              Text(l('safety.checkInStart'), style: Theme.of(context).textTheme.titleMedium),
              AppSpacing.hMD,
              ...[
                (15, l('safety.checkIn15')),
                (30, l('safety.checkIn30')),
                (60, l('safety.checkIn60')),
                (120, l('safety.checkIn120')),
              ].map((option) => Card(
                child: ListTile(
                  leading: const Icon(Icons.timer_outlined),
                  title: Text(option.$2),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _startCheckIn(option.$1),
                ),
              )),
            ],
          ],
        ),
      ),
    );
  }
}
