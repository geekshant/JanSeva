import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/supabase_service.dart';
import '../../core/errors/result.dart';
import '../../core/utils/aadhaar.dart';
import '../models/aadhaar_kyc_record.dart';

/// Reads and submits the citizen's Aadhaar registration (`aadhaar_kyc`).
///
/// The app is gated on this record: a citizen who has not registered their
/// Aadhaar can sign in but cannot report, verify or claim anything until
/// [submit] succeeds.
///
/// Writes go exclusively through the `submit_aadhaar_registration` SECURITY
/// DEFINER RPC (see `database/13_aadhaar_kyc.sql`), which validates the
/// number, stores a SHA-256 digest plus the masked form and marks the row
/// `verified`. The client never writes the table directly.
class AadhaarKycRepository {
  /// [client] is only supplied by tests; production always talks to the
  /// configured project through [SupabaseService].
  AadhaarKycRepository({SupabaseClient? client}) : _clientOverride = client;

  final SupabaseClient? _clientOverride;

  SupabaseClient get _client => _clientOverride ?? SupabaseService.client;

  /// Whether Supabase has been configured — when `false` every method
  /// returns a friendly failure instead of throwing.
  bool get isConfigured =>
      _clientOverride != null || SupabaseService.isInitialized;

  /// The registration row for the signed-in citizen, or `null` when they have
  /// not registered yet (or there is no session).
  Future<Result<AadhaarKycRecord?>> fetchRecord() async {
    if (!isConfigured) {
      return Result.failure(
        const Failure(message: 'auth.error.backendUnavailable'),
      );
    }
    if (_client.auth.currentUser == null) {
      return Result.success(null);
    }
    try {
      final data = await _client
          .from('aadhaar_kyc')
          .select()
          .maybeSingle();
      if (data == null) return Result.success(null);
      return Result.success(AadhaarKycRecord.fromJson(data));
    } on PostgrestException catch (e) {
      return Result.failure(
        Failure(message: _friendlyMessage(e.message, e.code), exception: e),
      );
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// Registers [aadhaar] for the signed-in citizen and returns the stored
  /// row, already `verified`.
  ///
  /// Re-submitting the same number is safe (it only refreshes the name);
  /// submitting a different number for an account that already has one is
  /// rejected by the server.
  Future<Result<AadhaarKycRecord>> submit({
    required String aadhaar,
    required String fullName,
  }) async {
    if (!isConfigured) {
      return Result.failure(
        const Failure(message: 'auth.error.backendUnavailable'),
      );
    }
    final digits = normalizeAadhaar(aadhaar);
    if (digits.length != aadhaarDigitCount) {
      return Result.failure(
        const Failure(message: 'auth.error.aadhaarInvalid'),
      );
    }
    if (fullName.trim().length < 3) {
      return Result.failure(
        const Failure(message: 'aadhaar.error.nameTooShort'),
      );
    }

    try {
      final data = await _client.rpc(
        'submit_aadhaar_registration',
        params: {
          'p_aadhaar': digits,
          'p_full_name': fullName.trim(),
        },
      );
      final record = _parseRecord(data);
      if (record == null) {
        return Result.failure(
          const Failure(message: 'auth.error.unknown'),
        );
      }
      return Result.success(record);
    } on PostgrestException catch (e) {
      return Result.failure(
        Failure(message: _friendlyMessage(e.message, e.code), exception: e),
      );
    } on Exception catch (e) {
      return Result.failure(Failure.fromException(e));
    }
  }

  /// PostgREST renders `RETURNS aadhaar_kyc` as an object, but tolerate a
  /// one-element array too so a driver change never breaks the gate.
  static AadhaarKycRecord? _parseRecord(Object? data) {
    if (data is Map) {
      return AadhaarKycRecord.fromJson(Map<String, dynamic>.from(data));
    }
    if (data is List && data.isNotEmpty && data.first is Map) {
      return AadhaarKycRecord.fromJson(
        Map<String, dynamic>.from(data.first as Map),
      );
    }
    return null;
  }

  /// Maps the raw RPC / PostgREST error to a translation key.
  ///
  /// Only [raw] (the PostgREST `message`) and [code] are inspected:
  /// `details` is deliberately ignored because Postgres echoes the offending
  /// row — including the Aadhaar column — into it for constraint failures.
  static String _friendlyMessage(String raw, [String? code]) {
    final lower = raw.toLowerCase();

    // PGRST202/PGRST205 mean the project is missing the objects this flow
    // needs: `database/13_aadhaar_kyc.sql` (or a later step) has not been
    // applied. Say so instead of collapsing a deploy problem into the
    // generic "something went wrong", which is unactionable for everyone.
    if (code == 'PGRST202' ||
        code == 'PGRST205' ||
        lower.contains('could not find the function') ||
        lower.contains('could not find the table') ||
        lower.contains('does not exist in the schema cache') ||
        (lower.contains('relation') && lower.contains('does not exist'))) {
      return 'auth.error.backendOutOfDate';
    }
    if (lower.contains('aadhaar_already_registered')) {
      return 'aadhaar.error.alreadyRegistered';
    }
    if (lower.contains('invalid_aadhaar')) {
      return 'auth.error.aadhaarInvalid';
    }
    if (lower.contains('invalid_name')) {
      return 'aadhaar.error.nameTooShort';
    }
    if (lower.contains('not_authenticated')) {
      return 'auth.error.sessionExpired';
    }
    return 'auth.error.unknown';
  }
}
