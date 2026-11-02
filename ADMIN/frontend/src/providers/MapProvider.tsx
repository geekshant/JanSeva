// ============================================================================
// MapProvider — abstraction layer for map and data hooks.
// ============================================================================
// The dashboard uses `useMapProvider()` to get the map component and data
// hooks. Previously this switched between a demo SVG map and the production
// Mapbox map; the demo map has been removed and the live Mapbox map
// (CivicMap) is now always used.
//
// Architecture:
//   DashboardPage → useMapProvider() → { MapComponent, useComplaints, ... }
//     → CivicMap (Mapbox GL JS) + Supabase RPC
// ============================================================================

import { useMemo, createContext, useContext, forwardRef, type ReactNode } from 'react';
import type { CategoryRow, DepartmentRow } from '@/types';
import type { DashboardMapComplaint, DashboardFilters, MapComplaint, MapBounds } from '@/types/map';
import { useDashboardComplaints } from '@/hooks/useDashboard';
import { useCategories as useRealCategories } from '@/hooks/useCategories';
import { useDepartments as useRealDepartments } from '@/hooks/useDepartments';
import { useUniqueWards as useRealWards } from '@/hooks/useMap';

// --- Map layers (kept for backward compat with DashboardPage controls) -------

export interface MapLayers {
  complaints: boolean;
  clusters: boolean;
  heatmap: boolean;
  aiInsights: boolean;
  wardBoundaries: boolean;
}

export const DEFAULT_LAYERS: MapLayers = {
  complaints: true,
  clusters: true,
  heatmap: false,
  aiInsights: false,
  wardBoundaries: true,
};

export type MockBhopalMapHandle = { fitBounds: (complaints?: MapComplaint[]) => void; resetView: () => void };

// --- Unified types ----------------------------------------------------------

export interface UnifiedMapHandle {
  fitBounds: (complaints?: MapComplaint[]) => void;
  resetView: () => void;
}

export interface UnifiedMapProps {
  complaints: MapComplaint[];
  loading: boolean;
  onBoundsChange?: (bounds: MapBounds) => void;
  onComplaintClick: (complaint: MapComplaint) => void;
  selectedId: string | null;
  activeLayers: MapLayers;
  onLayersChange?: (layers: MapLayers) => void;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  maxBounds?: [[number, number], [number, number]];
  aiHotspots?: unknown[];
  onHotspotClick?: (hotspot: { id: string; complaintIds: string[] }) => void;
}

interface ComplaintsQueryResult {
  data: DashboardMapComplaint[] | undefined;
  loading: boolean;
  error: Error | null;
}

interface MapProviderValue {
  mapMode: 'production';
  dataMode: 'production';
  isDemo: boolean;
  MapComponent: React.ForwardRefExoticComponent<
    UnifiedMapProps & React.RefAttributes<UnifiedMapHandle>
  >;
  useComplaints: (filters: DashboardFilters) => ComplaintsQueryResult;
  useCategories: () => { data: CategoryRow[] | undefined };
  useDepartments: () => { data: DepartmentRow[] | undefined };
  useWards: () => { data: string[] | undefined };
  useAiHotspots: (complaints: DashboardMapComplaint[] | undefined) => unknown[];
  defaultLayers: MapLayers;
}

// --- Context ----------------------------------------------------------------

const MapContext = createContext<MapProviderValue | null>(null);

export function useMapProvider(): MapProviderValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapProvider must be used within a MapProvider');
  return ctx;
}

// --- Production data hooks (thin wrappers) ----------------------------------

function useProdComplaints(filters: DashboardFilters): ComplaintsQueryResult {
  const query = useDashboardComplaints(filters);
  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error ?? null,
  };
}

function useProdCategories() {
  const query = useRealCategories();
  return { data: query.data };
}

function useProdDepartments() {
  const query = useRealDepartments();
  return { data: query.data };
}

function useProdWards() {
  const query = useRealWards();
  return { data: query.data };
}

function useProdAiHotspots(_complaints: DashboardMapComplaint[] | undefined): unknown[] {
  return [];
}

// --- Production map component (wraps CivicMap) ------------------------------
//
// Adapts the unified `UnifiedMapProps` to `CivicMapProps`:
//   - `activeLayers.heatmap` + `activeLayers.complaints` → `viewMode`
//   - `activeLayers.clusters` → `enableClustering`
//   - `aiHotspots` / `onHotspotClick` / `onLayersChange` are demo-only and
//     ignored here.
//   - The ref forwards `fitBounds` and adds a `resetView` that flies back to
//     the initial center/zoom.

import { CivicMap, type CivicMapHandle } from '@/components/map/CivicMap';
import type { MapViewMode } from '@/types/map';

const ProductionMapComponent = forwardRef<UnifiedMapHandle, UnifiedMapProps>(
  function ProductionMap(props, ref) {
    const {
      complaints,
      loading,
      onBoundsChange,
      onComplaintClick,
      selectedId,
      activeLayers,
      initialCenter,
      initialZoom,
      maxBounds,
    } = props;

    // Derive CivicMap viewMode from the layers flags.
    const showHeatmap = activeLayers.heatmap;
    const showMarkers = activeLayers.complaints;
    const viewMode: MapViewMode = showHeatmap && showMarkers
      ? 'both'
      : showHeatmap
        ? 'heatmap'
        : 'markers';

    const enableClustering = activeLayers.clusters;

    return (
      <CivicMap
        ref={ref as unknown as React.Ref<CivicMapHandle>}
        complaints={complaints}
        loading={loading}
        onBoundsChange={onBoundsChange}
        onComplaintClick={onComplaintClick}
        selectedId={selectedId}
        viewMode={viewMode}
        enableClustering={enableClustering}
        initialCenter={initialCenter}
        initialZoom={initialZoom}
        autoFitOnFirstLoad={false}
        maxBounds={maxBounds}
      />
    );
  },
);

// --- Provider ---------------------------------------------------------------

export function MapProvider({ children }: { children: ReactNode }) {
  const value: MapProviderValue = useMemo(() => {
    return {
      mapMode: 'production',
      dataMode: 'production',
      isDemo: false,
      MapComponent: ProductionMapComponent,
      useComplaints: useProdComplaints,
      useCategories: useProdCategories,
      useDepartments: useProdDepartments,
      useWards: useProdWards,
      useAiHotspots: useProdAiHotspots,
      defaultLayers: DEFAULT_LAYERS,
    };
  }, []);

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}
