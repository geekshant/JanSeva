import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/core/utils/phone.dart';

void main() {
  group('normalizePhone', () {
    test('keeps a plain 10-digit number', () {
      expect(normalizePhone('9876543210'), '9876543210');
    });

    test('strips separators', () {
      expect(normalizePhone('98765-43210'), '9876543210');
      expect(normalizePhone('98765 43210'), '9876543210');
      expect(normalizePhone('(98765) 43210'), '9876543210');
    });

    test('strips the +91 / 91 / 0 prefixes', () {
      expect(normalizePhone('+91 9876543210'), '9876543210');
      expect(normalizePhone('919876543210'), '9876543210');
      expect(normalizePhone('09876543210'), '9876543210');
    });

    test('rejects anything that is not 10 digits', () {
      expect(normalizePhone('12345'), isNull);
      expect(normalizePhone('12345678901234'), isNull);
      expect(normalizePhone(''), isNull);
      expect(normalizePhone('not a phone'), isNull);
    });
  });

  group('isValidPhone', () {
    test('accepts the forms users actually type', () {
      expect(isValidPhone('98765 43210'), isTrue);
      expect(isValidPhone('+91-98765-43210'), isTrue);
    });

    test('rejects e-mails and short input', () {
      expect(isValidPhone('a@b.com'), isFalse);
      expect(isValidPhone('98765'), isFalse);
    });
  });

  group('looksLikeEmail', () {
    test('accepts a plain address', () {
      expect(looksLikeEmail('citizen@example.com'), isTrue);
      expect(looksLikeEmail('  citizen@example.com '), isTrue);
    });

    test('rejects phone numbers and malformed input', () {
      expect(looksLikeEmail('9876543210'), isFalse);
      expect(looksLikeEmail('98765 43210'), isFalse);
      expect(looksLikeEmail('citizen@'), isFalse);
      expect(looksLikeEmail('citizen.example.com'), isFalse);
    });
  });

  group('formatPhone', () {
    test('groups the first ten digits 5 + 5', () {
      expect(formatPhone('9876543210'), '98765 43210');
    });

    test('never emits more than ten digits', () {
      expect(formatPhone('987654321099'), '98765 43210');
    });

    test('passes short input through', () {
      expect(formatPhone('987'), '987');
      expect(formatPhone('98765'), '98765');
    });
  });

  group('maskPhone', () {
    test('shows only the last four digits', () {
      expect(maskPhone('9876543210'), 'XXXXX 3210');
    });

    test('degrades gracefully on short input', () {
      expect(maskPhone('98'), 'XXXXX');
    });
  });
}
