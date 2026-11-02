/// A simple (latitude, longitude) pair parsed from PostGIS GeoJSON.
class GeoPoint {
  const GeoPoint({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;

  /// Parses a PostGIS geography value returned by Supabase as a map.
  ///
  /// PostgREST returns geography columns as GeoJSON: `{"type":"Point",
  /// "coordinates":[lng, lat]}`. Returns `null` if the value is not a point.
  static GeoPoint? tryFromGeoJson(Object? value) {
    if (value is! Map) return null;
    final coordinates = value['coordinates'];
    if (coordinates is! List || coordinates.length < 2) return null;
    final lng = coordinates[0];
    final lat = coordinates[1];
    if (lng is! num || lat is! num) return null;
    return GeoPoint(latitude: lat.toDouble(), longitude: lng.toDouble());
  }

  @override
  String toString() => 'GeoPoint($latitude, $longitude)';
}
