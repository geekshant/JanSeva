import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/constants/app_constants.dart';
import '../services/supabase_service.dart';
import '../../core/errors/result.dart';
import '../models/complaint.dart';
import '../models/complaint_severity.dart';
import '../models/nearby_complaint.dart';
import '../models/similar_complaint.dart';
import '../models/status_history.dart';
import 'storage_repository.dart';

/// Maps a network/OS-level exception to a user-friendly i18n key.
///
/// DNS failures, connection refused, and timeouts all produce different
/// exception types but the citizen just needs to know "check your internet".
/// Returns `null` when the exception is NOT a network error (so the caller
/// can fall through to the generic handler).
String? _networkErrorMessage(Exception e) {
  final msg = e.toString().toLowerCase();
  if (e is SocketException) {
    return 'error.network.connection';
  }
  // Supabase/http package wraps network errors in generic Exception with
  // a message that contains the underlying SocketException text.
  if (msg.contains('failed host lookup') ||
      msg.contains('no address associated with hostname') ||
      msg.contains('connection refused') ||
      msg.contains('connection timed out') ||
      msg.contains('network is unreachable') ||
      msg.contains('software caused connection abort') ||
      msg.contains('connection reset') ||
      msg.contains('socketexception')) {
    return 'error.network.connection';
  }
  return null;
}

/// Aggregate community-wide complaint counts (privacy-safe: no individual
/// rows are exposed). Populated by the `community_complaint_stats` RPC.
class CommunityStats {
  const CommunityStats({
    this.nearbyIssues = 0,
    this.resolvedIssues = 0,
    this.inProgressIssues = 0,
    this.pendingIssues = 0,
  });

  final int nearbyIssues;
  final int resolvedIssues;
  final int inProgressIssues;
  final int pendingIssues;
}

/// Full complaint detail: the complaint itself + all images (with signed
/// URLs), status history entries, and resolution evidence photos.
class ComplaintDetail {
  const ComplaintDetail({
    required this.complaint,
    this.images = const [],
    this.statusHistory = const [],
    this.resolutionEvidence = const [],
  });

  final Complaint complaint;
  final List<ComplaintImageWithUrl> images;
  final List<StatusHistoryEntry> statusHistory;
  final List<ResolutionEvidence> resolutionEvidence;
}

/// A complaint image with a signed URL ready for display.
class ComplaintImageWithUrl {
  const ComplaintImageWithUrl({
    required this.id,
    required this.url,
    this.storagePath,
    this.roundNumber = 1,
  });
  final String id;
  final String url;
  final String? storagePath;

  /// Evidence round: 1 = original photos submitted with the complaint,
  /// 2+ = additional photos uploaded after an officer requested more evidence.
  final int roundNumber;

  /// Whether this image is part of the original evidence (round 1).
  bool get isOriginal => roundNumber <= 1;
}

/// Fetches complaint data (the user's own + community snapshot counts).
///
/// RLS policies enforce that citizens only read their own complaints for
/// detail, while community-wide aggregate counts are served by the
/// `community_complaint_stats` SECURITY DEFINER RPC (which returns counts
/// only — never individual rows).
class ComplaintRepository {
  ComplaintRepository();

  SupabaseClient get _client => SupabaseService.client;
  final StorageRepository _storage = StorageRepository();

