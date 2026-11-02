import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';

import '../../core/routing/app_routes.dart';
import '../../data/models/assignment_info.dart';
import '../../data/models/complaint.dart';
import '../../data/models/complaint_status.dart';
import '../../data/models/status_history.dart';
import '../../data/repositories/complaint_repository.dart';
import '../../data/repositories/repository_providers.dart';
import '../../data/repositories/storage_repository.dart';
import '../../core/i18n/app_localizations.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/confirm_dialog.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../../core/widgets/status_badge.dart';
import '../auth/auth_provider.dart';
import 'complaint_detail_provider.dart';

/// Detail view for a single complaint.
///
/// Shows the complaint header (ID, title, category, status), image gallery,
/// description, a visual timeline of the complaint lifecycle, and resolution
/// evidence photos (when resolved). Updates in realtime when the admin
/// changes the status — no manual refresh needed.
///
/// If the complaint has not yet been verified (status SUBMITTED,
/// AUTO_VALIDATING, or NEEDS_REVIEW), a delete action is available in the
/// app bar so the citizen can withdraw it.
class ComplaintDetailScreen extends ConsumerWidget {
  const ComplaintDetailScreen({super.key, required this.complaintId});

  final String complaintId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch realtime so the detail refreshes on status change.
    ref.watch(complaintDetailRealtimeProvider(complaintId));

    final detailAsync = ref.watch(complaintDetailProvider(complaintId));
    final isDeleting = ref.watch(_deleteInProgressProvider);

    final detail = detailAsync.value;
    final canDelete = detail != null && detail.complaint.status.isDeletable;

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('complaint.detail.title')),
        actions: [
          if (canDelete)
            IconButton(
              icon: isDeleting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.delete_outline_rounded),
              tooltip: context.tr('complaint.detail.deleteTooltip'),
              onPressed: isDeleting ? null : () => _confirmDelete(context, ref),
            ),
        ],
      ),
      body: SafeArea(
        child: detailAsync.when(
          data: (detail) => RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(complaintDetailProvider(complaintId));
              await ref.read(complaintDetailProvider(complaintId).future);
            },
            child: _DetailBody(detail: detail),
          ),
          loading: () => LoadingView(message: context.tr('complaint.detail.loading')),
          error: (error, _) => ErrorView(
            message: error.toString(),
            onRetry: () =>
                ref.invalidate(complaintDetailProvider(complaintId)),
          ),
        ),
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final confirmed = await ConfirmDialog.show(
      context,
      title: context.tr('complaint.detail.deleteTitle'),
      message: context.tr('complaint.detail.deleteMessage'),
      confirmLabel: context.tr('common.delete'),
      cancelLabel: context.tr('common.cancel'),
      destructive: true,
    );

    if (!confirmed) return;

    ref.read(_deleteInProgressProvider.notifier).set(true);

    final result = await ref.read(deleteComplaintProvider(complaintId).future);

    ref.read(_deleteInProgressProvider.notifier).set(false);

    result.when(
      success: (_) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(context.tr('complaint.detail.deleted'))),
          );
          Navigator.of(context).pop(true);
        }
      },
      failure: (failure) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(context.tr('complaint.detail.deleteFailed',
                  args: {'message': failure.message})),
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          );
        }
      },
    );
  }
}

final _deleteInProgressProvider =
    NotifierProvider<_DeleteInProgressNotifier, bool>(
        _DeleteInProgressNotifier.new);

class _DeleteInProgressNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void set(bool value) => state = value;
}

class _DetailBody extends StatelessWidget {
  const _DetailBody({required this.detail});

  final ComplaintDetail detail;

