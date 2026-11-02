import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../../core/errors/result.dart';
import '../models/safety_models.dart';

/// Repository for the Women Safety feature — handles SOS, trusted contacts,
/// check-ins, nearby safe places, and anonymous reports via Supabase RPCs.
class SafetyRepository {
  SafetyRepository();

  SupabaseClient get _client => SupabaseService.client;

  /// Maps a PostgrestException message to a friendly i18n key when the error
  /// is a Women Safety access denial. Other errors pass through unchanged.
  static String _friendlyMessage(String message) {
    if (message.contains('WOMEN_SAFETY_ACCESS_DENIED')) {
      return 'safety.accessDenied';
    }
    return message;
  }

  // ---------------------------------------------------------------------------
  // Trusted contacts
  // ---------------------------------------------------------------------------

  Future<Result<List<SafetyContact>>> fetchContacts() async {
    try {
      final data = await _client.rpc('fetch_safety_contacts');
      return Result.success(
        (data as List).map((e) => SafetyContact.fromJson(e as Map<String, dynamic>)).toList(),
      );
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  Future<Result<SafetyContact>> addContact({
    required String name,
    required String phone,
    String? relationship,
  }) async {
    try {
      final data = await _client.rpc('add_safety_contact', params: {
        'p_name': name,
        'p_phone': phone,
        'p_relationship': relationship,
      });
      return Result.success(SafetyContact.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  Future<Result<SafetyContact>> updateContact({
    required String id,
    String? name,
    String? phone,
    String? relationship,
  }) async {
    try {
      final data = await _client.rpc('update_safety_contact', params: {
        'p_contact_id': id,
        'p_name': name,
        'p_phone': phone,
        'p_relationship': relationship,
      });
      return Result.success(SafetyContact.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  Future<Result<void>> deleteContact(String id) async {
    try {
      await _client.rpc('delete_safety_contact', params: {
        'p_contact_id': id,
      });
      return Result.success(null);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  // ---------------------------------------------------------------------------
  // SOS
  // ---------------------------------------------------------------------------

  Future<Result<SafetyIncident>> triggerSos({
    double? latitude,
    double? longitude,
    String? address,
    String? message,
  }) async {
    try {
      final data = await _client.rpc('trigger_sos', params: {
        'p_latitude': latitude,
        'p_longitude': longitude,
        'p_address': address,
        'p_message': message,
      });
      return Result.success(SafetyIncident.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  Future<Result<SafetyIncident>> cancelSos(String incidentId) async {
    try {
      final data = await _client.rpc('cancel_sos', params: {
        'p_incident_id': incidentId,
      });
      return Result.success(SafetyIncident.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  Future<Result<void>> shareLocation({
    required String incidentId,
    required double latitude,
    required double longitude,
    double? accuracyMeters,
    double? speedMps,
    double? headingDeg,
  }) async {
    try {
      await _client.rpc('share_location', params: {
        'p_incident_id': incidentId,
        'p_latitude': latitude,
        'p_longitude': longitude,
        'p_accuracy_meters': accuracyMeters,
        'p_speed_mps': speedMps,
        'p_heading_deg': headingDeg,
      });
      return Result.success(null);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  // ---------------------------------------------------------------------------
  // SOS detail + status (for realtime polling)
  // ---------------------------------------------------------------------------

  Future<Result<Map<String, dynamic>?>> getSosIncidentDetail(String incidentId) async {
    try {
      final data = await _client.rpc('get_sos_incident_detail', params: {
        'p_incident_id': incidentId,
      });
      return Result.success(data as Map<String, dynamic>?);
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  // ---------------------------------------------------------------------------
  // Safety check-in
  // ---------------------------------------------------------------------------

  Future<Result<SafetyCheckIn>> createCheckIn(int intervalMinutes) async {
    try {
      final data = await _client.rpc('create_safety_checkin', params: {
        'p_interval_minutes': intervalMinutes,
      });
      return Result.success(SafetyCheckIn.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  Future<Result<SafetyCheckIn>> completeCheckIn(String checkInId) async {
    try {
      final data = await _client.rpc('complete_safety_checkin', params: {
        'p_checkin_id': checkInId,
      });
      return Result.success(SafetyCheckIn.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  // ---------------------------------------------------------------------------
  // Nearby safe places
  // ---------------------------------------------------------------------------

  Future<Result<List<SafetyPlace>>> findNearbyPlaces({
    required double latitude,
    required double longitude,
    int radiusM = 5000,
    int limit = 20,
  }) async {
    try {
      final data = await _client.rpc('find_nearby_safety_places', params: {
        'p_latitude': latitude,
        'p_longitude': longitude,
        'p_radius_m': radiusM,
        'p_limit': limit,
      });
      return Result.success(
        (data as List).map((e) => SafetyPlace.fromJson(e as Map<String, dynamic>)).toList(),
      );
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  // ---------------------------------------------------------------------------
  // Anonymous reporting
  // ---------------------------------------------------------------------------

  Future<Result<SafetyIncident>> submitAnonymousReport({
    double? latitude,
    double? longitude,
    String? address,
    String? message,
  }) async {
    try {
      final data = await _client.rpc('submit_anonymous_report', params: {
        'p_latitude': latitude,
        'p_longitude': longitude,
        'p_address': address,
        'p_message': message,
      });
      return Result.success(SafetyIncident.fromJson(data as Map<String, dynamic>));
    } on PostgrestException catch (e) {
      return Result.failure(Failure(message: _friendlyMessage(e.message), exception: e));
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }
}
