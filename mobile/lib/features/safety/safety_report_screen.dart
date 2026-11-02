import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/repositories/repository_providers.dart';

/// Anonymous safety report screen â€” report a safety concern without identity.
class SafetyReportScreen extends ConsumerStatefulWidget {
  const SafetyReportScreen({super.key});

  @override
  ConsumerState<SafetyReportScreen> createState() => _SafetyReportScreenState();
}

class _SafetyReportScreenState extends ConsumerState<SafetyReportScreen> {
  final _messageCtrl = TextEditingController();
  bool _includeLocation = true;
  bool _submitting = false;

  Future<void> _submit() async {
    final l = context.tr;
    if (_messageCtrl.text.trim().isEmpty) return;

    setState(() => _submitting = true);

    double? lat, lng;
    if (_includeLocation) {
      try {
        final position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 10),
          ),
        );
        lat = position.latitude;
        lng = position.longitude;
      } catch (_) {}
    }

    final result = await ref.read(safetyRepositoryProvider).submitAnonymousReport(
      latitude: lat,
      longitude: lng,
      message: _messageCtrl.text.trim(),
    );

    if (!mounted) return;
    setState(() => _submitting = false);

    if (result.isFailure) {
      _showError(l('safety.reportFailed'));
    } else {
      _showSuccess(l('safety.reportSubmitted'));
      Navigator.pop(context);
    }
  }

  void _showSuccess(String msg) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  void _showError(String msg) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: Theme.of(context).colorScheme.error));

  @override
  void dispose() {
    _messageCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = context.tr;
    return Scaffold(
      appBar: AppBar(title: Text(l('safety.report'))),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
          children: [
            Text(l('safety.reportDesc'), style: Theme.of(context).textTheme.bodyMedium),
            AppSpacing.hLG,
            Text(l('safety.reportMessage'), style: Theme.of(context).textTheme.titleSmall),
            AppSpacing.hSM,
            TextField(
              controller: _messageCtrl,
              maxLines: 5,
              decoration: InputDecoration(
                hintText: l('safety.reportPlaceholder'),
                border: const OutlineInputBorder(),
              ),
            ),
            AppSpacing.hMD,
            SwitchListTile(
              title: Text(l('safety.reportIncludeLocation')),
              value: _includeLocation,
              onChanged: (v) => setState(() => _includeLocation = v),
            ),
            AppSpacing.hLG,
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send),
                label: Text(l('safety.reportSubmit')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
