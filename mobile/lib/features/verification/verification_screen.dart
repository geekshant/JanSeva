import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/i18n/app_localizations.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../data/models/verifiable_complaint.dart';
import '../../data/repositories/repository_providers.dart';
import '../../data/repositories/storage_repository.dart';
import '../auth/auth_provider.dart';
import '../../core/widgets/category_icon.dart';
import '../../core/widgets/error_view.dart';
import '../../core/widgets/loading_view.dart';
import '../map/nearby_provider.dart';
import 'verification_provider.dart';

/// Community Verification screen: lists nearby resolved complaints awaiting
/// citizen verification. Tapping a complaint opens a bottom sheet with the
/// before/after photos, a comment field, and Confirm / Dispute actions.
class VerificationScreen extends ConsumerWidget {
  const VerificationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watch location so location errors surface here (the verifiable list
    // provider depends on it and would otherwise throw opaquely).
    final locationAsync = ref.watch(currentLocationProvider);
    final complaintsAsync = ref.watch(verifiableComplaintsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('verification.title')),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: context.tr('common.refresh'),
            onPressed: () {
              ref.invalidate(currentLocationProvider);
              ref.invalidate(verifiableComplaintsProvider);
            },
          ),
        ],
      ),
      body: SafeArea(
        child: locationAsync.when(
          loading: () =>
              LoadingView(message: context.tr('verification.gettingLocation')),
          error: (error, _) => ErrorView(
            message: error.toString(),
            icon: Icons.location_off_rounded,
            title: context.tr('verification.locationUnavailable'),
            onRetry: () => ref.invalidate(currentLocationProvider),
          ),
          data: (_) => complaintsAsync.when(
            data: (complaints) => _VerificationList(complaints: complaints),
            loading: () =>
                LoadingView(message: context.tr('verification.finding')),
            error: (error, _) => ErrorView(
              message: error.toString(),
              onRetry: () => ref.invalidate(verifiableComplaintsProvider),
            ),
          ),
        ),
      ),
    );
  }
}

class _VerificationList extends StatelessWidget {
  const _VerificationList({required this.complaints});

  final List<VerifiableComplaint> complaints;

