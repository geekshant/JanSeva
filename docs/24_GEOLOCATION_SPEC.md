# JanMitra — Map & Geolocation Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Implementation status:** Implemented. Map library is **Mapbox** (flutter_map on mobile, mapbox-gl on admin), **NOT Google Maps**. Some admin UI references a "Google Maps" link for directions/location display, and `VITE_GOOGLE_MAPS_API_KEY` exists in `.env.example` as "legacy — unused".

---

## 1. GPS Capture (Mobile)
- Library: `geolocator` ^14.
- Flow: `isLocationServiceEnabled` → `checkPermission` → `requestPermission` if denied → `getCurrentPosition(LocationSettings(accuracy: LocationAccuracy.high))`.
- Permission denied → map still usable manually (reporting never blocked).
- Used in: Report Issue location step, Map screen, SOS (`trigger_sos` with GPS), Safety nearby.

## 2. Manual Location Selection (Mobile)
- flutter_map ^8 with Mapbox streets-v12 raster tiles (`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}{r}?access_token=$MAPBOX_ACCESS_TOKEN`).
- `userAgentPackageName: 'com.janmitra'`.
- Tap on map (`onTap`) or drag marker (`onPanUpdate` → `screenOffsetToLatLng`).
- **Bhopal geofence:** lat 23.10–23.40, lng 77.25–77.55. Outside → error + clear location.

## 3. Coordinates
- Stored as `geography(point, 4326)` (WGS 84) in `complaints.location`.
- Created via `create_complaint` RPC from `p_latitude`/`p_longitude` → `ST_Geography(... )`.
- Returned as GeoJSON (`ST_AsGeoJSON(...)::jsonb`) because PostgREST serializes raw geography as EWKB hex (which Flutter `GeoPoint.tryFromGeoJson` cannot parse).
- Mobile `GeoPoint` model parses GeoJSON.

## 4. Reverse Geocoding
- Library: `geocoding` ^5. `placemarkFromCoordinates` → street/subLocality/locality/administrativeArea joined.
- Non-blocking (failure ignored; address optional).

## 5. Google Maps
- **Not used for map rendering.** Mobile uses Mapbox tiles. Admin uses Mapbox GL JS.
- Admin "Google Maps" links: `GoogleMapsLocation` component opens Google Maps URL for location display; safety alert "open directions" uses Google Maps URL. These are external link redirects, not an API integration.
- `VITE_GOOGLE_MAPS_API_KEY` in admin `.env.example` is labeled "legacy — unused" — no code references it.

## 6. PostGIS
- Extension `postgis` (schema `extensions`).
- GiST index on `complaints.location` (`complaints_location_gist_idx`).
- Functions: `ST_DWithin`, `ST_Distance`, `ST_MakePoint`, `ST_AsGeoJSON`.
- Used by: `nearby_complaints`, `nearby_complaints_heatmap`, `verifiable_complaints`, `find_similar_complaints`, `find_nearby_safety_places`, `get_map_complaints`, `get_hot_zones`, Express geospatial endpoints.

## 7. Nearby Complaints
- Mobile: `nearby_complaints(p_latitude, p_longitude, p_radius_meters default 1000, p_limit default 100)` RPC.
- Privacy-safe projection: no `user_id`, description truncated to 160 chars, approximate address, location as GeoJSON, ordered by distance.
- Radius options: 500m, 1km, 2km, 5km, 10km.

## 8. Radius Search
- `ST_DWithin(location, ST_MakePoint(lng,lat)::geography, radius_meters)`.
- GiST-indexed.

## 9. Complaint Markers
- Colored by `ComplaintStatus` (20 status→color mappings in mobile `map_screen.dart`; admin `StatusBadge`).
- Category icon + severity dot.
- Mobile: grid-based clustering below zoom 16.
- Admin: `supercluster` clustering.

## 10. Marker Details
- Mobile: bottom detail sheet (number, title, status/severity badges, distance, time, description, image, department, SLA status, View Details → complaint detail).
- Admin: `ComplaintPreviewPanel` on hover/select.

## 11. Heatmap
- Mobile: `nearby_complaints_heatmap` RPC (grid points with intensity). `_HeatmapLayer` renders `CircleMarker`s with green→yellow→orange→red gradient by intensity ratio. Toggle markers/heatmap/both.
- Admin: Mapbox GL JS heatmap layer + `MapLegend`.

## 12. Geographic Filtering
- Mobile: category/status filters + radius.
- Admin: status, severity, category, department, ward, SLA state, date, viewport bounds.

## 13. Department Jurisdiction [S]
- Departments have geographic coverage/jurisdiction (specified). Auto-assignment by jurisdiction is **specified but not confirmed implemented**.

## 14. Officer Proximity [S]
- Officer distance from complaint location for auto-assignment (specified). Not confirmed implemented.

## 15. Police Station Proximity [S]
- `find_nearby_safety_places` returns POLICE/HOSPITAL/SAFE_PLACE within radius. Closest police officer/station auto-dispatch is **specified but not confirmed implemented**.

## 16. Privacy
- Nearby queries: no `user_id`, truncated description, approximate address.
- Location precision setting (exact/block/ward/city).
- `clear_location_history` RPC.
- SOS location: shared only with trusted contacts + responders.
- Admin `CitizenInfoCard` role-gates contact details.
