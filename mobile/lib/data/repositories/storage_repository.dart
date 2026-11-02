import 'dart:math';

import 'package:cross_file/cross_file.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/constants/app_constants.dart';
import '../services/supabase_service.dart';
import '../../core/errors/result.dart';

/// Metadata for an uploaded image: the storage path (for cleanup) and the
/// public URL (for display and complaint_images records).
class UploadedImage {
  const UploadedImage({required this.path, required this.url});

  final String path;
  final String url;
}

/// Uploads and manages complaint images in Supabase Storage.
///
/// No storage credentials are exposed — uploads use the authenticated
/// Supabase client, and public read access is controlled by storage policies.
class StorageRepository {
  StorageRepository();

  SupabaseClient get _client => SupabaseService.client;

  /// Allowed image file extensions.
  static const allowedExtensions = {'jpg', 'jpeg', 'png', 'webp'};

  /// Validates that the file is an image by extension.
  static bool isImageFile(XFile file) {
    final ext = file.name.split('.').last.toLowerCase();
    return allowedExtensions.contains(ext);
  }

  /// Validates the file size is within the allowed limit.
  static Future<bool> isWithinSizeLimit(XFile file) async {
    final length = await file.length();
    return length <= AppConstants.maxPhotoBytes;
  }

  /// Generates short-lived signed URLs for private-bucket objects.
  ///
  /// The `complaint_images` bucket is private, so public URLs are not
  /// usable for display. This maps each storage [paths] entry to a signed
  /// URL valid for [expiresIn] seconds. Failures for individual paths are
  /// skipped so a single bad path never blocks the whole batch.
  Future<Map<String, String>> signedUrls(
    String bucket,
    List<String> paths, {
    int expiresIn = 3600,
  }) async {
    final result = <String, String>{};
    if (paths.isEmpty) return result;
    final urls = await Future.wait(
      paths.map((p) async {
        try {
          return await _client.storage.from(bucket).createSignedUrl(p, expiresIn);
        } on Exception {
          return '';
        }
      }),
    );
    for (var i = 0; i < paths.length; i++) {
      final url = urls[i];
      if (url.isNotEmpty) result[paths[i]] = url;
    }
    return result;
  }

  /// Uploads a single image to the complaint_images bucket.
  ///
  /// The path is scoped to the user's auth id so RLS policies can manage
  /// deletion. Returns the storage path (for cleanup) and the public URL.
  Future<Result<UploadedImage>> uploadImage(XFile file, String userId) {
    return _uploadToBucket(AppConstants.complaintImagesBucket, file, userId);
  }

  /// Uploads a profile photo to the public `avatars` bucket.
  ///
  /// Path is `<authUid>/avatar_<timestamp>_<random>.<ext>` so storage RLS
  /// can enforce owner-only writes. Returns the storage path and public URL.
  Future<Result<UploadedImage>> uploadAvatar(
    XFile file,
    String userId, {
    String prefix = 'avatar',
  }) {
    return _uploadToBucket(
      AppConstants.avatarsBucket,
      file,
      userId,
      prefix: prefix,
    );
  }

  Future<Result<UploadedImage>> _uploadToBucket(
    String bucket,
    XFile file,
    String userId, {
    String prefix = '',
  }) async {
    try {
      final bytes = await file.readAsBytes();
      final ext = file.name.split('.').last.toLowerCase();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final random = Random().nextInt(1000000);
      final namePart = prefix.isEmpty ? '$timestamp' : '${prefix}_$timestamp';
      final path = '$userId/${namePart}_$random.$ext';
      final contentType = file.mimeType ?? 'image/jpeg';

      await _client.storage
          .from(bucket)
          .uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(contentType: contentType),
          );

      final url = _client.storage.from(bucket).getPublicUrl(path);

      return Result.success(UploadedImage(path: path, url: url));
    } on StorageException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Deletes uploaded images by their storage paths.
  /// Used to clean up orphaned files if complaint creation fails.
  Future<Result<void>> deleteImages(List<String> paths) async {
    if (paths.isEmpty) return Result.success(null);
    try {
      await _client.storage
          .from(AppConstants.complaintImagesBucket)
          .remove(paths);
      return Result.success(null);
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Best-effort removal of a previously uploaded avatar file.
  ///
  /// Accepts either a storage path or a public URL for the `avatars` bucket;
  /// silently succeeds when the input cannot be resolved to a path.
  Future<Result<void>> deleteAvatar(String pathOrUrl) async {
    final path =
        _storagePathFromUrl(pathOrUrl, AppConstants.avatarsBucket) ??
        (pathOrUrl.contains('/') && !pathOrUrl.contains('http')
            ? pathOrUrl
            : null);
    if (path == null) return Result.success(null);
    try {
      await _client.storage.from(AppConstants.avatarsBucket).remove([path]);
      return Result.success(null);
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Extracts the object path from a Supabase public URL for [bucket],
  /// e.g. `.../object/public/avatars/<uid>/a.jpg` -> `<uid>/a.jpg`.
  static String? _storagePathFromUrl(String url, String bucket) {
    final marker = '/object/public/$bucket/';
    final index = url.indexOf(marker);
    if (index < 0) return null;
    final raw = url.substring(index + marker.length);
    final query = raw.indexOf('?');
    return Uri.decodeComponent(query < 0 ? raw : raw.substring(0, query));
  }
}
