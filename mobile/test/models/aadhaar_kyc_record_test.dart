import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/data/models/aadhaar_kyc_record.dart';

void main() {
  group('AadhaarKycRecord.fromJson', () {
    test('parses a verified row', () {
      final record = AadhaarKycRecord.fromJson({
        'aadhaar_masked': 'XXXX XXXX 9012',
        'full_name': 'Aarav Sharma',
        'status': 'verified',
        'verified_at': '2026-09-28T10:15:00+00:00',
      });

      expect(record.maskedAadhaar, 'XXXX XXXX 9012');
      expect(record.fullName, 'Aarav Sharma');
      expect(record.status, 'verified');
      expect(record.isVerified, isTrue);
      expect(record.verifiedAt, isNotNull);
    });

    test('treats a pending row as not verified', () {
      final record = AadhaarKycRecord.fromJson({
        'aadhaar_masked': 'XXXX XXXX 9012',
        'full_name': 'Aarav Sharma',
        'status': 'pending',
        'verified_at': null,
      });

      expect(record.isVerified, isFalse);
      expect(record.verifiedAt, isNull);
    });

    test('defaults a malformed row to pending', () {
      final record = AadhaarKycRecord.fromJson(const {});

      expect(record.status, 'pending');
      expect(record.isVerified, isFalse);
      expect(record.maskedAadhaar, isEmpty);
    });
  });
}
