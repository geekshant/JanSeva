import 'package:flutter_test/flutter_test.dart';
import 'package:janmitra/core/utils/password.dart';

void main() {
  group('hasMinPasswordLength', () {
    test('accepts 8+ characters', () {
      expect(hasMinPasswordLength('Abcd1234'), isTrue);
      expect(hasMinPasswordLength('Abcd12345678'), isTrue);
    });

    test('rejects fewer than 8 characters', () {
      expect(hasMinPasswordLength(''), isFalse);
      expect(hasMinPasswordLength('Ab12345'), isFalse);
    });
  });

  group('password rules', () {
    test('hasPasswordLetter matches letters only', () {
      expect(hasPasswordLetter('abcdefg1'), isTrue);
      expect(hasPasswordLetter('ABCDEFG1'), isTrue);
      expect(hasPasswordLetter('12345678'), isFalse);
    });

    test('hasPasswordDigit matches digits only', () {
      expect(hasPasswordDigit('abcdefg1'), isTrue);
      expect(hasPasswordDigit('abcdefgh'), isFalse);
    });

    test('isValidPassword requires length, letter and digit', () {
      expect(isValidPassword('Passw0rd'), isTrue);
      expect(isValidPassword('short1'), isFalse); // < 8
      expect(isValidPassword('Allletters'), isFalse); // no digit
      expect(isValidPassword('12345678'), isFalse); // no letter
      expect(isValidPassword(''), isFalse);
    });
  });
}
