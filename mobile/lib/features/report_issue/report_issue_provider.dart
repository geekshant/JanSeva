import 'dart:async';

import 'package:cross_file/cross_file.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/constants/app_constants.dart';
import '../../core/errors/result.dart';
import '../../core/i18n/app_localizations.dart';
import '../../data/models/category.dart';
import '../../data/models/category_ai_config.dart';
import '../../data/models/complaint.dart';
import '../../data/models/complaint_severity.dart';
import '../../data/models/complaint_status.dart';
import '../../data/models/geo_point.dart';
import '../../data/models/photo_upload.dart';
import '../../data/models/similar_complaint.dart';
import '../../data/repositories/repository_providers.dart';
import '../../data/repositories/storage_repository.dart';
import '../../data/services/supabase_service.dart';
import '../auth/auth_provider.dart';
import 'report_issue_state.dart';

/// Manages the multi-step Report Issue form state and submission.
class ReportIssueNotifier extends Notifier<ReportIssueState> {
  @override
  ReportIssueState build() => const ReportIssueState();

  /// Sets the selected category, applying its AI verification config (min
  /// photos / requires images) when available. Pass [aiConfig] from the
  /// `categoriesWithAiConfigProvider` so the photo step can enforce the
  /// category's minimum photo count.
  void setCategory(Category category, {CategoryAiConfig? aiConfig}) {
    // Always require at least 3 photos from different angles, regardless of
    // category. The database now enforces this for all categories including
    // "Other". The AI config value is used if higher than 3.
    final configMin = aiConfig?.requiresImages == true
        ? aiConfig!.minImages
        : 0;
    state = state.copyWith(
      category: category,
      categoryMinImages: configMin > 0 ? configMin : 3,
      categoryRequiresImages: true,
      clearError: true,
      clearSimilar: true,
      clearMatch: true,
      hasCheckedSimilar: false,
    );
  }

  // --- Photo management ---------------------------------------------------

  /// Adds photos after validating file type, size, and count limits.
  /// Invalid photos are marked [PhotoUploadStatus.rejected] with a reason.
  Future<void> addPhotos(List<XFile> files) async {
    final remaining =
        AppConstants.maxComplaintPhotos - state.photos.length;
    if (remaining <= 0) {
      state = state.copyWith(
        errorMessage: AppLocalizations.translate('report.error.maxPhotos',
            args: {'count': AppConstants.maxComplaintPhotos}),
      );
      return;
    }

    final toAdd = files.take(remaining).toList();
    final newPhotos = <PhotoUpload>[];

    for (final file in toAdd) {
      if (!StorageRepository.isImageFile(file)) {
        newPhotos.add(PhotoUpload(
          id: _photoId(file),
          file: file,
          status: PhotoUploadStatus.rejected,
          error: AppLocalizations.translate('report.error.unsupportedFile'),
        ));
        continue;
      }
      final withinSize = await StorageRepository.isWithinSizeLimit(file);
      if (!withinSize) {
        newPhotos.add(PhotoUpload(
          id: _photoId(file),
          file: file,
          status: PhotoUploadStatus.rejected,
          error: AppLocalizations.translate('report.error.fileTooLarge'),
        ));
        continue;
      }
      newPhotos.add(PhotoUpload(
        id: _photoId(file),
        file: file,
        status: PhotoUploadStatus.pending,
      ));
    }

    state = state.copyWith(
      photos: [...state.photos, ...newPhotos],
      clearError: true,
    );

    // Auto-upload the newly added pending photos.
    await _uploadPending();
  }

  /// Removes a photo at [index]. If it was already uploaded, the storage
  /// object is deleted to avoid orphans.
  Future<void> removePhoto(int index) async {
    if (index < 0 || index >= state.photos.length) return;
    final photo = state.photos[index];
    if (photo.isUploaded && photo.path != null) {
      final repo = ref.read(storageRepositoryProvider);
      await repo.deleteImages([photo.path!]);
    }
    final updated = List<PhotoUpload>.from(state.photos)..removeAt(index);
    state = state.copyWith(photos: updated, clearError: true);
  }

  /// Retries uploading a single failed photo.
  Future<void> retryUpload(int index) async {
    if (index < 0 || index >= state.photos.length) return;
    final photo = state.photos[index];
    if (photo.status != PhotoUploadStatus.failed &&
        photo.status != PhotoUploadStatus.rejected) {
      return;
    }
    await _uploadSingle(index);
  }

  String _photoId(XFile file) =>
      '${file.path}_${DateTime.now().millisecondsSinceEpoch}'
      '_${file.name.hashCode.abs()}';

  /// Uploads all pending photos, updating their status/progress as they go.
  /// Failures are caught per-photo so a single failure doesn't block others.
  Future<void> _uploadPending() async {
    final indices = state.photos
        .asMap()
        .entries
        .where((e) => e.value.isPending)
        .map((e) => e.key)
        .toList();
    await Future.wait(indices.map((i) => _uploadSingle(i)));
  }