  @override
  Widget build(BuildContext context) {
    final complaint = detail.complaint;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: AppSpacing.pagePadding,
      children: [
        // --- Header card ---
        _HeaderCard(complaint: complaint),
        AppSpacing.hLG,

        // --- Assignment info (department + officer) ---
        if (complaint.assignment != null &&
            complaint.assignment!.hasDepartment) ...[
          _AssignmentSection(assignment: complaint.assignment!),
          AppSpacing.hLG,
        ],

        // --- AI evidence-verification status banner ---
        if (_isAiStatus(complaint.status)) ...[
          _AiStatusSection(complaint: complaint),
          AppSpacing.hLG,
        ],

        // --- Incident card (if part of an incident) ---
        if (complaint.isPartOfIncident) ...[
          _IncidentCard(complaint: complaint),
          AppSpacing.hLG,
        ],

        // --- Evidence gallery (original vs additional rounds) ---
        if (detail.images.isNotEmpty) ...[
          _EvidenceGallery(images: detail.images),
          AppSpacing.hLG,
        ],

        // --- Description ---
        if (complaint.description != null &&
            complaint.description!.isNotEmpty) ...[
          _SectionCard(
            title: context.tr('complaint.detail.description'),
            child: Text(
              complaint.description!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          AppSpacing.hLG,
        ],

        // --- Location ---
        if (complaint.address != null && complaint.address!.isNotEmpty) ...[
          _SectionCard(
            title: context.tr('complaint.detail.location'),
            child: Row(
              children: [
                Icon(Icons.location_on_rounded,
                    size: 18, color: Theme.of(context).colorScheme.primary),
                AppSpacing.wSM,
                Expanded(
                  child: Text(
                    complaint.address!,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),
              ],
            ),
          ),
          AppSpacing.hLG,
        ],

        // --- Timeline ---
        _TimelineSection(
          currentStatus: complaint.status,
          history: detail.statusHistory,
        ),

        // --- Resolution evidence ---
        if (detail.resolutionEvidence.isNotEmpty) ...[
          AppSpacing.hLG,
          _ResolutionEvidenceSection(evidence: detail.resolutionEvidence),
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Header card
// ---------------------------------------------------------------------------

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({required this.complaint});

  final Complaint complaint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Container(
      padding: AppSpacing.cardPadding,
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: AppRadius.rLG,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                complaint.complaintNumber,
                style: theme.textTheme.labelLarge?.copyWith(
                  color: colors.primary,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'monospace',
                ),
              ),
              const Spacer(),
              StatusBadge(status: complaint.status),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            complaint.title,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          if (complaint.category != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.category_outlined,
                    size: 16, color: colors.onSurfaceVariant),
                const SizedBox(width: 6),
                Text(
                  complaint.category!.name,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Assignment section (department + officer info shown to the citizen)
// ---------------------------------------------------------------------------

/// Shows which department and officer the complaint has been assigned to,
/// including the officer's name, designation, ward, and routing method.
/// This gives the citizen visibility into who is handling their complaint.
class _AssignmentSection extends StatelessWidget {
  const _AssignmentSection({required this.assignment});

  final AssignmentInfo assignment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final l = context.tr;

    return Container(
      width: double.infinity,
      padding: AppSpacing.cardPadding,
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: AppRadius.rLG,
        border: Border.all(color: colors.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.assignment_ind_outlined,
                  size: 20, color: colors.primary),
              const SizedBox(width: 8),
              Text(
                l('complaint.detail.assignment'),
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Department
          _AssignmentRow(
            icon: Icons.business_outlined,
            label: l('complaint.detail.department'),
            value: assignment.departmentName != null
                ? '${assignment.departmentName}'
                    '${assignment.departmentCode != null ? ' (${assignment.departmentCode})' : ''}'
                : '—',
          ),
          const SizedBox(height: 8),
          // Officer
          if (assignment.hasOfficer) ...[
            _AssignmentRow(
              icon: Icons.person_outline_rounded,
              label: l('complaint.detail.officer'),
              value: assignment.officerTitle != null
                  ? '${assignment.officerName} (${assignment.officerTitle})'
                  : assignment.officerName!,
            ),
            const SizedBox(height: 8),
          ] else ...[
            _AssignmentRow(
              icon: Icons.person_off_outlined,
              label: l('complaint.detail.officer'),
              value: l('complaint.detail.officerPending'),
            ),
            const SizedBox(height: 8),
          ],
          // Ward
          if (assignment.ward != null) ...[
            _AssignmentRow(
              icon: Icons.location_on_outlined,
              label: l('complaint.detail.ward'),
              value: assignment.ward!,
            ),
            const SizedBox(height: 8),
          ],
          // Routing method
          _AssignmentRow(
            icon: Icons.route_outlined,
            label: l('complaint.detail.routingMethod'),
            value: assignment.routingLabel,
          ),
          // Assigned date
          if (assignment.assignedAt != null) ...[
            const SizedBox(height: 8),
            _AssignmentRow(
              icon: Icons.schedule_outlined,
              label: l('complaint.detail.assignedAt'),
              value: DateFormat('d MMM yyyy, h:mm a')
                  .format(assignment.assignedAt!.toLocal()),
            ),
          ],
        ],
      ),
    );
  }
}

class _AssignmentRow extends StatelessWidget {
  const _AssignmentRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: colors.onSurfaceVariant),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: theme.textTheme.bodySmall?.copyWith(
            color: colors.onSurfaceVariant,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Incident card
// ---------------------------------------------------------------------------

class _IncidentCard extends StatelessWidget {
  const _IncidentCard({required this.complaint});

  final Complaint complaint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final citizens =
        complaint.incidentCitizenCount ?? complaint.incidentReportCount ?? 1;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppColors.brandGradient,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.groups_2_rounded,
                  color: Colors.white, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  context.tr('complaint.detail.incidentCard'),
                  style: theme.textTheme.titleSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (complaint.incidentNumber != null)
                Text(
                  complaint.incidentNumber!,
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontWeight: FontWeight.w600,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            citizens == 1
                ? context.tr('complaint.detail.citizenReported')
                : context.tr('complaint.detail.citizensReported',
                    args: {'count': citizens}),
            style: theme.textTheme.bodySmall?.copyWith(
              color: Colors.white.withValues(alpha: 0.95),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Evidence gallery (original vs additional rounds)
// ---------------------------------------------------------------------------

/// Shows original evidence (round 1) and additional evidence (round 2+)
/// in clearly separated sections so the citizen can distinguish what they
/// submitted originally from what they uploaded after an officer's request.
class _EvidenceGallery extends StatelessWidget {
  const _EvidenceGallery({required this.images});

  final List<ComplaintImageWithUrl> images;

  @override
  Widget build(BuildContext context) {
    final original = images.where((i) => i.isOriginal).toList();
    final additional = images.where((i) => !i.isOriginal).toList();

    // Group additional images by round number.
    final rounds = <int, List<ComplaintImageWithUrl>>{};
    for (final img in additional) {
      rounds.putIfAbsent(img.roundNumber, () => []).add(img);
    }
    final sortedRounds = rounds.keys.toList()..sort();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (original.isNotEmpty) ...[
          _ImageStrip(
            images: original,
            title: context.tr('complaint.detail.originalEvidence'),
          ),
          if (additional.isNotEmpty) AppSpacing.hLG,
        ],
        for (final round in sortedRounds) ...[
          _ImageStrip(
            images: rounds[round]!,
            title: context.tr('complaint.detail.additionalEvidenceRound',
                args: {'round': round}),
          ),
          AppSpacing.hLG,
        ],
      ],
    );
  }
}

/// A horizontal strip of image thumbnails with a title.
class _ImageStrip extends StatelessWidget {
  const _ImageStrip({required this.images, required this.title});

  final List<ComplaintImageWithUrl> images;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 120,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: images.length,
            separatorBuilder: (_, _) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              return ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: GestureDetector(
                  onTap: () => _showFullImage(context, images[index].url),
                  child: CachedNetworkImage(
                    imageUrl: images[index].url,
                    width: 120,
                    height: 120,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: colors.surfaceContainerHighest,
                      child: const Center(
                        child:
                            CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                    errorWidget: (context, url, error) => Container(
                      width: 120,
                      height: 120,
                      color: colors.surfaceContainerHighest,
                      child: Icon(Icons.broken_image_outlined,
                          color: colors.onSurfaceVariant),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  void _showFullImage(BuildContext context, String url) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        barrierDismissible: true,
        pageBuilder: (context, _, _) => _FullScreenImage(url: url),
      ),
    );
  }
}

class _FullScreenImage extends StatelessWidget {
  const _FullScreenImage({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black87,
      body: GestureDetector(
        onTap: () => Navigator.of(context).pop(),
        child: Center(
          child: InteractiveViewer(
            child: CachedNetworkImage(imageUrl: url),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

/// All lifecycle steps in order, matching the spec.
const _timelineSteps = <ComplaintStatus>[
  ComplaintStatus.submitted,
  ComplaintStatus.verified,
  ComplaintStatus.assigned,
  ComplaintStatus.inProgress,
  ComplaintStatus.resolved,
];

class _TimelineSection extends StatelessWidget {
  const _TimelineSection({
    required this.currentStatus,
    required this.history,
  });

  final ComplaintStatus currentStatus;
  final List<StatusHistoryEntry> history;

  @override
  Widget build(BuildContext context) {
    return _SectionCard(
      title: context.tr('complaint.detail.timeline'),
      child: Column(
        children: _timelineSteps.asMap().entries.map((entry) {
          final index = entry.key;
          final step = entry.value;
          final isLast = index == _timelineSteps.length - 1;

          // Find the history entry for this status (if it has been reached).
          final historyEntry = _findHistoryEntry(step);
          final isReached = _isReached(step);
          final isCurrent = step == currentStatus;

          return _TimelineNode(
            step: step,
            isReached: isReached,
            isCurrent: isCurrent,
            timestamp: historyEntry?.formattedDateTime,
            comment: historyEntry?.comment,
            isLast: isLast,
          );
        }).toList(),
      ),
    );
  }

  /// Finds the first history entry matching this status.
  StatusHistoryEntry? _findHistoryEntry(ComplaintStatus status) {
    for (final entry in history) {
      if (entry.status == status) return entry;
    }
    return null;
  }

  /// Whether this step has been reached (appears in history or is the
  /// current/earlier status).
  bool _isReached(ComplaintStatus step) {
    final currentIndex = _timelineSteps.indexOf(currentStatus);
    final stepIndex = _timelineSteps.indexOf(step);
    if (currentIndex < 0 || stepIndex < 0) return false;
    return stepIndex <= currentIndex;
  }
}

class _TimelineNode extends StatelessWidget {
  const _TimelineNode({
    required this.step,
    required this.isReached,
    required this.isCurrent,
    required this.isLast,
    this.timestamp,
    this.comment,
  });

  final ComplaintStatus step;
  final bool isReached;
  final bool isCurrent;
  final bool isLast;
  final String? timestamp;
  final String? comment;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    final stepColor = isReached ? colors.primary : colors.outlineVariant;
    final labelColor = isReached
        ? colors.onSurface
        : colors.onSurfaceVariant.withValues(alpha: 0.5);

    return IntrinsicHeight(
      child: Row(
        children: [
          // --- Dot + line ---
          SizedBox(
            width: 32,
            child: Column(
              children: [
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: isReached ? stepColor : colors.surfaceContainerHighest,
                    shape: BoxShape.circle,
                    border: isCurrent
                        ? Border.all(color: stepColor, width: 3)
                        : null,
                  ),
                  child: Icon(
                    isReached ? Icons.check_rounded : Icons.circle_outlined,
                    size: 14,
                    color: isReached ? Colors.white : colors.outline,
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: isReached
                          ? stepColor.withValues(alpha: 0.4)
                          : colors.outlineVariant,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          // --- Content ---
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    step.displayLabel,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                      color: labelColor,
                    ),
                  ),
                  if (timestamp != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      timestamp!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      ),
                    ),
                  ],
                  if (comment != null && comment!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      comment!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Resolution evidence
// ---------------------------------------------------------------------------

class _ResolutionEvidenceSection extends StatelessWidget {
  const _ResolutionEvidenceSection({required this.evidence});

  final List<ResolutionEvidence> evidence;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return _SectionCard(
      title: context.tr('complaint.detail.resolutionEvidence'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.verified_rounded,
                  size: 16, color: AppColors.resolved),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  context.tr('complaint.detail.resolutionEvidenceDesc'),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 120,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: evidence.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final ev = evidence[index];
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: ev.imageUrl != null
                          ? CachedNetworkImage(
                              imageUrl: ev.imageUrl!,
                              width: 120,
                              height: 100,
                              fit: BoxFit.cover,
                              placeholder: (context, url) => Container(
                                width: 120,
                                height: 100,
                                color: colors.surfaceContainerHighest,
                                child: const Center(
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2),
                                ),
                              ),
                              errorWidget: (context, url, error) => Container(
                                width: 120,
                                height: 100,
                                color: colors.surfaceContainerHighest,
                                child: Icon(Icons.broken_image_outlined,
                                    color: colors.onSurfaceVariant),
                              ),
                            )
                          : Container(
                              width: 120,
                              height: 100,
                              color: colors.surfaceContainerHighest,
                              child: Icon(Icons.image_outlined,
                                  color: colors.onSurfaceVariant),
                            ),
                    ),
                    if (ev.caption != null && ev.caption!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      SizedBox(
                        width: 120,
                        child: Text(
                          ev.caption!,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: colors.onSurfaceVariant,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared section card
// ---------------------------------------------------------------------------

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// AI evidence-verification status banner
// ---------------------------------------------------------------------------

/// Whether [status] is one of the AI evidence-verification statuses that
/// should render the [_AiStatusSection] banner.
bool _isAiStatus(ComplaintStatus status) =>
    status == ComplaintStatus.aiChecking ||
    status == ComplaintStatus.aiVerified ||
    status == ComplaintStatus.aiReviewRequired ||
    status == ComplaintStatus.aiFailed ||
    status == ComplaintStatus.evidenceRequired;

/// Banner shown on the complaint detail screen for AI evidence-verification
/// statuses.
///
/// * `AI_CHECKING` — reassures the citizen that photos are being checked.
/// * `AI_VERIFIED` — confirms the evidence matched and the complaint is
///   being forwarded for action.
/// * `AI_REVIEW_REQUIRED` — explains the complaint went to an officer.
/// * `AI_FAILED` — the photos did not match the category; offers to change
///   the category or upload new photos.
/// * `EVIDENCE_REQUIRED` — an officer asked for more evidence; shows the
///   officer's message and an "Upload New Photos" action that uploads to
///   Supabase Storage and calls the `add_evidence_to_complaint` RPC.
class _AiStatusSection extends ConsumerStatefulWidget {
  const _AiStatusSection({required this.complaint});

  final Complaint complaint;

  @override
  ConsumerState<_AiStatusSection> createState() => _AiStatusSectionState();
}

class _AiStatusSectionState extends ConsumerState<_AiStatusSection> {
  bool _isUploading = false;

  Future<void> _uploadNewPhotos() async {
    if (_isUploading) return;
    final complaintId = widget.complaint.id;

    try {
      final picker = ImagePicker();
      final files = await picker.pickMultiImage(
        imageQuality: 70,
        maxWidth: 1920,
        maxHeight: 1080,
      );
      if (files.isEmpty || !mounted) return;

      setState(() => _isUploading = true);

      final userId = ref.read(authRepositoryProvider).currentUserId;
      if (userId == null) {
        _showSnack(context.tr('report.error.notSignedIn'));
        return;
      }

      final storage = ref.read(storageRepositoryProvider);
      final imageUrls = <String>[];
      final imagePaths = <String>[];

      for (final file in files) {
        if (!StorageRepository.isImageFile(file)) continue;
        if (!await StorageRepository.isWithinSizeLimit(file)) continue;
        final result = await storage.uploadImage(file, userId);
        if (result.isSuccess && result.dataOrNull != null) {
          imageUrls.add(result.dataOrNull!.url);
          imagePaths.add(result.dataOrNull!.path);
        }
      }

      if (imageUrls.isEmpty) {
        if (mounted) _showSnack(context.tr('report.error.uploadFailed'));
        return;
      }

      final complaintRepo = ref.read(complaintRepositoryProvider);
      final result = await complaintRepo.addEvidence(
        complaintId: complaintId,
        imageUrls: imageUrls,
        imagePaths: imagePaths,
      );

      if (result.isSuccess) {
        ref.invalidate(complaintDetailProvider(complaintId));
        if (mounted) {
          _showSnack(context.tr('ai.evidenceSubmitted'));
        }
      } else {
        if (mounted) {
          _showSnack(result.failureOrNull?.message ??
              context.tr('report.error.uploadFailed'));
        }
      }
    } on Exception catch (e) {
      if (mounted) _showSnack(e.toString());
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final status = widget.complaint.status;
    final l = context.tr;

    final (icon, iconColor, bg) = _styleFor(status, colors);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: iconColor.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 22, color: iconColor),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  l(_titleKey(status)),
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: iconColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            l(_messageKey(status)),
            style: theme.textTheme.bodyMedium?.copyWith(
              color: colors.onSurfaceVariant,
            ),
          ),

          // Officer message (EVIDENCE_REQUIRED).
          if (status == ComplaintStatus.evidenceRequired &&
              widget.complaint.evidenceRequestMessage != null &&
              widget.complaint.evidenceRequestMessage!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colors.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.campaign_outlined,
                          size: 16, color: colors.onSurfaceVariant),
                      const SizedBox(width: 6),
                      Text(
                        l('ai.officerMessage'),
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: colors.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.complaint.evidenceRequestMessage!,
                    style: theme.textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],

          // Action buttons.
          if (status == ComplaintStatus.evidenceRequired ||
              status == ComplaintStatus.aiFailed) ...[
            const SizedBox(height: 14),
            AppButton(
              label: l('ai.uploadNewPhotos'),
              icon: Icons.add_a_photo_outlined,
              isLoading: _isUploading,
              isExpanded: true,
              onPressed: _isUploading ? null : _uploadNewPhotos,
            ),
            if (status == ComplaintStatus.aiFailed) ...[
              AppSpacing.hSM,
              AppButton(
                label: l('ai.changeCategory'),
                icon: Icons.swap_horiz_rounded,
                variant: AppButtonVariant.outlined,
                isExpanded: true,
                onPressed: () => context.push(AppRoutes.reportIssue),
              ),
            ],
          ],
        ],
      ),
    );
  }

  String _titleKey(ComplaintStatus status) {
    return switch (status) {
      ComplaintStatus.aiChecking => 'ai.checking',
      ComplaintStatus.aiVerified => 'ai.verified',
      ComplaintStatus.aiReviewRequired => 'ai.reviewRequired',
      ComplaintStatus.aiFailed => 'ai.failed',
      ComplaintStatus.evidenceRequired => 'ai.evidenceRequired',
      _ => '',
    };
  }

  String _messageKey(ComplaintStatus status) {
    return switch (status) {
      ComplaintStatus.aiChecking => 'ai.checkingMsg',
      ComplaintStatus.aiVerified => 'ai.verifiedMsg',
      ComplaintStatus.aiReviewRequired => 'ai.reviewMsg',
      ComplaintStatus.aiFailed => 'ai.failedMsg',
      ComplaintStatus.evidenceRequired => 'ai.evidenceRequiredMsg',
      _ => '',
    };
  }

  (IconData, Color, Color) _styleFor(ComplaintStatus status, ColorScheme colors) {
    return switch (status) {
      ComplaintStatus.aiChecking => (
        Icons.auto_awesome_rounded,
        const Color(0xFF6366F1),
        const Color(0xFF6366F1).withValues(alpha: 0.08),
      ),
      ComplaintStatus.aiVerified => (
        Icons.verified_rounded,
        AppColors.verified,
        AppColors.verified.withValues(alpha: 0.08),
      ),
      ComplaintStatus.aiReviewRequired => (
        Icons.rate_review_rounded,
        const Color(0xFFF97316),
        const Color(0xFFF97316).withValues(alpha: 0.08),
      ),
      ComplaintStatus.aiFailed => (
        Icons.image_not_supported_outlined,
        AppColors.rejected,
        AppColors.rejected.withValues(alpha: 0.08),
      ),
      ComplaintStatus.evidenceRequired => (
        Icons.photo_library_outlined,
        AppColors.warning,
        AppColors.warning.withValues(alpha: 0.08),
      ),
      _ => (Icons.info_outline_rounded, colors.primary, colors.surfaceContainer),
    };
  }
}
