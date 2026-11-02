import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/routing/app_routes.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/repositories/repository_providers.dart';
import '../../data/services/supabase_service.dart';
import 'safety_eligibility_provider.dart';

/// Main Women Safety screen with the one-touch SOS button, check-in,
/// nearby safe places, and anonymous report entries.
///
/// Features:
/// - SOS activation with 3-second hold countdown
/// - 15-minute live location tracking with visible countdown
/// - Realtime status updates (acknowledged, assigned, response, resolved)
/// - Cancel SOS with confirmation
/// - Tracking expiration awareness (tracking ends, emergency stays open)
class SafetyScreen extends ConsumerStatefulWidget {
  const SafetyScreen({super.key});

  @override
  ConsumerState<SafetyScreen> createState() => _SafetyScreenState();
}

class _SafetyScreenState extends ConsumerState<SafetyScreen>
    with TickerProviderStateMixin {
  bool _sosCountdown = false;
  int _countdown = 3;
  Timer? _countdownTimer;
  Timer? _locationTimer;
  Timer? _statusTimer;
  Timer? _countdownDisplayTimer;

  bool _sosActive = false;
  String? _activeIncidentId;
  String _sosStatusMessage = '';
  String _incidentStatus = 'ACTIVE';
  int _trackingSecondsRemaining = 900; // 15 minutes
  bool _trackingEnded = false;

  late AnimationController _pulseController;
  RealtimeChannel? _realtimeChannel;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _locationTimer?.cancel();
    _statusTimer?.cancel();
    _countdownDisplayTimer?.cancel();
    _pulseController.dispose();
    _realtimeChannel?.unsubscribe();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // SOS trigger flow
  // ---------------------------------------------------------------------------

  void _startSosCountdown() {
    setState(() {
      _sosCountdown = true;
      _countdown = 3;
    });
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() => _countdown--);
      if (_countdown <= 0) {
        timer.cancel();
        _triggerSos();
      }
    });
  }

  void _cancelCountdown() {
    _countdownTimer?.cancel();
    setState(() => _sosCountdown = false);
  }

  Future<void> _triggerSos() async {
    final l = context.tr;
    setState(() {
      _sosCountdown = false;
      _sosStatusMessage = l('safety.getLocation');
    });

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

    final result = await ref
        .read(safetyRepositoryProvider)
        .triggerSos(latitude: lat, longitude: lng);

    if (!mounted) return;

    if (result.isFailure) {
      setState(() => _sosStatusMessage = l('safety.sosFailed'));
      _showError(l('safety.sosFailed'));
      return;
    }

    final incident = result.dataOrNull!;

    final contactsResult = await ref
        .read(safetyRepositoryProvider)
        .fetchContacts();
    final contactCount = contactsResult.dataOrNull?.length ?? 0;

    if (!mounted) return;
    setState(() {
      _sosActive = true;
      _activeIncidentId = incident.id;
      _incidentStatus = 'ACTIVE';
      _trackingSecondsRemaining = 900;
      _trackingEnded = false;
      _sosStatusMessage = contactCount > 0
          ? l('safety.sosActiveMsg')
          : l('safety.sosActiveNoContacts');
    });

    _startLocationSharing(incident.id);
    _startTrackingCountdown();
    _startStatusPolling(incident.id);
    _subscribeToRealtime(incident.id);

    _showSuccess(
      contactCount > 0
          ? l(
              'safety.sosActivatedWithContacts',
              args: {'count': contactCount.toString()},
            )
          : l('safety.sosActivated'),
    );
  }

  void _startLocationSharing(String incidentId) {
    _locationTimer = Timer.periodic(const Duration(seconds: 15), (timer) async {
      if (!_sosActive || !mounted || _trackingEnded) {
        timer.cancel();
        return;
      }
      try {
        final position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 5),
          ),
        );
        await ref
            .read(safetyRepositoryProvider)
            .shareLocation(
              incidentId: incidentId,
              latitude: position.latitude,
              longitude: position.longitude,
              accuracyMeters: position.accuracy,
            );
      } on PostgrestException catch (e) {
        if (e.message.contains('expired')) {
          if (!mounted) return;
          setState(() {
            _trackingEnded = true;
            _incidentStatus = 'TRACKING_EXPIRED';
            _sosStatusMessage = context.tr('safety.trackingExpiredMsg');
          });
          timer.cancel();
        }
      } catch (_) {}
    });
  }

  void _startTrackingCountdown() {
    _countdownDisplayTimer = Timer.periodic(const Duration(seconds: 1), (
      timer,
    ) {
      if (!_sosActive || !mounted || _trackingEnded) {
        timer.cancel();
        return;
      }
      setState(() => _trackingSecondsRemaining--);
      if (_trackingSecondsRemaining <= 0) {
        _trackingSecondsRemaining = 0;
        _trackingEnded = true;
        _incidentStatus = 'TRACKING_EXPIRED';
        _sosStatusMessage = context.tr('safety.trackingExpiredMsg');
        _locationTimer?.cancel();
        timer.cancel();
      }
    });
  }

  void _startStatusPolling(String incidentId) {
    _statusTimer = Timer.periodic(const Duration(seconds: 10), (timer) async {
      if (!_sosActive || !mounted) {
        timer.cancel();
        return;
      }
      final result = await ref
          .read(safetyRepositoryProvider)
          .getSosIncidentDetail(incidentId);
      if (!mounted || result.isFailure) return;
      final detail = result.dataOrNull;
      if (detail == null) return;

      final newStatus = detail['status'] as String? ?? _incidentStatus;
      if (newStatus != _incidentStatus) {
        final l = context.tr;
        setState(() => _incidentStatus = newStatus);

        switch (newStatus) {
          case 'ACKNOWLEDGED':
            _sosStatusMessage = l('safety.sosAcknowledgedMsg');
            _showSuccess(l('safety.sosAcknowledged'));
            break;
          case 'RESPONDER_ASSIGNED':
            _sosStatusMessage = l('safety.sosRespondingMsg');
            _showSuccess(l('safety.sosResponding'));
            break;
          case 'RESPONSE_IN_PROGRESS':
            _sosStatusMessage = l('safety.sosResponseInProgressMsg');
            _showSuccess(l('safety.sosResponseInProgress'));
            break;
          case 'RESOLVED':
          case 'CLOSED':
            _sosStatusMessage = l('safety.sosResolvedMsg');
            _trackingEnded = true;
            _locationTimer?.cancel();
            _countdownDisplayTimer?.cancel();
            _showSuccess(l('safety.sosResolved'));
            break;
          case 'TRACKING_EXPIRED':
            _trackingEnded = true;
            _locationTimer?.cancel();
            _countdownDisplayTimer?.cancel();
            _sosStatusMessage = l('safety.trackingExpiredMsg');
            break;
        }
      }

      // Update tracking remaining time from server
      final serverRemaining = detail['tracking_seconds_remaining'] as int?;
      if (serverRemaining != null && serverRemaining >= 0 && !_trackingEnded) {
        setState(() => _trackingSecondsRemaining = serverRemaining);
      }

      final trackingStatus = detail['tracking_status'] as String?;
      if (trackingStatus == 'ended' || trackingStatus == 'expired') {
        if (!_trackingEnded) {
          setState(() {
            _trackingEnded = true;
            _locationTimer?.cancel();
            _countdownDisplayTimer?.cancel();
            if (newStatus == 'ACTIVE' || newStatus == 'ACKNOWLEDGED') {
              _incidentStatus = 'TRACKING_EXPIRED';
              _sosStatusMessage = context.tr('safety.trackingExpiredMsg');
            }
          });
        }
      }
    });
  }

  void _subscribeToRealtime(String incidentId) {
    _realtimeChannel?.unsubscribe();
    _realtimeChannel = SupabaseService.client
        .channel('sos-incident:$incidentId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'safety_incidents',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: incidentId,
          ),
          callback: (payload) {
            if (!mounted) return;
            final newRecord = payload.newRecord;
            final newStatus = newRecord['status'] as String?;
            if (newStatus != null && newStatus != _incidentStatus) {
              final l = context.tr;
              setState(() => _incidentStatus = newStatus);
              switch (newStatus) {
                case 'ACKNOWLEDGED':
                  _sosStatusMessage = l('safety.sosAcknowledgedMsg');
                  _showSuccess(l('safety.sosAcknowledged'));
                  break;
                case 'RESPONDER_ASSIGNED':
                  _sosStatusMessage = l('safety.sosRespondingMsg');
                  _showSuccess(l('safety.sosResponding'));
                  break;
                case 'RESPONSE_IN_PROGRESS':
                  _sosStatusMessage = l('safety.sosResponseInProgressMsg');
                  _showSuccess(l('safety.sosResponseInProgress'));
                  break;
                case 'RESOLVED':
                case 'CLOSED':
                  _sosStatusMessage = l('safety.sosResolvedMsg');
                  _trackingEnded = true;
                  _locationTimer?.cancel();
                  _countdownDisplayTimer?.cancel();
                  _showSuccess(l('safety.sosResolved'));
                  break;
                case 'TRACKING_EXPIRED':
                  _trackingEnded = true;
                  _locationTimer?.cancel();
                  _countdownDisplayTimer?.cancel();
                  _sosStatusMessage = l('safety.trackingExpiredMsg');
                  break;
              }
            }
          },
        )
        .subscribe();
  }

  Future<void> _cancelSos() async {
    final l = context.tr;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l('safety.sosCancel')),
        content: Text(l('safety.sosCancelConfirm')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(l('safety.sosCancel')),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l('widget.confirm')),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    if (_activeIncidentId == null) return;

    final result = await ref
        .read(safetyRepositoryProvider)
        .cancelSos(_activeIncidentId!);
    if (!mounted) return;

    _locationTimer?.cancel();
    _countdownDisplayTimer?.cancel();
    _statusTimer?.cancel();
    _realtimeChannel?.unsubscribe();
    if (result.isFailure) {
      _showError(l('safety.sosFailed'));
    } else {
      setState(() {
        _sosActive = false;
        _activeIncidentId = null;
        _sosStatusMessage = '';
        _trackingEnded = false;
        _trackingSecondsRemaining = 900;
      });
      _showSuccess(l('safety.sosCancelledMsg'));
    }
  }

  void _showSuccess(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: Theme.of(context).colorScheme.error,
      ),
    );
  }

  String _formatCountdown(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  Color _statusColor() {
    switch (_incidentStatus) {
      case 'ACTIVE':
        return Colors.red;
      case 'ACKNOWLEDGED':
        return Colors.orange;
      case 'RESPONDER_ASSIGNED':
      case 'RESPONSE_IN_PROGRESS':
        return Colors.blue;
      case 'TRACKING_EXPIRED':
        return Colors.amber.shade700;
      case 'RESOLVED':
      case 'CLOSED':
        return Colors.green;
      case 'CANCELLED':
        return Colors.grey;
      default:
        return Colors.red;
    }
  }

  String _statusLabel(
    String Function(String key, {Map<String, dynamic> args}) l,
  ) {
    switch (_incidentStatus) {
      case 'ACTIVE':
        return l('safety.statusActive');
      case 'ACKNOWLEDGED':
        return l('safety.statusAcknowledged');
      case 'RESPONDER_ASSIGNED':
        return l('safety.statusResponderAssigned');
      case 'RESPONSE_IN_PROGRESS':
        return l('safety.statusResponseInProgress');
      case 'TRACKING_EXPIRED':
        return l('safety.statusTrackingExpired');
      case 'RESOLVED':
        return l('safety.statusResolved');
      case 'CLOSED':
        return l('safety.statusClosed');
      case 'CANCELLED':
        return l('safety.statusCancelled');
      default:
        return _incidentStatus;
    }
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final l = context.tr;
    final colors = Theme.of(context).colorScheme;
    final screenWidth = MediaQuery.sizeOf(context).width;

    final hPadding = screenWidth < 380 ? 16.0 : 20.0;

    // *** WOMEN SAFETY GENDER AUTHORIZATION (UI layer) ***
    // The server-side RPCs and RLS are the authoritative enforcement.
    // This UI check prevents non-female users from seeing the SOS controls.
    final eligibility = ref.watch(womenSafetyEligibilityProvider);

    return Scaffold(
      appBar: AppBar(title: Text(l('safety.title'))),
      body: SafeArea(
        child: eligibility.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, _) => Center(
            child: Padding(
              padding: AppSpacing.pagePadding,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.error_outline_rounded,
                    size: 64,
                    color: colors.error,
                  ),
                  AppSpacing.hLG,
                  Text(
                    l('safety.unableToVerify'),
                    style: Theme.of(context).textTheme.titleMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
          data: (eligible) => eligible
              ? ListView(
                  padding: EdgeInsets.fromLTRB(hPadding, 16, hPadding, 40),
                  children: [
                    if (_sosActive) ...[
                      _buildSosActiveCard(context, l, colors),
                    ] else if (_sosCountdown) ...[
                      _buildCountdownCard(context, l, colors),
                    ] else ...[
                      _buildSosButton(context, l, colors),
                    ],
                    AppSpacing.hXXL,

                    if (!_sosActive) ...[
                      _buildQuickActions(context, l),
                      AppSpacing.hXXL,
                    ],

                    _buildEmergencyCall(context, l),
                  ],
                )
              : Center(
                  child: Padding(
                    padding: AppSpacing.pagePadding,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.shield_outlined,
                          size: 72,
                          color: colors.outline,
                        ),
                        AppSpacing.hLG,
                        Text(
                          l('safety.accessDeniedTitle'),
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                          textAlign: TextAlign.center,
                        ),
                        AppSpacing.hMD,
                        Text(
                          l('safety.accessDenied'),
                          style: Theme.of(context).textTheme.bodyLarge
                              ?.copyWith(color: colors.onSurfaceVariant),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // SOS button
  // ---------------------------------------------------------------------------

  Widget _buildSosButton(
    BuildContext context,
    String Function(String key, {Map<String, dynamic> args}) l,
    ColorScheme colors,
  ) {
    final screenWidth = MediaQuery.sizeOf(context).width;
    final sosSize = (screenWidth * 0.50).clamp(160.0, 200.0);

    return Column(
      children: [
        Semantics(
          label: l('safety.sosButton'),
          hint: l('safety.sosHoldToActivate'),
          button: true,
          child: GestureDetector(
            onLongPressStart: (_) => _startSosCountdown(),
            child: AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final scale = 1.0 + (_pulseController.value * 0.08);
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    width: sosSize,
                    height: sosSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.red,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.red.withValues(
                            alpha: 0.4 * _pulseController.value,
                          ),
                          blurRadius: 30 + (20 * _pulseController.value),
                          spreadRadius: 5,
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.shield,
                          color: Colors.white,
                          size: sosSize * 0.24,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l('safety.sosButton'),
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: sosSize * 0.18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        AppSpacing.hMD,
        Text(
          l('safety.sosHoldToActivate'),
          style: Theme.of(context).textTheme.bodyMedium
              ?.copyWith(color: colors.onSurfaceVariant),
        ),
      ],
    );
  }

  // ---------------------------------------------------------------------------
  // Countdown card (3-2-1)
  // ---------------------------------------------------------------------------

  Widget _buildCountdownCard(
    BuildContext context,
    String Function(String key, {Map<String, dynamic> args}) l,
    ColorScheme colors,
  ) {
    return Card(
      color: Colors.red.shade50,
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              l(
                'safety.sosCountdown',
                args: {'seconds': _countdown.toString()},
              ),
              style: const TextStyle(
                fontSize: 48,
                fontWeight: FontWeight.bold,
                color: Colors.red,
              ),
            ),
            AppSpacing.hLG,
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _cancelCountdown,
                icon: const Icon(Icons.cancel),
                label: Text(l('safety.sosCancel')),
                style: FilledButton.styleFrom(backgroundColor: colors.error),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // SOS active card — with tracking countdown + live status
  // ---------------------------------------------------------------------------

  Widget _buildSosActiveCard(
    BuildContext context,
    String Function(String key, {Map<String, dynamic> args}) l,
    ColorScheme colors,
  ) {
    final statusColor = _statusColor();

    return Card(
      color: statusColor.withValues(alpha: 0.08),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Pulsing status indicator
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                return Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: statusColor.withValues(
                      alpha: 0.8 + 0.2 * _pulseController.value,
                    ),
                  ),
                  child: Icon(
                    _incidentStatus == 'RESOLVED' || _incidentStatus == 'CLOSED'
                        ? Icons.check_circle
                        : Icons.shield,
                    color: Colors.white,
                    size: 40,
                  ),
                );
              },
            ),
            AppSpacing.hMD,

            // Status label
            Text(
              _statusLabel(l),
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: statusColor,
              ),
            ),
            AppSpacing.hSM,

            // Status message
            Text(
              _sosStatusMessage,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),

            // Tracking countdown (only if tracking is still active)
            if (!_trackingEnded &&
                _incidentStatus != 'RESOLVED' &&
                _incidentStatus != 'CLOSED') ...[
              AppSpacing.hMD,
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.location_on, color: statusColor, size: 20),
                        const SizedBox(width: 8),
                        Text(
                          l('safety.trackingActive'),
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: statusColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _formatCountdown(_trackingSecondsRemaining),
                      style: TextStyle(
                        fontSize: 36,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l('safety.trackingEndsIn'),
                      style: Theme.of(context).textTheme.bodySmall
                          ?.copyWith(color: colors.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              AppSpacing.hSM,
              Text(
                l('safety.trackingInfo'),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall
                    ?.copyWith(color: colors.onSurfaceVariant),
              ),
            ],

            // Tracking expired message
            if (_trackingEnded &&
                _incidentStatus != 'RESOLVED' &&
                _incidentStatus != 'CLOSED' &&
                _incidentStatus != 'CANCELLED') ...[
              AppSpacing.hMD,
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Column(
                  children: [
                    Icon(
                      Icons.timer_off,
                      color: Colors.amber.shade700,
                      size: 24,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l('safety.trackingExpired'),
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Colors.amber.shade700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l('safety.trackingExpiredDetail'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],

            // Resolved message
            if (_incidentStatus == 'RESOLVED' ||
                _incidentStatus == 'CLOSED') ...[
              AppSpacing.hMD,
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Column(
                  children: [
                    Icon(
                      Icons.check_circle,
                      color: Colors.green.shade700,
                      size: 24,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      l('safety.sosResolved'),
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: Colors.green.shade700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l('safety.sharingStopped'),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],

            AppSpacing.hLG,

            // Cancel button (only if not resolved/closed)
            if (_incidentStatus != 'RESOLVED' &&
                _incidentStatus != 'CLOSED' &&
                _incidentStatus != 'CANCELLED')
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _cancelSos,
                  icon: const Icon(Icons.cancel),
                  label: Text(l('safety.sosCancel')),
                  style: FilledButton.styleFrom(backgroundColor: colors.error),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Quick actions grid
  // ---------------------------------------------------------------------------

  Widget _buildQuickActions(
    BuildContext context,
    String Function(String key, {Map<String, dynamic> args}) l,
  ) {
    final entries = [
      _QuickAction(
        icon: Icons.contacts,
        title: l('safety.contacts'),
        subtitle: l('safety.contactsDesc'),
        color: Colors.blue,
        route: AppRoutes.safetyContacts,
      ),
      _QuickAction(
        icon: Icons.timer,
        title: l('safety.checkIn'),
        subtitle: l('safety.checkInDesc'),
        color: Colors.orange,
        route: AppRoutes.safetyCheckIn,
      ),
      _QuickAction(
        icon: Icons.location_on,
        title: l('safety.nearby'),
        subtitle: l('safety.nearbyDesc'),
        color: Colors.green,
        route: AppRoutes.safetyNearby,
      ),
      _QuickAction(
        icon: Icons.report,
        title: l('safety.report'),
        subtitle: l('safety.reportDesc'),
        color: Colors.purple,
        route: AppRoutes.safetyReport,
      ),
    ];

    final textScaler = MediaQuery.textScalerOf(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final availableWidth = constraints.maxWidth;
        const crossAxisSpacing = 12.0;
        const mainAxisSpacing = 12.0;
        final cardWidth = (availableWidth - crossAxisSpacing) / 2;

        const cardPaddingV = 32.0;
        const iconHeight = 44.0;
        const minGap = 8.0;
        final titleHeight = textScaler.scale(20.0);
        final textWidth = cardWidth - 32;
        final charsPerLine = (textWidth / textScaler.scale(6.5)).floor().clamp(
          1,
          200,
        );
        const longestDesc = 62;
        final descLines = (longestDesc / charsPerLine).ceil();
        final descHeight = descLines * textScaler.scale(17.0);
        final cardHeight =
            cardPaddingV + iconHeight + minGap + titleHeight + descHeight + 8.0;
        final aspectRatio = (cardWidth / cardHeight).clamp(0.65, 1.45);

        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: aspectRatio,
            crossAxisSpacing: crossAxisSpacing,
            mainAxisSpacing: mainAxisSpacing,
          ),
          itemCount: entries.length,
          itemBuilder: (context, i) {
            final e = entries[i];
            return Semantics(
              label: e.title,
              hint: e.subtitle,
              button: true,
              child: Card(
                child: InkWell(
                  onTap: () => context.push(e.route),
                  borderRadius: BorderRadius.circular(16),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: e.color.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(e.icon, color: e.color, size: 24),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              e.title,
                              style: Theme.of(context).textTheme.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w600),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              e.subtitle,
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Emergency call button
  // ---------------------------------------------------------------------------

  Widget _buildEmergencyCall(
    BuildContext context,
    String Function(String key, {Map<String, dynamic> args}) l,
  ) {
    return Semantics(
      label: l('safety.emergencyCall'),
      hint: 'Call 112 emergency number',
      button: true,
      child: Card(
        color: Colors.red.shade50,
        child: ListTile(
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 8,
          ),
          leading: const Icon(Icons.phone, color: Colors.red, size: 32),
          title: Text(
            l('safety.emergencyCall'),
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.red,
            ),
          ),
          subtitle: Text(
            '112',
            style: Theme.of(context).textTheme.titleLarge
                ?.copyWith(fontWeight: FontWeight.bold, color: Colors.red),
          ),
          onTap: () async {
            final uri = Uri.parse('tel:112');
            if (await canLaunchUrl(uri)) {
              await launchUrl(uri);
            } else {
              _showError('Could not open dialer');
            }
          },
        ),
      ),
    );
  }
}

class _QuickAction {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final String route;
  const _QuickAction({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.route,
  });
}
