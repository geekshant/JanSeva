import 'package:cross_file/cross_file.dart';

/// The lifecycle status of a photo being uploaded to Supabase Storage.
enum PhotoUploadStatus {
  /// The file has been picked but not yet uploaded.
  pending,

  /// The file is currently uploading.
  uploading,

  /// The upload completed successfully.
  uploaded,

  /// The upload failed and can be retried.
  failed,

  /// The photo was rejected by validation (wrong type, too large).
  rejected,
}

/// Tracks a single photo through the upload lifecycle.
///
/// Holds the local [XFile] for preview, the upload [status], an optional
/// [progress] value (0.0–1.0), and — once uploaded — the storage [path]
/// and [url] returned by Supabase Storage. [error] carries a user-friendly
/// message when the status is [PhotoUploadStatus.failed] or `.rejected`.
class PhotoUpload {
  const PhotoUpload({
    required this.id,
    required this.file,
    this.status = PhotoUploadStatus.pending,
    this.progress = 0.0,
    this.path,
    this.url,
    this.error,
  });

  final String id;
  final XFile file;
  final PhotoUploadStatus status;
  final double progress;
  final String? path;
  final String? url;
  final String? error;

  bool get isUploaded => status == PhotoUploadStatus.uploaded;
  bool get isFailed => status == PhotoUploadStatus.failed;
  bool get isUploading => status == PhotoUploadStatus.uploading;
  bool get isPending => status == PhotoUploadStatus.pending;

  PhotoUpload copyWith({
    PhotoUploadStatus? status,
    double? progress,
    String? path,
    String? url,
    String? error,
  }) {
    return PhotoUpload(
      id: id,
      file: file,
      status: status ?? this.status,
      progress: progress ?? this.progress,
      path: path ?? this.path,
      url: url ?? this.url,
      error: error,
    );
  }
}
