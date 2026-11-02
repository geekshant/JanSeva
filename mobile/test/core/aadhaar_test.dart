import 'package:flutter_test/flutter_test.dart';
import 'package:janmitra/core/utils/aadhaar.dart';

void main() {
  group('normalizeAadhaar', () {
    test('strips spaces, dashes and any non-digit', () {
      expect(normalizeAadhaar('1234 5678 9012'), '123456789012');
      expect(normalizeAadhaar('1234-5678-9012'), '123456789012');
      expect(normalizeAadhaar('1234abc5678 9012'), '123456789012');
      expect(normalizeAadhaar(''), '');
    });
  });

  group('isValidAadhaar', () {
    test('accepts exactly 12 digits', () {
      expect(isValidAadhaar('123456789012'), isTrue);
      expect(isValidAadhaar('1234 5678 9012'), isTrue);
      expect(isValidAadhaar('9999-8888-7777'), isTrue);
    });

    test('rejects fewer or more than 12 digits', () {
      expect(isValidAadhaar('12345678901'), isFalse);
      expect(isValidAadhaar('1234567890123'), isFalse);
      expect(isValidAadhaar(''), isFalse);
    });

    test('rejects values containing letters', () {
      expect(isValidAadhaar('12345678901a'), isFalse);
      expect(isValidAadhaar('abcdefghijkl'), isFalse);
    });
  });

  group('formatAadhaar', () {
    test('groups digits into four-digit blocks', () {
      expect(formatAadhaar('123456789012'), '1234 5678 9012');
      expect(formatAadhaar('12345'), '1234 5');
      expect(formatAadhaar(''), '');
    });

    test('never emits more than 12 digits', () {
      expect(formatAadhaar('1234567890123456'), '1234 5678 9012');
    });

    test('re-formats an already formatted number without doubling spaces', () {
      expect(formatAadhaar(formatAadhaar('123456789012')), '1234 5678 9012');
    });
  });

  group('maskAadhaar', () {
    test('shows only the last four digits', () {
      expect(maskAadhaar('123456789012'), 'XXXX XXXX 9012');
      expect(maskAadhaar('1234 5678 9012'), 'XXXX XXXX 9012');
    });

    test('degrades safely for short input', () {
      expect(maskAadhaar('12'), 'XXXX');
      expect(maskAadhaar(''), 'XXXX');
    });
  });
}
