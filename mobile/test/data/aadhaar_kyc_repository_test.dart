import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:janmitra/core/utils/aadhaar.dart';
import 'package:janmitra/data/repositories/aadhaar_kyc_repository.dart';

/// Exercises `AadhaarKycRepository.submit` against a local stand-in for the
/// Supabase REST endpoint, so the whole input -> request -> response chain is
/// covered without touching a real project:
///
///  * the formatted `XXXX XXXX XXXX` input is sent as bare digits
///  * the request reaches `/rest/v1/rpc/submit_aadhaar_registration` with the
///    parameter names the SQL function declares
///  * a successful row is parsed into [AadhaarKycRecord]
///  * server-side failures map to their translation keys — in particular the
///    "function/table not found" class of error, which used to be swallowed
///    by the generic "Something went wrong" message
void main() {
  late HttpServer server;
  late SupabaseClient client;

  Uri? lastUri;
  Map<String, dynamic>? lastBody;

  /// A random 12-digit value, so no real (or literal) Aadhaar number is
  /// ever baked into the suite.
  String randomAadhaarDigits() {
    final rng = Random();
    final first = 1 + rng.nextInt(9);
    return '$first${List.generate(11, (_) => rng.nextInt(10)).join()}';
  }

  Future<AadhaarKycRepository> repository({
    required int statusCode,
    required Map<String, dynamic> responseBody,
  }) async {
    lastUri = null;
    lastBody = null;
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    server.listen((request) async {
      final raw = await utf8.decoder.bind(request).join();
      lastUri = request.uri;
      lastBody = raw.isEmpty
          ? null
          : jsonDecode(raw) as Map<String, dynamic>;
      request.response
        ..statusCode = statusCode
        ..headers.contentType = ContentType.json
        ..write(jsonEncode(responseBody));
      await request.response.close();
    });

    client = SupabaseClient(
      'http://${server.address.address}:${server.port}',
      'test-anon-key',
    );
    return AadhaarKycRepository(client: client);
  }

  Map<String, dynamic> verifiedRow() => {
        'id': '00000000-0000-4000-8000-000000000000',
        'aadhaar_masked': 'XXXX XXXX 0000',
        'full_name': 'Test Citizen',
        'status': 'verified',
        'verified_at': '2026-09-28T10:00:00+00:00',
      };

  tearDown(() async {
    client.dispose();
    await server.close(force: true);
  });

  group('submit request', () {
    test('strips the display spaces and posts bare digits to the RPC', () async {
      final digits = randomAadhaarDigits();
      final repo = await repository(statusCode: 200, responseBody: verifiedRow());

      final result = await repo.submit(
        aadhaar: formatAadhaar(digits), // "XXXX XXXX XXXX", as typed in the UI
        fullName: 'Test Citizen',
      );

      expect(result.isSuccess, isTrue);
      expect(
        lastUri.toString(),
        endsWith('/rest/v1/rpc/submit_aadhaar_registration'),
      );
      expect(lastBody, isNotNull);
      expect(lastBody!['p_aadhaar'], digits);
      expect(lastBody!['p_aadhaar'], hasLength(aadhaarDigitCount));
      expect(lastBody!['p_aadhaar'], matches(RegExp(r'^\d{12}$')));
      expect(lastBody!['p_full_name'], 'Test Citizen');
      expect('$lastBody', isNot(contains('XXXX XXXX')));
    });

    test('parses the verified row returned by the server', () async {
      final repo = await repository(statusCode: 200, responseBody: verifiedRow());

      final result = await repo.submit(
        aadhaar: formatAadhaar(randomAadhaarDigits()),
        fullName: 'Test Citizen',
      );

      final record = result.dataOrNull;
      expect(record, isNotNull);
      expect(record!.isVerified, isTrue);
      expect(record.status, 'verified');
      expect(record.fullName, 'Test Citizen');
      expect(record.maskedAadhaar, 'XXXX XXXX 0000');
      expect(record.verifiedAt, isNotNull);
    });

    test('does not send a request when the number is not 12 digits', () async {
      final repo = await repository(statusCode: 200, responseBody: verifiedRow());

      final result = await repo.submit(
        aadhaar: '1234 5678 90123', // 13 digits once normalised
        fullName: 'Test Citizen',
      );

      expect(result.isFailure, isTrue);
      expect(result.failureOrNull!.message, 'auth.error.aadhaarInvalid');
      expect(lastUri, isNull);
    });

    test('does not send a request when the name is too short', () async {
      final repo = await repository(statusCode: 200, responseBody: verifiedRow());

      final result = await repo.submit(
        aadhaar: formatAadhaar(randomAadhaarDigits()),
        fullName: 'Ab',
      );

      expect(result.isFailure, isTrue);
      expect(result.failureOrNull!.message, 'aadhaar.error.nameTooShort');
      expect(lastUri, isNull);
    });
  });

  group('server error mapping', () {
    /// PGRST202 is what PostgREST returns when `13_aadhaar_kyc.sql` has not
    /// been applied — the exact failure this suite exists to prevent.
    test('missing RPC reports the deploy problem, not a generic error',
        () async {
      final repo = await repository(
        statusCode: 404,
        responseBody: {
          'code': 'PGRST202',
          'details':
              'Searched for the function public.submit_aadhaar_registration '
                  'with parameters p_aadhaar, p_full_name ...',
          'hint': null,
          'message':
              'Could not find the function public.submit_aadhaar_registration'
                  '(p_aadhaar, p_full_name) in the schema cache',
        },
      );

      final result = await repo.submit(
        aadhaar: formatAadhaar(randomAadhaarDigits()),
        fullName: 'Test Citizen',
      );

      expect(result.isFailure, isTrue);
      expect(result.failureOrNull!.message, 'auth.error.backendOutOfDate');
      expect(result.failureOrNull!.message, isNot('auth.error.unknown'));
    });

    test('missing table reports the deploy problem', () async {
      final repo = await repository(
        statusCode: 404,
        responseBody: {
          'code': 'PGRST205',
          'message': 'Could not find the table public.aadhaar_kyc in the '
              'schema cache',
          'details': null,
          'hint': null,
        },
      );

      final result = await repo.submit(
        aadhaar: formatAadhaar(randomAadhaarDigits()),
        fullName: 'Test Citizen',
      );

      expect(result.failureOrNull!.message, 'auth.error.backendOutOfDate');
    });

    test('invalid Aadhaar rejected by the server', () async {
      final repo = await repository(
        statusCode: 400,
        responseBody: {
          'code': 'PGRST200',
          'message': 'invalid_aadhaar',
          'details': null,
          'hint': null,
        },
      );

      final result = await repo.submit(
        aadhaar: formatAadhaar(randomAadhaarDigits()),
        fullName: 'Test Citizen',
      );

      expect(result.failureOrNull!.message, 'auth.error.aadhaarInvalid');
    });

    test('a different Aadhaar already registered on the account', () async {
      final repo = await repository(
        statusCode: 400,
        responseBody: {
          'code': 'PGRST200',
          'message': 'aadhaar_already_registered',
          'details': null,
          'hint': null,
        },
      );

      final result = await repo.submit(
        aadhaar: formatAadhaar(randomAadhaarDigits()),
        fullName: 'Test Citizen',
      );

      expect(
        result.failureOrNull!.message,
        'aadhaar.error.alreadyRegistered',
      );
    });

    test('signed-out caller is told to sign in again', () async {
      final repo = await repository(
        statusCode: 401,
        responseBody: {
          'code': 'PGRST301',
          'message': 'not_authenticated',
          'details': null,
          'hint': null,
        },
      );

      final result = await repo.submit(
        aadhaar: formatAadhaar(randomAadhaarDigits()),
        fullName: 'Test Citizen',
      );

      expect(result.failureOrNull!.message, 'auth.error.sessionExpired');
    });

    test('unrecognised errors still fall back to the generic message',
        () async {
      final repo = await repository(
        statusCode: 500,
        responseBody: {
          'code': 'XX000',
          'message': 'something exploded',
          'details': null,
          'hint': null,
        },
      );

      final result = await repo.submit(
        aadhaar: formatAadhaar(randomAadhaarDigits()),
        fullName: 'Test Citizen',
      );

      expect(result.failureOrNull!.message, 'auth.error.unknown');
    });
  });
}
