import '../../core/i18n/app_localizations.dart';
import '../../data/models/category.dart';
import '../../data/models/complaint.dart';
import '../../data/models/complaint_severity.dart';
import '../../data/models/geo_point.dart';
import '../../data/models/photo_upload.dart';
import '../../data/models/similar_complaint.dart';

/// Immutable state for the multi-step Report Issue flow.
class ReportIssueState {
  const ReportIssueState({
    this.category,
    this.photos = const [],
    this.location,
    this.address,
    this.title = '',
    this.description = '',
    this.severity = ComplaintSeverity.medium,
    this.currentStep = 0,
    this.isSubmitting = false,
    this.errorMessage,
    this.submittedComplaint,
    this.similarComplaints = const [],
    this.isCheckingSimilar = false,
    this.hasCheckedSimilar = false,
    this.selectedMatch,
    this.idempotencyKey,
    this.categoryMinImages = 0,
    this.categoryRequiresImages = false,
  });

  final Category? category;

  /// Minimum number of photos the selected category requires (from
  /// `category_ai_config.min_images`). `0` when the category has no AI
  /// config or does not require images.
  final int categoryMinImages;

  /// Whether the selected category requires photos at all (from
  /// `category_ai_config.requires_images`).
  final bool categoryRequiresImages;

  /// Photos tracked through the upload lifecycle (pending → uploading →
  /// uploaded / failed). Replaces the old raw `List<XFile>`.
  final List<PhotoUpload> photos;

  final GeoPoint? location;
  final String? address;
  final String title;
  final String description;
  final ComplaintSeverity severity;
  final int currentStep;
  final bool isSubmitting;
  final String? errorMessage;
  final Complaint? submittedComplaint;

  /// Nearby reports of the same category found by `find_similar_complaints`.
  final List<SimilarComplaint> similarComplaints;
  final bool isCheckingSimilar;
  final bool hasCheckedSimilar;

  /// The nearby report the citizen chose to join (null = report a new,
  /// standalone issue). Drives whether [submit] joins an incident or not.
  final SimilarComplaint? selectedMatch;

  /// Client-generated idempotency key for the submission. Generated once
  /// on the first submit attempt and reused on retries so the backend
  /// returns the already-created complaint instead of a duplicate.
  final String? idempotencyKey;

  /// Convenience: photos that have been successfully uploaded.
  List<PhotoUpload> get uploadedPhotos =>
      photos.where((p) => p.isUploaded).toList();

  /// True when any photo is currently uploading.
  bool get isUploadingPhotos =>
      photos.any((p) => p.isUploading);

  /// True when any photo failed to upload.
  bool get hasFailedPhotos => photos.any((p) => p.isFailed);

  ReportIssueState copyWith({
    Category? category,
    List<PhotoUpload>? photos,
    GeoPoint? location,
    String? address,
    String? title,
    String? description,
    ComplaintSeverity? severity,
    int? currentStep,
    bool? isSubmitting,
    String? errorMessage,
    Complaint? submittedComplaint,
    List<SimilarComplaint>? similarComplaints,
    bool? isCheckingSimilar,
    bool? hasCheckedSimilar,
    SimilarComplaint? selectedMatch,
    String? idempotencyKey,
    int? categoryMinImages,
    bool? categoryRequiresImages,
    bool clearError = false,
    bool clearLocation = false,
    bool clearMatch = false,
    bool clearSimilar = false,
  }) {
    return ReportIssueState(
      category: category ?? this.category,
      photos: photos ?? this.photos,
      location: clearLocation ? null : (location ?? this.location),
      address: clearLocation ? null : (address ?? this.address),
      title: title ?? this.title,
      description: description ?? this.description,
      severity: severity ?? this.severity,
      currentStep: currentStep ?? this.currentStep,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      submittedComplaint: submittedComplaint ?? this.submittedComplaint,
      similarComplaints:
          clearSimilar ? const [] : (similarComplaints ?? this.similarComplaints),
      isCheckingSimilar: isCheckingSimilar ?? this.isCheckingSimilar,
      hasCheckedSimilar: hasCheckedSimilar ?? this.hasCheckedSimilar,
      selectedMatch: clearMatch ? null : (selectedMatch ?? this.selectedMatch),
      idempotencyKey: idempotencyKey ?? this.idempotencyKey,
      categoryMinImages: categoryMinImages ?? this.categoryMinImages,
      categoryRequiresImages:
          categoryRequiresImages ?? this.categoryRequiresImages,
    );
  }

  // --- Step validation --------------------------------------------------

  static const int totalSteps = 5;

  bool get canProceedFromStep1 => category != null;
  bool get canProceedFromStep2 => uploadedPhotos.length >= 3;
  bool get canProceedFromStep3 => location != null;
  bool get canProceedFromStep4 =>
      title.length >= 3 && title.length <= 200;
  bool get canSubmit =>
      canProceedFromStep1 && canProceedFromStep2 && canProceedFromStep3 && canProceedFromStep4;

  String? validateStep(int step) {
    switch (step) {
      case 0:
        return category == null ? AppLocalizations.translate('report.error.selectCategory') : null;
      case 1:
        if (uploadedPhotos.isEmpty) {
          return AppLocalizations.translate('report.error.photosRequired');
        }
        // Always require at least 3 photos from different angles, regardless
        // of category. The database enforces this for AI-verified categories;
        // this extends it to every category including "Other".
        if (uploadedPhotos.length < 3) {
          return AppLocalizations.translate('ai.minPhotosRequired',
              args: {'min': 3});
        }
        if (categoryRequiresImages && photos.length < categoryMinImages) {
          return AppLocalizations.translate('ai.minPhotosRequired',
              args: {'min': categoryMinImages});
        }
        return null;
      case 2:
        return location == null ? AppLocalizations.translate('report.error.captureLocation') : null;
      case 3:
        if (title.isEmpty) return AppLocalizations.translate('report.error.titleRequired');
        if (title.length < 3) return AppLocalizations.translate('report.error.titleTooShort');
        if (title.length > 200) return AppLocalizations.translate('report.error.titleTooLong');
        return null;
      default:
        return null;
    }
  }
}