  /// The user's most recent complaints, with nested category + first image.
  Future<Result<List<Complaint>>> fetchRecentComplaints({
    required String profileId,
    int limit = 5,
  }) async {
    try {
      final data = await _client
          .from('complaints')
          .select('*, categories(*), complaint_images(storage_path), civic_incidents(*), departments(id, name, code), officers(id, title, ward, profiles(id, name))')
          .eq('user_id', profileId)
          .order('created_at', ascending: false)
          .limit(limit);

      final rows = (data as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
      await _attachSignedThumbnails(rows);

      final complaints = rows.map((e) => Complaint.fromJson(e)).toList();
      return Result.success(complaints);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Total count of complaints filed by the user.
  Future<Result<int>> fetchReportsCount(String profileId) async {
    try {
      final count = await _client
          .from('complaints')
          .count(CountOption.exact)
          .eq('user_id', profileId);
      return Result.success(count);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Community-wide aggregate complaint counts, served by the
  /// `community_complaint_stats` SECURITY DEFINER RPC. Returns counts only
  /// (no individual rows) so community statistics don't require a broad
  /// SELECT policy on the complaints table.
  Future<Result<CommunityStats>> fetchCommunityStats() async {
    try {
      final data = await _client.rpc('community_complaint_stats');
      final map = data as Map<String, dynamic>;
      return Result.success(CommunityStats(
        nearbyIssues: (map['with_location'] as num?)?.toInt() ?? 0,
        resolvedIssues: (map['resolved'] as num?)?.toInt() ?? 0,
        inProgressIssues: (map['in_progress'] as num?)?.toInt() ?? 0,
        pendingIssues: (map['pending'] as num?)?.toInt() ?? 0,
      ));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Count of the given user's complaints matching a single status.
  ///
  /// Scoped to [profileId] so Profile statistics only reflect the citizen's
  /// own work (community-wide counts come from [fetchCommunityStats]).
  Future<Result<int>> fetchUserCountByStatus({
    required String profileId,
    required String statusLabel,
  }) async {
    try {
      final count = await _client
          .from('complaints')
          .count(CountOption.exact)
          .eq('user_id', profileId)
          .eq('status', statusLabel);
      return Result.success(count);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Fetches a single complaint by id (with nested category + first image).
  ///
  /// Used by the complaint detail screen opened from a notification tap.
  Future<Result<Complaint>> fetchComplaintById(String complaintId) async {
    try {
      final data = await _client
          .from('complaints')
          .select('*, categories(*), complaint_images(storage_path), civic_incidents(*), departments(id, name, code), officers(id, title, ward, profiles(id, name))')
          .eq('id', complaintId)
          .single();
      await _attachSignedThumbnails([data]);
      return Result.success(Complaint.fromJson(data));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Fetches the full complaint detail: complaint + all images (with signed
  /// URLs) + status history + resolution evidence. Used by the complaint
  /// detail screen to show the complete tracking view with a visual timeline.
  Future<Result<ComplaintDetail>> fetchComplaintDetail(
    String complaintId,
  ) async {
    try {
      // Fetch complaint + all images + status history + resolution evidence
      // in a single query using nested joins.
      final data = await _client
          .from('complaints')
          .select('''
            *,
            categories(*),
            complaint_images(id, storage_path, round_number),
            complaint_status_history(id, status, comment, created_at),
            resolution_evidence(id, storage_path, caption, created_at),
            civic_incidents(*),
            departments(id, name, code),
            officers(id, title, ward, profiles(id, name)),
            complaint_assignments(assigned_at, assignment_method, assignment_reason)
          ''')
          .eq('id', complaintId)
          .single();

      final complaint = Complaint.fromJson(data);

      // --- Mint signed URLs for all complaint images ---
      final List<ComplaintImageWithUrl> images = [];
      final rawImages = data['complaint_images'];
      if (rawImages is List) {
        final paths = <String>[];
        final ids = <String>[];
        final rounds = <int>[];
        for (final img in rawImages) {
          if (img is Map && img['storage_path'] is String) {
            ids.add(img['id'] as String);
            paths.add(img['storage_path'] as String);
            rounds.add((img['round_number'] as int?) ?? 1);
          }
        }
        if (paths.isNotEmpty) {
          final signed = await _storage.signedUrls(
            AppConstants.complaintImagesBucket,
            paths,
          );
          for (var i = 0; i < ids.length; i++) {
            final url = signed[paths[i]];
            if (url != null) {
              images.add(ComplaintImageWithUrl(
                id: ids[i],
                url: url,
                storagePath: paths[i],
                roundNumber: rounds[i],
              ));
            }
          }
        }
      }

      // --- Parse status history ---
      final List<StatusHistoryEntry> history = [];
      final rawHistory = data['complaint_status_history'];
      if (rawHistory is List) {
        for (final entry in rawHistory) {
          if (entry is Map<String, dynamic>) {
            history.add(StatusHistoryEntry.fromJson(entry));
          }
        }
        // Sort oldest first (timeline order)
        history.sort((a, b) => a.createdAt.compareTo(b.createdAt));
      }

      // --- Mint signed URLs for resolution evidence ---
      final List<ResolutionEvidence> evidence = [];
      final rawEvidence = data['resolution_evidence'];
      if (rawEvidence is List) {
        final evPaths = <String>[];
        final evEntries = <Map<String, dynamic>>[];
        for (final ev in rawEvidence) {
          if (ev is Map<String, dynamic> && ev['storage_path'] is String) {
            evPaths.add(ev['storage_path'] as String);
            evEntries.add(ev);
          }
        }
        if (evPaths.isNotEmpty) {
          final signed = await _storage.signedUrls(
            AppConstants.complaintImagesBucket,
            evPaths,
          );
          for (var i = 0; i < evEntries.length; i++) {
            final entry = evEntries[i];
            final url = signed[evPaths[i]];
            evidence.add(ResolutionEvidence.fromJson({
              ...entry,
              'image_url': url,
            }));
          }
        }
      }

      return Result.success(ComplaintDetail(
        complaint: complaint,
        images: images,
        statusHistory: history,
        resolutionEvidence: evidence,
      ));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Generates signed URLs for the first image of each complaint row and
  /// injects them as `image_url` so [Complaint.fromJson] can parse the
  /// thumbnail. The `complaint_images` storage bucket is private, so public
  /// URLs are not usable for display; signed URLs are minted from the stored
  /// `storage_path` instead.
  Future<void> _attachSignedThumbnails(
    List<Map<String, dynamic>> rows,
  ) async {
    final paths = <String>[];
    for (final row in rows) {
      final imgs = row['complaint_images'];
      if (imgs is List && imgs.isNotEmpty) {
        final first = imgs.first;
        if (first is Map && first['storage_path'] is String) {
          paths.add(first['storage_path'] as String);
        }
      }
    }
    if (paths.isEmpty) return;
    final signed = await _storage.signedUrls(
      AppConstants.complaintImagesBucket,
      paths,
    );
    for (final row in rows) {
      final imgs = row['complaint_images'];
      if (imgs is List && imgs.isNotEmpty) {
        final first = imgs.first;
        if (first is Map && first['storage_path'] is String) {
          final path = first['storage_path'] as String;
          final url = signed[path];
          if (url != null) first['image_url'] = url;
        }
      }
    }
  }

  /// Creates a complaint via the `create_complaint` RPC function.
  ///
  /// The RPC handles PostGIS geography conversion, complaint + image insert
  /// in a single transaction, and the reward trigger fires automatically.
  /// Pass an [idempotencyKey] so that network retries return the
  /// already-created complaint instead of creating a duplicate.
  Future<Result<Complaint>> createComplaint({
    required String categoryId,
    required String title,
    required String description,
    required ComplaintSeverity severity,
    double? latitude,
    double? longitude,
    String? address,
    List<String> imageUrls = const [],
    List<String> imagePaths = const [],
    String? idempotencyKey,
  }) async {
    try {
      final data = await _client.rpc(
        'create_complaint',
        params: {
          'p_category_id': categoryId,
          'p_title': title,
          'p_description': description,
          'p_severity': severity.label,
          'p_latitude': latitude,
          'p_longitude': longitude,
          'p_address': address,
          'p_image_urls': imageUrls,
          'p_image_paths': imagePaths,
          'p_idempotency_key': idempotencyKey,
        },
      );
      final complaint = Complaint.fromJson(data as Map<String, dynamic>);
      return Result.success(complaint);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Fetches nearby complaints within [radiusMeters] of the given point.
  ///
  /// Uses the `nearby_complaints` PostGIS RPC so the filtering happens on the
  /// server (ST_DWithin) rather than downloading all complaints. Returns a
  /// privacy-safe projection: no user_id, truncated description, approximate
  /// address only. Supports optional category and status filters.
  Future<Result<List<NearbyComplaint>>> fetchNearbyComplaints({
    required double latitude,
    required double longitude,
    int radiusMeters = 1000,
    int limit = 100,
    List<String>? categoryIds,
    List<String>? statuses,
  }) async {
    try {
      final data = await _client.rpc(
        'nearby_complaints',
        params: {
          'p_latitude': latitude,
          'p_longitude': longitude,
          'p_radius_meters': radiusMeters,
          'p_limit': limit,
          'p_category_ids': categoryIds,
          'p_statuses': statuses,
        },
      );
      final list = (data as List)
          .map((e) => NearbyComplaint.fromJson(e as Map<String, dynamic>))
          .toList();
      return Result.success(list);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Fetches heatmap grid points for complaint density visualization.
  Future<Result<List<HeatmapPoint>>> fetchNearbyHeatmap({
    required double latitude,
    required double longitude,
    int radiusMeters = 5000,
    int gridSizeMeters = 500,
    List<String>? categoryIds,
    List<String>? statuses,
  }) async {
    try {
      final data = await _client.rpc(
        'nearby_complaints_heatmap',
        params: {
          'p_latitude': latitude,
          'p_longitude': longitude,
          'p_radius_meters': radiusMeters,
          'p_grid_size_meters': gridSizeMeters,
          'p_category_ids': categoryIds,
          'p_statuses': statuses,
        },
      );
      final list = (data as List)
          .map((e) => HeatmapPoint.fromJson(e as Map<String, dynamic>))
          .toList();
      return Result.success(list);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Finds similar complaints near a point so the citizen can choose to join
  /// an existing civic incident instead of filing a duplicate.
  ///
  /// Backed by the `find_similar_complaints` SECURITY DEFINER RPC: filters by
  /// the same category and a PostGIS radius (ST_DWithin, GiST-indexed), ranks
  /// by title similarity (pg_trgm) then distance, and returns a privacy-safe
  /// projection (no user_id). Candidates already part of an incident surface
  /// first so the citizen can join the existing 37-report incident directly.
  Future<Result<List<SimilarComplaint>>> findSimilarComplaints({
    required double latitude,
    required double longitude,
    required String categoryId,
    String? title,
    int radiusMeters = 250,
    int limit = 8,
  }) async {
    try {
      final data = await _client.rpc(
        'find_similar_complaints',
        params: {
          'p_lat': latitude,
          'p_lng': longitude,
          'p_category_id': categoryId,
          'p_title': title,
          'p_radius_m': radiusMeters,
          'p_limit': limit,
        },
      );
      final list = (data as List)
          .map((e) => SimilarComplaint.fromJson(e as Map<String, dynamic>))
          .toList();
      return Result.success(list);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Merges the citizen's new report into an existing complaint's civic
  /// incident via the `join_similar_complaint` SECURITY DEFINER RPC.
  ///
  /// The RPC validates the match (same category + within radius), ensures an
  /// incident exists for it (creating one if the matched complaint was still
  /// standalone), inserts the new complaint already linked to that incident,
  /// and recomputes the incident's counts. The existing complaint-insert
  /// triggers fire as usual (report points, status history, "submitted"
  /// notification). Images are uploaded by the caller before this call.
  Future<Result<Complaint>> joinSimilarComplaint({
    required String matchComplaintId,
    required String categoryId,
    required String title,
    required String description,
    required ComplaintSeverity severity,
    double? latitude,
    double? longitude,
    String? address,
    List<String> imageUrls = const [],
    List<String> imagePaths = const [],
    String? idempotencyKey,
  }) async {
    try {
      final data = await _client.rpc(
        'join_similar_complaint',
        params: {
          'p_match_complaint_id': matchComplaintId,
          'p_category_id': categoryId,
          'p_title': title,
          'p_description': description,
          'p_severity': severity.label,
          'p_lat': latitude,
          'p_lng': longitude,
          'p_address': address,
          'p_image_urls': imageUrls,
          'p_image_paths': imagePaths,
          'p_idempotency_key': idempotencyKey,
        },
      );
      final complaint = Complaint.fromJson(data as Map<String, dynamic>);
      return Result.success(complaint);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Deletes the citizen's complaint and its uploaded images from storage.
  ///
  /// Only complaints that have NOT yet been verified (status SUBMITTED,
  /// AUTO_VALIDATING, or NEEDS_REVIEW) can be deleted — the RLS DELETE
  /// policy enforces this server-side. Storage objects are removed first;
  /// the complaint row is then deleted, which cascades to complaint_images,
  /// complaint_status_history, and resolution_evidence.
  Future<Result<void>> deleteComplaint({
    required String complaintId,
    List<String> storagePaths = const [],
  }) async {
    try {
      // 1. Delete storage objects first (best-effort).
      if (storagePaths.isNotEmpty) {
        await _storage.deleteImages(storagePaths);
      }

      // 2. Delete the complaint row (RLS allows only pre-verification).
      await _client.from('complaints').delete().eq('id', complaintId);

      return Result.success(null);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }

  /// Adds new evidence photos to an existing complaint via the
  /// `add_evidence_to_complaint` RPC.
  ///
  /// Used when an officer requests more evidence (status `EVIDENCE_REQUIRED`)
  /// or when the citizen wants to re-submit photos after an AI failure. The
  /// RPC attaches the new images and re-queues the complaint for AI
  /// verification. Returns the updated complaint.
  Future<Result<Complaint>> addEvidence({
    required String complaintId,
    required List<String> imageUrls,
    required List<String> imagePaths,
  }) async {
    try {
      final data = await _client.rpc(
        'add_evidence_to_complaint',
        params: {
          'p_complaint_id': complaintId,
          'p_image_urls': imageUrls,
          'p_image_paths': imagePaths,
        },
      );
      final complaint = Complaint.fromJson(data as Map<String, dynamic>);
      return Result.success(complaint);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: e.message, exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure(
        message: _networkErrorMessage(e) ?? e.toString(),
        exception: e,
      ));
    }
  }
}