  @override
  Widget build(BuildContext context) {
    if (complaints.isEmpty) {
      return Center(
        child: Padding(
          padding: AppSpacing.pagePadding,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.verified_outlined,
                  size: 64, color: Theme.of(context).colorScheme.outline),
              AppSpacing.hMD,
              Text(
                context.tr('verification.empty.title'),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              AppSpacing.hSM,
              Text(
                context.tr('verification.empty.message'),
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async {},
      child: ListView.separated(
        padding: AppSpacing.pagePadding,
        itemCount: complaints.length,
        separatorBuilder: (_, _) => AppSpacing.hMD,
        itemBuilder: (context, i) {
          final c = complaints[i];
          return _VerifiableCard(
            complaint: c,
            onTap: () => _showDetailSheet(context, c),
          );
        },
      ),
    );
  }
}

class _VerifiableCard extends StatelessWidget {
  const _VerifiableCard({required this.complaint, required this.onTap});

  final VerifiableComplaint complaint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final c = complaint;

    return Material(
      color: colors.surfaceContainer,
      borderRadius: AppRadius.rLG,
      child: InkWell(
        borderRadius: AppRadius.rLG,
        onTap: onTap,
        child: Padding(
          padding: AppSpacing.cardPadding,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (c.categoryIcon != null)
                    Icon(CategoryIconHelper.iconFor(c.categoryIcon),
                        color: colors.primary, size: 32)
                  else
                    Icon(Icons.report_outlined, color: colors.primary),
                  AppSpacing.wMD,
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          c.title,
                          style: theme.textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w600),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        AppSpacing.hXS,
                        Text(
                          [c.categoryName, c.formattedDate, c.distanceLabel]
                              .where((s) => s != null && s.isNotEmpty)
                              .join(' • '),
                          style: theme.textTheme.labelSmall
                              ?.copyWith(color: colors.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              AppSpacing.hMD,
              Row(
                children: [
                  Expanded(
                    child: _ImageThumb(
                      url: c.beforeImageUrl,
                      label: context.tr('verification.before'),
                      tint: const Color(0xFF616161),
                    ),
                  ),
                  AppSpacing.wMD,
                  Expanded(
                    child: _ImageThumb(
                      url: c.afterImageUrl,
                      label: context.tr('verification.after'),
                      tint: AppColors.resolved,
                    ),
                  ),
                ],
              ),
              AppSpacing.hMD,
              Row(
                children: [
                  _CountChip(
                    icon: Icons.check_circle_outline,
                    count: c.verifiedCount,
                    label: context.tr('verification.confirmed'),
                    color: AppColors.resolved,
                  ),
                  AppSpacing.wMD,
                  _CountChip(
                    icon: Icons.cancel_outlined,
                    count: c.rejectedCount,
                    label: context.tr('verification.disputed'),
                    color: AppColors.rejected,
                  ),
                  const Spacer(),
                  if (c.hasVerified)
                    Chip(
                      label: Text(context.tr('verification.responded')),
                      labelStyle: theme.textTheme.labelSmall,
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    )
                  else
                    Text(
                      context.tr('verification.tapToVerify'),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: colors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ImageThumb extends StatelessWidget {
  const _ImageThumb({required this.url, required this.label, required this.tint});

  final String? url;
  final String label;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: AppRadius.rMD,
          child: AspectRatio(
            aspectRatio: 1.4,
            child: url != null
                ? Image.network(url!, fit: BoxFit.cover)
                : Container(
                    color: colors.surfaceContainerHighest,
                    child: Icon(Icons.image_outlined,
                        color: colors.outline, size: 32),
                  ),
          ),
        ),
        AppSpacing.hXS,
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: tint,
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}

class _CountChip extends StatelessWidget {
  const _CountChip({
    required this.icon,
    required this.count,
    required this.label,
    required this.color,
  });

  final IconData icon;
  final int count;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: color),
        AppSpacing.wXS,
        Text('$count $label', style: theme.textTheme.labelSmall),
      ],
    );
  }
}

void _showDetailSheet(BuildContext context, VerifiableComplaint complaint) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => _VerificationDetailSheet(complaint: complaint),
  );
}

class _VerificationDetailSheet extends ConsumerStatefulWidget {
  const _VerificationDetailSheet({required this.complaint});

  final VerifiableComplaint complaint;

  @override
  ConsumerState<_VerificationDetailSheet> createState() =>
      _VerificationDetailSheetState();
}

class _VerificationDetailSheetState
    extends ConsumerState<_VerificationDetailSheet> {
  final _commentController = TextEditingController();
  final _uploadedUrls = <String>[];
  final _uploadedPaths = <String>[];
  bool _submitting = false;
  bool _uploading = false;

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _pickAndUploadPhotos() async {
    if (_uploading) return;
    try {
      final picker = ImagePicker();
      final files = await picker.pickMultiImage(
        imageQuality: 70,
        maxWidth: 1920,
        maxHeight: 1080,
      );
      if (files.isEmpty || !mounted) return;

      setState(() => _uploading = true);

      final userId = ref.read(authRepositoryProvider).currentUserId;
      if (userId == null) {
        if (mounted) _showSnack(context.tr('report.error.notSignedIn'));
        return;
      }

      final storage = ref.read(storageRepositoryProvider);

      for (final file in files) {
        if (!StorageRepository.isImageFile(file)) continue;
        if (!await StorageRepository.isWithinSizeLimit(file)) continue;
        final result = await storage.uploadImage(file, userId);
        if (result.isSuccess && result.dataOrNull != null) {
          _uploadedUrls.add(result.dataOrNull!.url);
          _uploadedPaths.add(result.dataOrNull!.path);
        }
      }

      if (mounted) setState(() => _uploading = false);
    } on Exception catch (e) {
      if (mounted) {
        setState(() => _uploading = false);
        _showSnack(e.toString());
      }
    }
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _submit(bool verified) async {
    if (_submitting) return;
    if (_uploadedUrls.isEmpty) {
      _showSnack(context.tr('verification.photoRequired'));
      return;
    }
    setState(() => _submitting = true);
    final repo = ref.read(verificationRepositoryProvider);
    final result = await repo.submitCommunityVerification(
      complaintId: widget.complaint.id,
      verified: verified,
      comment: _commentController.text.trim().isEmpty
          ? null
          : _commentController.text.trim(),
      imageUrls: _uploadedUrls,
      imagePaths: _uploadedPaths,
    );
    if (!mounted) return;
    result.when(
      success: (_) {
        ref.invalidate(verifiableComplaintsProvider);
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(verified
                ? context.tr('verification.markedConfirmed')
                : context.tr('verification.markedDisputed')),
          ),
        );
      },
      failure: (failure) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.translate(failure.message))),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final c = widget.complaint;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.xl,
        0,
        AppSpacing.xl,
        AppSpacing.xl +
            MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            c.title,
            style: theme.textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w600),
          ),
          AppSpacing.hXS,
          Text(
            [c.categoryName, c.address, c.distanceLabel]
                .where((s) => s != null && s.isNotEmpty)
                .join(' • '),
            style: theme.textTheme.bodySmall?.copyWith(
              color: colors.onSurfaceVariant,
            ),
          ),
          AppSpacing.hLG,
          Row(
            children: [
              Expanded(
                child: _DetailImage(
                  url: c.beforeImageUrl,
                  label: context.tr('verification.beforeOriginal'),
                  tint: const Color(0xFF616161),
                ),
              ),
              AppSpacing.wMD,
              Expanded(
                child: _DetailImage(
                  url: c.afterImageUrl,
                  label: context.tr('verification.afterResolution'),
                  tint: AppColors.resolved,
                ),
              ),
            ],
          ),
          AppSpacing.hLG,
          if (c.hasVerified)
            Container(
              width: double.infinity,
              padding: AppSpacing.cardPadding,
              decoration: BoxDecoration(
                color: colors.surfaceContainerHighest,
                borderRadius: AppRadius.rMD,
              ),
              child: Text(
                context.tr('verification.alreadyResponded'),
                style: theme.textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            )
          else ...[
            TextField(
              controller: _commentController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: context.tr('verification.commentLabel'),
                hintText: context.tr('verification.commentHint'),
                border: const OutlineInputBorder(),
              ),
            ),
            AppSpacing.hLG,
            Row(
              children: [
                Text(
                  context.tr('verification.yourPhotos'),
                  style: theme.textTheme.labelLarge,
                ),
                const Spacer(),
                Text(
                  context.tr('verification.photosRequired'),
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: _uploadedUrls.isEmpty ? colors.error : colors.outline,
                  ),
                ),
              ],
            ),
            AppSpacing.hSM,
            SizedBox(
              height: 100,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  ..._uploadedUrls.map((url) => Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ClipRRect(
                      borderRadius: AppRadius.rMD,
                      child: Image.network(url, width: 100, height: 100, fit: BoxFit.cover),
                    ),
                  )),
                  GestureDetector(
                    onTap: _uploading ? null : _pickAndUploadPhotos,
                    child: Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        border: Border.all(color: colors.outline),
                        borderRadius: AppRadius.rMD,
                      ),
                      child: _uploading
                          ? const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)))
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.add_a_photo_outlined, color: colors.primary, size: 28),
                                AppSpacing.hXS,
                                Text(
                                  context.tr('verification.addVerificationPhoto'),
                                  style: theme.textTheme.labelSmall?.copyWith(color: colors.primary),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),
            AppSpacing.hLG,
            Row(
              children: [
                Expanded(
                  child: FilledButton.tonalIcon(
                    onPressed: (_submitting || _uploadedUrls.isEmpty) ? null : () => _submit(false),
                    icon: const Icon(Icons.cancel_outlined),
                    label: Text(context.tr('verification.dispute')),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.rejected.withValues(alpha: 0.12),
                      foregroundColor: AppColors.rejected,
                    ),
                  ),
                ),
                AppSpacing.wMD,
                Expanded(
                  child: FilledButton.icon(
                    onPressed: (_submitting || _uploadedUrls.isEmpty) ? null : () => _submit(true),
                    icon: _submitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.check_circle_outline),
                    label: Text(context.tr('verification.confirm')),
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

class _DetailImage extends StatelessWidget {
  const _DetailImage({required this.url, required this.label, required this.tint});

  final String? url;
  final String label;
  final Color tint;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        ClipRRect(
          borderRadius: AppRadius.rMD,
          child: AspectRatio(
            aspectRatio: 1,
            child: url != null
                ? Image.network(url!, fit: BoxFit.cover)
                : Container(
                    color: colors.surfaceContainerHighest,
                    child: Icon(Icons.image_outlined,
                        color: colors.outline, size: 36),
                  ),
          ),
        ),
        AppSpacing.hSM,
        Text(
          label,
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: tint,
                fontWeight: FontWeight.w600,
              ),
        ),
      ],
    );
  }
}
