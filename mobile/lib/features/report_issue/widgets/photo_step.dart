import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/i18n/app_localizations.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/section_header.dart';
import '../../../core/widgets/xfile_image.dart';
import '../../../data/models/photo_upload.dart';
import '../report_issue_provider.dart';

/// Step 2 — Photo capture and upload.
///
/// Supports **camera** and **gallery**, multiple images (up to
/// [AppConstants.maxComplaintPhotos]), per-image upload status
/// (Uploading / Uploaded / Failed), retry on failure, and file validation
/// (type + size). Uploads happen immediately on selection so the user sees
/// progress before reaching the review step. Storage paths are never shown
/// to the user.
class PhotoStep extends ConsumerWidget {
  const PhotoStep({super.key});

  Future<void> _pickImage(
    BuildContext context,
    WidgetRef ref,
    ImageSource source,
  ) async {
    try {
      final picker = ImagePicker();
      final image = await picker.pickImage(
        source: source,
        imageQuality: 70,
        maxWidth: 1920,
        maxHeight: 1080,
      );
      if (image != null && context.mounted) {
        await ref.read(reportIssueProvider.notifier).addPhotos([image]);
      }
    } on Exception catch (e) {
      if (context.mounted) {
        _showError(
          context,
          context.tr(
            source == ImageSource.camera
                ? 'report.photo.cameraError'
                : 'report.photo.galleryError',
            args: {'error': e.toString()},
          ),
        );
      }
    }
  }

  void _showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final photos = ref.watch(reportIssueProvider.select((s) => s.photos));
    final minImages =
        ref.watch(reportIssueProvider.select((s) => s.categoryMinImages));
    final theme = Theme.of(context);
    final colors = theme.colorScheme;
    final l = context.tr;
    final canAddMore = photos.length < AppConstants.maxComplaintPhotos;
    final hasFailures = photos.any((p) => p.isFailed);
    final effectiveMin = minImages > 0 ? minImages : 3;
    final belowMin = photos.length < effectiveMin;

    return SingleChildScrollView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(
          title: l('report.photo.title'),
          subtitle: l('report.photo.subtitle'),
        ),
        AppSpacing.hLG,

        // --- Photos required hint (always shown — photos are compulsory) ---
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: colors.primaryContainer.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: colors.primary.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.photo_library_outlined,
                  size: 18, color: colors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  l('ai.minPhotosHint', args: {'min': effectiveMin}),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: colors.onPrimaryContainer,
                  ),
                ),
              ),
            ],
          ),
        ),
        AppSpacing.hSM,

        // --- Camera + Gallery buttons ---
        Row(
          children: [
            Expanded(
              child: FilledButton.tonalIcon(
                onPressed: canAddMore
                    ? () => _pickImage(context, ref, ImageSource.camera)
                    : null,
                icon: const Icon(Icons.camera_alt_outlined),
                label: Text(l('report.photo.camera')),
              ),
            ),
            AppSpacing.wMD,
            Expanded(
              child: FilledButton.tonalIcon(
                onPressed: canAddMore
                    ? () => _pickImage(context, ref, ImageSource.gallery)
                    : null,
                icon: const Icon(Icons.photo_library_outlined),
                label: Text(l('report.photo.gallery')),
              ),
            ),
          ],
        ),

        // --- Count indicator ---
        if (photos.isNotEmpty) ...[
          AppSpacing.hSM,
          Text(
            l('report.photo.count', args: {
              'current': photos.length,
              'max': AppConstants.maxComplaintPhotos,
            }),
            style: theme.textTheme.bodySmall?.copyWith(
              color: belowMin ? colors.error : colors.onSurfaceVariant,
            ),
          ),
        ],

        // --- Below minimum warning ---
        if (belowMin) ...[
          AppSpacing.hSM,
          Text(
            l('ai.minPhotosRequired', args: {'min': effectiveMin}),
            style: theme.textTheme.bodySmall?.copyWith(
              color: colors.error,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],

        // --- Failed uploads banner ---
        if (hasFailures) ...[
          AppSpacing.hSM,
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: colors.errorContainer.withValues(alpha: 0.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Icon(Icons.warning_amber_rounded,
                    size: 16, color: colors.error),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    l('report.photo.someFailed'),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: colors.onErrorContainer,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],

        AppSpacing.hLG,

        // --- Image grid or empty placeholder ---
        if (photos.isEmpty)
          _EmptyPhotoPlaceholder()
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
              itemCount: photos.length,
              itemBuilder: (context, index) {
                return _PhotoTile(
                  photo: photos[index],
                  onDelete: () => ref
                      .read(reportIssueProvider.notifier)
                      .removePhoto(index),
                  onRetry: () => ref
                      .read(reportIssueProvider.notifier)
                      .retryUpload(index),
                );
              },
            ),
          // Bottom padding for safe scrolling
          SizedBox(height: MediaQuery.viewPaddingOf(context).bottom + 8),
        ],
      ),
    );
  }
}