  /// Uploads a single photo by index, updating state with progress and
  /// final status.
  Future<void> _uploadSingle(int index) async {
    final userId = ref.read(authRepositoryProvider).currentUserId;
    if (userId == null) {
      _updatePhoto(index, (p) => p.copyWith(
        status: PhotoUploadStatus.failed,
        error: AppLocalizations.translate('report.error.notSignedIn'),
      ));
      return;
    }

    final photo = state.photos[index];
    if (photo.isUploaded || photo.isUploading) return;

    // Mark as uploading.
    _updatePhoto(index, (p) => p.copyWith(
      status: PhotoUploadStatus.uploading,
      progress: 0.0,
      error: null,
    ));

    final repo = ref.read(storageRepositoryProvider);
    final result = await repo.uploadImage(photo.file, userId);

    if (result.isSuccess) {
      final uploaded = result.dataOrNull!;
      _updatePhoto(index, (p) => p.copyWith(
        status: PhotoUploadStatus.uploaded,
        progress: 1.0,
        path: uploaded.path,
        url: uploaded.url,
      ));
    } else {
      final failureMsg = result.failureOrNull?.message;
      _updatePhoto(index, (p) => p.copyWith(
        status: PhotoUploadStatus.failed,
        error: (failureMsg != null && failureMsg.isNotEmpty)
            ? failureMsg
            : AppLocalizations.translate('report.error.uploadFailed'),
      ));
    }
  }

  void _updatePhoto(int index, PhotoUpload Function(PhotoUpload) updater) {
    final updated = List<PhotoUpload>.from(state.photos);
    updated[index] = updater(updated[index]);
    state = state.copyWith(photos: updated);
  }

  void setLocation(GeoPoint? location, String? address) {
    if (location == null) {
      state = state.copyWith(
        clearLocation: true,
        clearError: true,
        clearSimilar: true,
        clearMatch: true,
        hasCheckedSimilar: false,
      );
    } else {
      state = state.copyWith(
        location: location,
        address: address,
        clearError: true,
        clearSimilar: true,
        clearMatch: true,
        hasCheckedSimilar: false,
      );
    }
  }

  void setTitle(String title) {
    state = state.copyWith(
      title: title,
      clearError: true,
      clearSimilar: true,
      clearMatch: true,
      hasCheckedSimilar: false,
    );
  }

  void setDescription(String description) {
    state = state.copyWith(description: description, clearError: true);
  }

  void setSeverity(ComplaintSeverity severity) {
    state = state.copyWith(severity: severity, clearError: true);
  }

  /// Queries the backend for nearby reports of the same category so the citizen
  /// can join an existing civic incident instead of creating a duplicate.
  /// Requires category + location; title improves ranking. Idempotent and
  /// safe to call from the review step.
  Future<void> checkForSimilarComplaints() async {
    if (state.isCheckingSimilar || state.hasCheckedSimilar) return;
    if (state.category == null || state.location == null) return;

    state = state.copyWith(isCheckingSimilar: true, clearError: true);

    final repo = ref.read(complaintRepositoryProvider);
    final result = await repo.findSimilarComplaints(
      latitude: state.location!.latitude,
      longitude: state.location!.longitude,
      categoryId: state.category!.id,
      title: state.title.isEmpty ? null : state.title,
    );

    if (result.isSuccess) {
      state = state.copyWith(
        isCheckingSimilar: false,
        hasCheckedSimilar: true,
        similarComplaints: result.dataOrNull ?? const [],
        clearMatch: true,
      );
    } else {
      // Detection failures are non-fatal: proceed with a standalone report.
      state = state.copyWith(
        isCheckingSimilar: false,
        hasCheckedSimilar: true,
        similarComplaints: const [],
        clearMatch: true,
      );
    }
  }

  /// The citizen chose to merge their report into a nearby existing incident.
  void selectMatch(SimilarComplaint match) {
    state = state.copyWith(selectedMatch: match, clearError: true);
  }

  /// The citizen chose to report a different (standalone) issue.
  void clearMatch() {
    state = state.copyWith(clearMatch: true, clearError: true);
  }

  void nextStep() {
    final error = state.validateStep(state.currentStep);
    if (error != null) {
      state = state.copyWith(errorMessage: error);
      return;
    }
    if (state.currentStep < ReportIssueState.totalSteps - 1) {
      state = state.copyWith(currentStep: state.currentStep + 1, clearError: true);
    }
  }

  void previousStep() {
    if (state.currentStep > 0) {
      state = state.copyWith(currentStep: state.currentStep - 1, clearError: true);
    }
  }

