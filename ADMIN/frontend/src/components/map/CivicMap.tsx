import { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from '@/i18n/translate';
import mapboxgl from 'mapbox-gl';
import Supercluster from 'supercluster';
import type { MapComplaint, MapBounds, MapViewMode } from '@/types/map';
import { getMarkerColor, toGeoJSONFeature, isValidCoordinate } from '@/types/map';

// ---------------------------------------------------------------------------
// CivicMap — Mapbox GL JS map with:
//   - Mode switcher: Markers / Heatmap / Markers + Heatmap
//   - Weighted heatmap (severity-based weight via PRIORITY_HEAT_WEIGHTS)
//   - Marker clustering (via supercluster) with cluster expansion on click
//   - Complaint preview popup on marker click
//   - Geographic filtering — calls onBoundsChange when the map moves
//   - Selected complaint highlight + flyTo
//   - Invalid coordinate filtering (malformed data is skipped, not crashing)
//   - autoFitOnFirstLoad: fits bounds to all complaints on first data load
//   - fitBounds imperative method via ref (for "Fit All Complaints" button)
//
// KEY ARCHITECTURE:
//   - The map instance is created ONCE and never recreated on state changes.
//   - Markers are native Mapbox markers anchored via setLngLat — the map
//     engine owns geographic positioning.
//   - Cluster markers are tracked in a ref and cleaned up on every re-render
//     (fixes orphaned-accumulator bug).
//   - Individual complaint markers use a diff strategy: existing markers stay
//     put, only new ones are added and stale ones removed — even in clustering
//     mode (fixes flicker/recreation churn).
//   - Supercluster is loaded once per data change, not per map move.
//   - selectedId changes update marker visuals + flyTo WITHOUT recreating
//     markers.
// ---------------------------------------------------------------------------

export interface CivicMapHandle {
  fitBounds: (complaints?: MapComplaint[]) => void;
}

interface CivicMapProps {
  complaints: MapComplaint[];
  loading: boolean;
  onBoundsChange?: (bounds: MapBounds) => void;
  onComplaintClick: (complaint: MapComplaint) => void;
  selectedId: string | null;
  viewMode: MapViewMode;
  enableClustering: boolean;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  autoFitOnFirstLoad?: boolean;
  /** Optional max bounds [[west, south], [east, north]] to restrict panning. */
  maxBounds?: [[number, number], [number, number]];
}

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? '';

const CLUSTER_RADIUS = 50;
const CLUSTER_MAX_ZOOM = 16;
const HEATMAP_LAYER_ID = 'complaints-heat';
const HEATMAP_SOURCE_ID = 'complaints-heat-source';

// Module-level defaults so the init effect doesn't re-run on every render
// (a new object literal default would create a new reference each render).
const DEFAULT_CENTER = { lat: 23.2597, lng: 77.4126 };
const DEFAULT_ZOOM = 12;

export const CivicMap = forwardRef<CivicMapHandle, CivicMapProps>(function CivicMap({
  complaints,
  loading,
  onBoundsChange,
  onComplaintClick,
  selectedId,
  viewMode,
  enableClustering,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
  autoFitOnFirstLoad = false,
  maxBounds,
}, ref) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const popupsRef = useRef<Record<string, mapboxgl.Popup>>({});
  const clusterMarkersRef = useRef<mapboxgl.Marker[]>([]); // tracks cluster markers for cleanup
  const superclusterRef = useRef<Supercluster | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Refs for values needed inside event handlers without re-triggering effects.
  const onComplaintClickRef = useRef(onComplaintClick);
  onComplaintClickRef.current = onComplaintClick;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const enableClusteringRef = useRef(enableClustering);
  enableClusteringRef.current = enableClustering;
  const showMarkersRef = useRef(viewMode === 'markers' || viewMode === 'both');
  showMarkersRef.current = viewMode === 'markers' || viewMode === 'both';

  // Ref to always call the latest renderClusters from the 'move' handler.
  const renderClustersRef = useRef<() => void>(() => {});

  const showHeatmap = viewMode === 'heatmap' || viewMode === 'both';
  const showMarkers = viewMode === 'markers' || viewMode === 'both';

  // Track whether we've done the initial auto-fit (only once).
  const hasAutoFittedRef = useRef(false);

  // Filter invalid coordinates.
  const validComplaints = useMemo(
    () => complaints.filter((c) => isValidCoordinate(c.lat, c.lng)),
    [complaints],
  );

  // Memoized GeoJSON features — shared by heatmap + clustering, rebuilt only
  // when the complaint data actually changes.
  const geoJsonFeatures = useMemo(
    () => validComplaints.map(toGeoJSONFeature),
    [validComplaints],
  );

  // Stable "data version" string — only changes when actual complaint IDs change.
  const dataVersion = useMemo(
    () => validComplaints.map((c) => c.id).join(','),
    [validComplaints],
  );

  // --- Initialize the map (ONCE) ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapboxgl.accessToken) {
      console.warn('[CivicMap] No VITE_MAPBOX_ACCESS_TOKEN set — map will not render.');
      return;
    }

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialCenter.lng, initialCenter.lat],
      zoom: initialZoom,
      maxBounds: maxBounds ?? undefined,
    });

    // 'load' fires when the map's style is fully loaded and the map is
    // ready for addSource/addLayer calls.
    map.on('load', () => {
      setMapReady(true);
      map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

      const b = map.getBounds();
      if (b) {
        onBoundsChange?.({
          west: b.getWest(), south: b.getSouth(),
          east: b.getEast(), north: b.getNorth(),
        });
      }
    });

    // Debounced bounds change on map moveend.
    let boundsTimer: ReturnType<typeof setTimeout> | null = null;
    map.on('moveend', () => {
      if (boundsTimer) clearTimeout(boundsTimer);
      boundsTimer = setTimeout(() => {
        const b = map.getBounds();
        if (b) {
          onBoundsChange?.({
            west: b.getWest(), south: b.getSouth(),
            east: b.getEast(), north: b.getNorth(),
          });
        }
      }, 300);
    });

    // Re-render clusters on map move (debounced) — only recomputes clusters,
    // does NOT clear individual complaint markers.
    let clusterTimer: ReturnType<typeof setTimeout> | null = null;
    map.on('move', () => {
      if (!enableClusteringRef.current || !showMarkersRef.current) return;
      if (clusterTimer) clearTimeout(clusterTimer);
      clusterTimer = setTimeout(() => renderClustersRef.current(), 150);
    });

    mapRef.current = map;

    return () => {
      if (boundsTimer) clearTimeout(boundsTimer);
      if (clusterTimer) clearTimeout(clusterTimer);
      clearAllMarkersRef.current();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onBoundsChange]);

  // --- Initialize supercluster (ONCE) ---
  useEffect(() => {
    superclusterRef.current = new Supercluster({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
    });
  }, []);

  // --- Load data into Supercluster when data changes (NOT on map move) ---
  useEffect(() => {
    if (!superclusterRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    superclusterRef.current.load(geoJsonFeatures as any[]);
  }, [geoJsonFeatures]);

  // --- Clear ALL markers (individual + cluster) ---
  const clearAllMarkers = useCallback(() => {
    Object.values(markersRef.current).forEach((m) => m.remove());
    Object.values(popupsRef.current).forEach((p) => p.remove());
    markersRef.current = {};
    popupsRef.current = {};
    clusterMarkersRef.current.forEach((m) => m.remove());
    clusterMarkersRef.current = [];
  }, []);

  // Ref alias for use in cleanup during init effect.
  const clearAllMarkersRef = useRef(clearAllMarkers);
  clearAllMarkersRef.current = clearAllMarkers;

  // --- Clear ONLY cluster markers (keep individual markers) ---
  const clearClusterMarkers = useCallback(() => {
    clusterMarkersRef.current.forEach((m) => m.remove());
    clusterMarkersRef.current = [];
  }, []);

  // --- Render individual complaint markers (non-clustering mode) ---
  // Diff strategy: remove stale, add new, leave existing untouched.
  const renderIndividualMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const currentIds = new Set(validComplaints.map((c) => c.id));
    const existingIds = new Set(Object.keys(markersRef.current));

    // Remove stale markers
    for (const id of existingIds) {
      if (!currentIds.has(id)) {
        markersRef.current[id]?.remove();
        popupsRef.current[id]?.remove();
        delete markersRef.current[id];
        delete popupsRef.current[id];
      }
    }

    // Add new markers
    for (const complaint of validComplaints) {
      if (markersRef.current[complaint.id]) continue;
      const coords: [number, number] = [complaint.lng, complaint.lat];
      renderSingleMarker(
        map, complaint, coords,
        onComplaintClickRef.current, selectedIdRef.current,
        markersRef, popupsRef,
      );
    }
  }, [validComplaints, mapReady, dataVersion]);

  // --- Render clusters (clustering mode) ---
  // Called on data change AND on map move. Only recomputes clusters —
  // individual leaf markers that are still visible are NOT cleared/recreated.
  const renderClusters = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !superclusterRef.current) return;

    // Clear ONLY cluster markers — keep individual markers (they'll be diffed).
    clearClusterMarkers();

    const zoom = Math.floor(map.getZoom());
    const b = map.getBounds();
    if (!b) return;
    const clusters = superclusterRef.current.getClusters(
      [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      zoom,
    );

    // Determine which complaint IDs are visible as individual (non-clustered) markers.
    const visibleLeafIds = new Set<string>();
    const leafsToAdd: { complaint: MapComplaint; coords: [number, number] }[] = [];

    clusters.forEach((cluster) => {
      const props = cluster.properties as {
        cluster?: boolean; point_count?: number; id?: string;
      };
      const coords = cluster.geometry.coordinates as [number, number];

      if (props.cluster) {
        const count = props.point_count ?? 0;
        const el = document.createElement('div');
        el.className = 'civic-map-cluster';
        el.style.cssText = `
          display:flex;align-items:center;justify-content:center;
          width:${count > 50 ? 52 : count > 10 ? 42 : 34}px;
          height:${count > 50 ? 52 : count > 10 ? 42 : 34}px;
          background:rgba(59,130,246,0.8);color:white;border-radius:50%;
          font-size:12px;font-weight:700;border:2px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;
          transition:transform 0.15s;
        `;
        el.textContent = String(count);
        el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)'; });
        el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
        el.addEventListener('click', () => {
          const clusterId = (cluster as { id?: number }).id;
          if (clusterId !== undefined && superclusterRef.current) {
            const expansionZoom = superclusterRef.current.getClusterExpansionZoom(clusterId);
            map.flyTo({ center: coords, zoom: expansionZoom, duration: 500 });
          }
        });
        const marker = new mapboxgl.Marker(el).setLngLat(coords).addTo(map);
        clusterMarkersRef.current.push(marker); // tracked for cleanup
      } else {
        const id = props.id ?? '';
        if (!id) return;
        visibleLeafIds.add(id);
        // Only add if not already on the map (diff)
        if (!markersRef.current[id]) {
          const complaint = validComplaints.find((c) => c.id === id);
          if (complaint) {
            leafsToAdd.push({ complaint, coords });
          }
        }
      }
    });

    // Remove individual markers that are no longer visible (outside viewport
    // or absorbed into a cluster) — but DON'T clear all of them.
    const existingIds = new Set(Object.keys(markersRef.current));
    for (const id of existingIds) {
      if (!visibleLeafIds.has(id)) {
        markersRef.current[id]?.remove();
        popupsRef.current[id]?.remove();
        delete markersRef.current[id];
        delete popupsRef.current[id];
      }
    }

    // Add newly visible leaf markers
    for (const { complaint, coords } of leafsToAdd) {
      renderSingleMarker(
        map, complaint, coords,
        onComplaintClickRef.current, selectedIdRef.current,
        markersRef, popupsRef,
      );
    }
  }, [validComplaints, mapReady, clearClusterMarkers]);

  // Keep renderClustersRef in sync so the 'move' handler calls the latest.
  renderClustersRef.current = renderClusters;

  // --- Imperative handle: fitBounds for parent components ---
  useImperativeHandle(ref, () => ({
    fitBounds: (complaintsToFit?: MapComplaint[]) => {
      const map = mapRef.current;
      if (!map || !mapReady) return;
      const targets = complaintsToFit ?? validComplaints;
      if (targets.length === 0) return;
      const bounds = new mapboxgl.LngLatBounds();
      let count = 0;
      for (const c of targets) {
        if (isValidCoordinate(c.lat, c.lng)) {
          bounds.extend([c.lng, c.lat]);
          count++;
        }
      }
      if (count === 0) return;
      if (count === 1) {
        const c = targets.find((c) => isValidCoordinate(c.lat, c.lng))!;
        map.flyTo({ center: [c.lng, c.lat], zoom: 16, duration: 500, essential: true });
      } else {
        map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
      }
    },
  }), [mapReady, validComplaints]);

  // --- Auto-fit on first data load ---
  useEffect(() => {
    if (!mapReady || !autoFitOnFirstLoad || hasAutoFittedRef.current) return;
    if (validComplaints.length === 0) return;
    hasAutoFittedRef.current = true;

    const doFit = () => {
      if (validComplaints.length === 1) {
        mapRef.current?.flyTo({
          center: [validComplaints[0].lng, validComplaints[0].lat],
          zoom: 16,
          duration: 500,
          essential: true,
        });
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        for (const c of validComplaints) {
          bounds.extend([c.lng, c.lat]);
        }
        mapRef.current?.fitBounds(bounds, { padding: 60, maxZoom: 16 });
      }
    };

    // fitBounds/flyTo don't require the style to be loaded, but we
    // ensure the map is ready to avoid edge-case errors.
    doFit();
  }, [mapReady, autoFitOnFirstLoad, validComplaints]);

  // --- Main marker rendering effect ---
  // Re-renders when: mode changes, clustering toggle changes, or data changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (!showMarkers) {
      clearAllMarkers();
      return;
    }

    if (enableClustering) {
      renderClusters();
    } else {
      clearClusterMarkers(); // remove any leftover cluster markers
      renderIndividualMarkers();
    }
  }, [showMarkers, enableClustering, mapReady, dataVersion, renderClusters, renderIndividualMarkers, clearAllMarkers, clearClusterMarkers]);

  // --- selectedId effect: flyTo + update marker visuals WITHOUT recreating ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !selectedId) return;

    const complaint = validComplaints.find((c) => c.id === selectedId);
    if (!complaint || !isValidCoordinate(complaint.lat, complaint.lng)) return;

    // Fly to the complaint location
    const coords: [number, number] = [complaint.lng, complaint.lat];
    map.flyTo({
      center: coords,
      zoom: Math.max(map.getZoom(), 16),
      duration: 700,
      essential: true,
    });
  }, [selectedId, mapReady, validComplaints]);

  // --- Update marker visual selection state WITHOUT recreating markers ---
  useEffect(() => {
    // Update existing marker DOM elements to reflect selection.
    for (const [id, marker] of Object.entries(markersRef.current)) {
      const el = marker.getElement();
      const isSelected = id === selectedId;
      const size = isSelected ? 18 : 14;
      // Only update if the size or selected state actually changed.
      if (el.dataset.selected !== String(isSelected)) {
        el.dataset.selected = String(isSelected);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.transform = isSelected ? 'scale(1.3)' : 'scale(1)';
        el.style.zIndex = isSelected ? '1' : '';
      }
    }
  }, [selectedId]);

  // --- Heatmap layer with severity weighting ---
  // Uses isStyleLoaded() + once('style.load') to defer safely without
  // triggering re-renders (no styleReady state).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    let cancelled = false;

    const applyHeatmap = () => {
      if (cancelled || !map) return;

      if (showHeatmap) {
        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: geoJsonFeatures,
        };

        if (map.getSource(HEATMAP_SOURCE_ID)) {
          (map.getSource(HEATMAP_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(geojson);
        } else {
          map.addSource(HEATMAP_SOURCE_ID, { type: 'geojson', data: geojson });
          map.addLayer({
            id: HEATMAP_LAYER_ID,
            type: 'heatmap',
            source: HEATMAP_SOURCE_ID,
            maxzoom: 15,
            paint: {
              'heatmap-weight': [
                'interpolate', ['linear'], ['get', 'weight'],
                0, 0, 1, 0.3, 2, 0.6, 3, 1, 5, 1.5,
              ],
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
              'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(59,130,246,0)',
                0.3, '#3b82f6',
                0.5, '#a78bfa',
                0.7, '#f59e0b',
                0.9, '#ef4444',
                1, '#dc2626',
              ],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 15, 50],
              'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 15, 0],
            },
          });
        }
      } else {
        if (map.getLayer(HEATMAP_LAYER_ID)) map.removeLayer(HEATMAP_LAYER_ID);
        if (map.getSource(HEATMAP_SOURCE_ID)) map.removeSource(HEATMAP_SOURCE_ID);
      }
    };

    if (map.isStyleLoaded()) {
      applyHeatmap();
    } else {
      // Style not loaded yet — defer once until it is.
      map.once('style.load', applyHeatmap);
    }

    return () => {
      cancelled = true;
    };
  }, [showHeatmap, geoJsonFeatures, mapReady]);

  // --- Resize map when showList or viewMode changes ---
  useEffect(() => {
    if (mapRef.current && mapReady) {
      // Small delay to let the DOM layout settle before resizing.
      const timer = setTimeout(() => mapRef.current?.resize(), 100);
      return () => clearTimeout(timer);
    }
  }, [showMarkers, mapReady]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* Token missing fallback */}
      {!mapboxgl.accessToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="max-w-md rounded-lg bg-background p-6 text-center shadow-lg">
            <h3 className="mb-2 text-sm font-semibold">{t('map.mapboxTokenRequired')}</h3>
            <p className="text-xs text-muted-foreground">
              {t('map.mapboxTokenDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && mapReady && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-md bg-background/90 px-3 py-1.5 text-xs font-medium shadow-md">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          {t('map.loading')}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Helper: render a single complaint marker with a popup
// ---------------------------------------------------------------------------
function renderSingleMarker(
  map: mapboxgl.Map,
  complaint: MapComplaint,
  coords: [number, number],
  onClick: (c: MapComplaint) => void,
  selectedId: string | null,
  markersRef: React.MutableRefObject<Record<string, mapboxgl.Marker>>,
  popupsRef: React.MutableRefObject<Record<string, mapboxgl.Popup>>,
) {
  const color = getMarkerColor(complaint.status, complaint.severity, complaint.sla_deadline);
  const isSelected = selectedId === complaint.id;
  const size = isSelected ? 18 : 14;

  const el = document.createElement('div');
  el.className = 'civic-map-marker';
  el.dataset.selected = String(isSelected);
  el.style.cssText = `
    width:${size}px;height:${size}px;background:${color};
    border-radius:50%;border:2px solid white;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);cursor:pointer;
    transition:transform 0.15s;
    ${isSelected ? 'z-index:1;transform:scale(1.3);' : ''}
  `;
  el.addEventListener('mouseenter', () => {
    el.style.transform = isSelected ? 'scale(1.4)' : 'scale(1.25)';
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = isSelected ? 'scale(1.3)' : 'scale(1)';
  });
  el.addEventListener('click', () => onClick(complaint));

  const popup = new mapboxgl.Popup({ offset: size, closeButton: false })
    .setHTML(`
      <div style="min-width:200px;padding:4px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>
          <span style="font-size:11px;font-weight:600;color:#6b7280;">${complaint.complaint_number}</span>
        </div>
        <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${escapeHtml(complaint.title)}</div>
        <div style="font-size:11px;color:#6b7280;">
          ${complaint.category_name ?? 'Uncategorized'} • ${complaint.severity}
        </div>
        ${complaint.ward ? `<div style="font-size:11px;color:#6b7280;">${escapeHtml(complaint.ward)}</div>` : ''}
      </div>
    `);

  const marker = new mapboxgl.Marker(el)
    .setLngLat(coords)
    .setPopup(popup)
    .addTo(map);

  markersRef.current[complaint.id] = marker;
  popupsRef.current[complaint.id] = popup;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
