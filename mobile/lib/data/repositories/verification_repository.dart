import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/constants/app_constants.dart';
import '../services/supabase_service.dart';
import '../../core/errors/result.dart';
import '../models/verifiable_complaint.dart';
import '../models/verification_summary.dart';
import 'storage_repository.dart';

/// Community verification: citizens confirm or dispute the resolution of
/// nearby complaints. Backed by two SECURITY DEFINER RPCs:
///   - `verifiable_complaints` (discovery, privacy-safe projection)
///   - `submit_community_verification` (atomic response + updated summary)
///
/// The `complaint_images` storage bucket is private, so before/after image
/// `storage_path`s are signed into short-lived URLs before display.
class VerificationRepository {
  VerificationRepository();
  StorageRepository get _storage => StorageRepository();
  SupabaseClient get _client => SupabaseService.client;

  /// Fetches nearby resolved complaints awaiting community verification.
  /// Signs the before/after image storage paths into display URLs and injects
  /// them as `before_image_url` / `after_image_url` before parsing.
  Future<Result<List<VerifiableComplaint>>> fetchVerifiableComplaints({
    required double latitude,
    required double longitude,
    int radiusMeters = 2000,
    int limit = 50,
  }) async {
    try {
      final data = await _client.rpc(
        'verifiable_complaints',
        params: {
          'p_latitude': latitude,
          'p_longitude': longitude,
          'p_radius_meters': radiusMeters,
          'p_limit': limit,
        },
      );
      final rows = (data as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
      await _attachSignedImages(rows);

      final complaints =
          rows.map((e) => VerifiableComplaint.fromJson(e)).toList();
      return Result.success(complaints);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Submits a citizen's verification response. Returns the updated summary.
  /// Requires at least one verification photo (p_image_urls / p_image_paths).
  Future<Result<VerificationSummary>> submitCommunityVerification({
    required String complaintId,
    required bool verified,
    String? comment,
    required List<String> imageUrls,
    required List<String> imagePaths,
  }) async {
    try {
      final data = await _client.rpc(
        'submit_community_verification',
        params: {
          'p_complaint_id': complaintId,
          'p_verified': verified,
          'p_comment': comment,
          'p_image_urls': imageUrls,
          'p_image_paths': imagePaths,
        },
      );
      return Result.success(
        VerificationSummary.fromJson(data as Map<String, dynamic>),
      );
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Signs before/after image storage paths and injects the signed URLs as
  /// `before_image_url` / `after_image_url` so [VerifiableComplaint.fromJson]
  /// can pick them up. Mirrors the pattern in [ComplaintRepository].
  Future<void> _attachSignedImages(List<Map<String, dynamic>> rows) async {
    final paths = <String>[];
    for (final row in rows) {
      final before = row['before_image_path'];
      final after = row['after_image_path'];
      if (before is String) paths.add(before);
      if (after is String && after != before) paths.add(after);
    }
    if (paths.isEmpty) return;
    final signed =
        await _storage.signedUrls(AppConstants.complaintImagesBucket, paths);
    for (final row in rows) {
      final before = row['before_image_path'];
      final after = row['after_image_path'];
      if (before is String && signed[before] != null) {
        row['before_image_url'] = signed[before];
      }
      if (after is String && signed[after] != null) {
        row['after_image_url'] = signed[after];
      }
    }
  }
}