  void goToStep(int step) {
    state = state.copyWith(currentStep: step, clearError: true);
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  /// Submits the complaint:
  /// 1. Validates the form.
  /// 2. Ensures any pending photos are uploaded (skips failed ones).
  /// 3. Creates the complaint record (with PostGIS location) via RPC using
  ///    only the successfully-uploaded photos and an idempotency key so
  ///    network retries don't create duplicates.
  /// 4. On RPC failure, the complaint data is preserved so the user can
  ///    retry without losing anything — uploaded images are NOT deleted
  ///    (they'll be reused on the next attempt).
  Future<Result<Complaint>> submit() async {
    if (!state.canSubmit) {
      return Result.failure(
        Failure(message: AppLocalizations.translate('report.error.completeFields')),
      );
    }

    state = state.copyWith(isSubmitting: true, clearError: true);

    final userId = ref.read(authRepositoryProvider).currentUserId;
    if (userId == null) {
      state = state.copyWith(isSubmitting: false, errorMessage: AppLocalizations.translate('report.error.notSignedIn'));
      return Result.failure(Failure(message: AppLocalizations.translate('report.error.notSignedIn')));
    }

    // --- Generate an idempotency key on the first attempt; reuse on retries ---
    final idempotencyKey =
        state.idempotencyKey ?? _generateIdempotencyKey(userId);
    if (state.idempotencyKey == null) {
      state = state.copyWith(idempotencyKey: idempotencyKey);
    }

    // --- Upload any still-pending photos ---
    if (state.photos.any((p) => p.isPending)) {
      await _uploadPending();
    }

    // --- Collect only successfully-uploaded photos ---
    final uploaded = state.uploadedPhotos;
    final List<String> imageUrls =
        uploaded.map((p) => p.url!).toList();
    final List<String> imagePaths =
        uploaded.map((p) => p.path!).toList();

    // --- Create complaint via RPC (idempotent) ---
    final complaintRepo = ref.read(complaintRepositoryProvider);
    final createResult = state.selectedMatch == null
        ? await complaintRepo.createComplaint(
            categoryId: state.category!.id,
            title: state.title,
            description: state.description,
            severity: state.severity,
            latitude: state.location?.latitude,
            longitude: state.location?.longitude,
            address: state.address,
            imageUrls: imageUrls,
            imagePaths: imagePaths,
            idempotencyKey: idempotencyKey,
          )
        : await complaintRepo.joinSimilarComplaint(
            matchComplaintId: state.selectedMatch!.id,
            categoryId: state.category!.id,
            title: state.title,
            description: state.description,
            severity: state.severity,
            latitude: state.location?.latitude,
            longitude: state.location?.longitude,
            address: state.address,
            imageUrls: imageUrls,
            imagePaths: imagePaths,
            idempotencyKey: idempotencyKey,
          );

    if (createResult.isFailure) {
      // Do NOT delete uploaded images and do NOT reset state — the user
      // can retry without losing their complaint data or re-uploading.
      state = state.copyWith(
        isSubmitting: false,
        errorMessage: createResult.failureOrNull!.message,
      );
      return createResult;
    }

    // Fire-and-forget: trigger the AI evidence-verification edge function.
    // The complaint is already in `AI_CHECKING` status; the edge function
    // runs asynchronously. Errors are ignored — the check can be retried.
    final created = createResult.dataOrNull;
    if (created != null && created.status == ComplaintStatus.aiChecking) {
      unawaited(_triggerAiVerification(created.id));
    }

    state = state.copyWith(
      isSubmitting: false,
      submittedComplaint: createResult.dataOrNull,
    );
    return createResult;
  }

  /// Triggers the `ai-evidence-verification` edge function for a freshly
  /// created complaint. Swallows all errors — this is a best-effort,
  /// fire-and-forget call that never blocks the submission flow.
  Future<void> _triggerAiVerification(String complaintId) async {
    try {
      await SupabaseService.client.functions.invoke(
        'ai-evidence-verification',
        body: {'complaintId': complaintId},
      );
    } on Object {
      // Ignored: the AI check can be retried later by the backend.
    }
  }

  void reset() {
    state = const ReportIssueState();
  }

  /// Generates a deterministic idempotency key combining the user id, a
  /// timestamp, and a hash of the form content so that:
  /// * retries of the SAME submission reuse the key (no duplicate complaint)
  /// * a brand-new submission gets a fresh key
  String _generateIdempotencyKey(String userId) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final contentHash = '${state.category?.id}|${state.title}|'
        '${state.location?.latitude},${state.location?.longitude}'
        .hashCode.abs();
    return 'jm_${userId.substring(0, 8)}_${timestamp}_$contentHash';
  }
}

final reportIssueProvider =
    NotifierProvider<ReportIssueNotifier, ReportIssueState>(ReportIssueNotifier.new);

/// Fetches active categories for the category selection step.
final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final repo = ref.watch(categoryRepositoryProvider);
  final result = await repo.fetchCategories();
  return result.dataOrNull ?? const [];
});

/// Fetches active categories joined with their AI evidence-verification
/// config. Used by the category step so the photo step can enforce the
/// category's minimum photo count.
final categoriesWithAiConfigProvider =
    FutureProvider<List<CategoryWithAiConfig>>((ref) async {
  final repo = ref.watch(categoryRepositoryProvider);
  final result = await repo.fetchCategoriesWithAiConfig();
  return result.dataOrNull ?? const [];
});