class _EmptyPhotoPlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: colors.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: colors.outline.withValues(alpha: 0.3),
          strokeAlign: BorderSide.strokeAlignOutside,
        ),
      ),
      child: Column(
        children: [
          Icon(Icons.add_a_photo_outlined,
              size: 48, color: colors.onSurfaceVariant),
          const SizedBox(height: 12),
          Text(
            context.tr('report.photo.noneYet'),
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: 4),
          Text(
            context.tr('report.photo.noneHint'),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colors.onSurfaceVariant,
                ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

/// A single photo tile showing the image preview, upload status overlay,
/// delete button, and retry button (when failed).
class _PhotoTile extends StatelessWidget {
  const _PhotoTile({
    required this.photo,
    required this.onDelete,
    required this.onRetry,
  });

  final PhotoUpload photo;
  final VoidCallback onDelete;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Image preview
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: XFileImage(
            file: photo.file,
            width: double.infinity,
            height: double.infinity,
          ),
        ),

        // Status overlay
        Positioned.fill(
          child: _StatusOverlay(photo: photo),
        ),

        // Delete button (top-right, always visible)
        Positioned(
          top: 4,
          right: 4,
          child: GestureDetector(
            onTap: onDelete,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.6),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, color: Colors.white, size: 16),
            ),
          ),
        ),

        // Retry button (bottom-center, only when failed)
        if (photo.isFailed)
          Positioned(
            bottom: 4,
            left: 0,
            right: 0,
            child: Center(
              child: GestureDetector(
                onTap: onRetry,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.7),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.refresh_rounded,
                          color: Colors.white, size: 14),
                      const SizedBox(width: 4),
                      Text(
                        context.tr('report.photo.retry'),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Overlay showing the upload status: progress bar while uploading, a
/// checkmark when uploaded, an error tint when failed, and a dim background
/// for rejected files.
class _StatusOverlay extends StatelessWidget {
  const _StatusOverlay({required this.photo});

  final PhotoUpload photo;

  @override
  Widget build(BuildContext context) {
    switch (photo.status) {
      case PhotoUploadStatus.uploading:
        return Container(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '${(photo.progress * 100).round()}%',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
              ),
            ],
          ),
        );

      case PhotoUploadStatus.uploaded:
        return Positioned(
          bottom: 4,
          left: 4,
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.green,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check, color: Colors.white, size: 14),
          ),
        );

      case PhotoUploadStatus.failed:
        return Container(
          decoration: BoxDecoration(
            color: Colors.red.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(12),
          ),
        );

      case PhotoUploadStatus.rejected:
        return Container(
          decoration: BoxDecoration(
            color: Colors.red.withValues(alpha: 0.25),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(6),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.block_rounded,
                      color: Colors.red.shade100, size: 20),
                  const SizedBox(height: 4),
                  Text(
                    photo.error ?? AppLocalizations.translate('report.photo.rejected'),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Colors.white,
                          fontSize: 9,
                        ),
                  ),
                ],
              ),
            ),
          ),
        );

      case PhotoUploadStatus.pending:
        return Positioned(
          bottom: 4,
          left: 4,
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.6),
              shape: BoxShape.circle,
            ),
            child: const SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            ),
          ),
        );
    }
  }
}
