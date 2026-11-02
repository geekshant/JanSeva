import 'package:flutter_test/flutter_test.dart';

import 'package:janmitra/core/errors/result.dart';
import 'package:janmitra/data/models/complaint_status.dart';
import 'package:janmitra/data/models/complaint_severity.dart';
import 'package:janmitra/data/models/geo_point.dart';

void main() {
  group('Result', () {
    test('success holds data and reports isSuccess', () {
      final result = Result<int>.success(42);
      expect(result.isSuccess, isTrue);
      expect(result.isFailure, isFalse);
      expect(result.dataOrNull, 42);
      expect(result.failureOrNull, isNull);
    });

    test('failure holds the failure and reports isFailure', () {
      final result = Result<int>.failure(
        const Failure(message: 'boom'),
      );
      expect(result.isFailure, isTrue);
      expect(result.isSuccess, isFalse);
      expect(result.dataOrNull, isNull);
      expect(result.failureOrNull?.message, 'boom');
    });

    test('when routes to the correct branch', () {
      final ok = Result<int>.success(7);
      expect(
        ok.when(success: (d) => 'ok:$d', failure: (f) => 'err'),
        'ok:7',
      );

      final err = Result<int>.failure(const Failure(message: 'x'));
      expect(
        err.when(success: (d) => 'ok:$d', failure: (f) => 'err:${f.message}'),
        'err:x',
      );
    });
  });

  group('ComplaintStatus', () {
    test('fromString parses uppercase labels', () {
      expect(ComplaintStatus.fromString('RESOLVED'), ComplaintStatus.resolved);
      expect(ComplaintStatus.fromString('in_progress'),
          ComplaintStatus.inProgress);
    });

    test('fromString falls back to submitted for unknown values', () {
      expect(ComplaintStatus.fromString('UNKNOWN'), ComplaintStatus.submitted);
    });

    test('isPending is true for submitted/verified/assigned', () {
      for (final s in [
        ComplaintStatus.submitted,
        ComplaintStatus.verified,
        ComplaintStatus.assigned,
      ]) {
        expect(s.isPending, isTrue, reason: s.name);
      }
      for (final s in [
        ComplaintStatus.inProgress,
        ComplaintStatus.resolved,
        ComplaintStatus.rejected,
      ]) {
        expect(s.isPending, isFalse, reason: s.name);
      }
    });
  });

  group('ComplaintSeverity', () {
    test('fromString parses uppercase labels', () {
      expect(ComplaintSeverity.fromString('CRITICAL'),
          ComplaintSeverity.critical);
      expect(ComplaintSeverity.fromString('low'), ComplaintSeverity.low);
    });

    test('defaults to medium for unknown values', () {
      expect(ComplaintSeverity.fromString('?'), ComplaintSeverity.medium);
    });
  });

  group('GeoPoint', () {
    test('parses a PostGIS GeoJSON point', () {
      final p = GeoPoint.tryFromGeoJson({
        'type': 'Point',
        'coordinates': [77.5946, 12.9716],
      });
      expect(p, isNotNull);
      expect(p!.longitude, 77.5946);
      expect(p.latitude, 12.9716);
    });

    test('returns null for non-point or malformed values', () {
      expect(GeoPoint.tryFromGeoJson(null), isNull);
      expect(GeoPoint.tryFromGeoJson('foo'), isNull);
      expect(GeoPoint.tryFromGeoJson({'type': 'Polygon'}), isNull);
      expect(
        GeoPoint.tryFromGeoJson({'type': 'Point', 'coordinates': [1]}),
        isNull,
      );
    });
  });
}
