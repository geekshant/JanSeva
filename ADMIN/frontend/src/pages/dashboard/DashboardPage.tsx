import { useState, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { Search, Maximize2, Map as MapIcon, X, TrendingUp, TrendingDown, Minus, MapPin, Flame, Layers } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { DashboardFiltersBar } from '@/components/map/DashboardFiltersBar';
import { ComplaintPreviewPanel } from '@/components/map/ComplaintPreviewPanel';
import { MapLegend } from '@/components/map/MapLegend';
import { DashboardKpiRow } from '@/components/dashboard/DashboardKpiRow';
import { DashboardComplaintList } from '@/components/dashboard/DashboardComplaintList';
import { AiCivicInsights } from '@/components/dashboard/AiCivicInsights';
import { useNewComplaintsRealtime, useActivityFeedRealtime } from '@/hooks/useRealtime';
import { computeDashboardKpis } from '@/services/dashboard';
import type { DashboardFilters, DashboardMapComplaint, MapComplaint, MapBounds } from '@/types/map';
import { DEFAULT_DASHBOARD_FILTERS, toMapComplaint, isValidCoordinate } from '@/types/map';
import {
  useMapProvider,
  type UnifiedMapHandle,
  type MapLayers,
} from '@/providers/MapProvider';

const BHOPAL_CENTER = { lat: 23.2597, lng: 77.4126 };
const BHOPAL_ZOOM = 12;
const BHOPAL_MAX_BOUNDS: [[number, number], [number, number]] = [
  [77.25, 23.10],
  [77.60, 23.40],
];

export function DashboardPage() {
  const { t } = useTranslation();
  const {
    MapComponent,
    useComplaints,
    useCategories,
    useDepartments,
    useWards,
    useAiHotspots,
    defaultLayers,
  } = useMapProvider();

  // --- Centralized filter state (drives KPIs + map + list + insights) ---
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_DASHBOARD_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeLayers, setActiveLayers] = useState<MapLayers>(defaultLayers);
  const [hotspotEvidence, setHotspotEvidence] = useState<{ id: string; complaintIds: string[] } | null>(null);

  const mapRef = useRef<UnifiedMapHandle>(null);

  // --- Data (demo or production) ---
  const complaintsResult = useComplaints(filters);
  const categoriesResult = useCategories();
  const departmentsResult = useDepartments();
  const wardsResult = useWards();

  // Realtime (production mode only — harmless in demo)
  useNewComplaintsRealtime();
  useActivityFeedRealtime();

  const allComplaints = complaintsResult.data ?? [];

  // --- Search filtering (on top of the RPC/demo filter) ---
  const searchedComplaints = useMemo(() => {
    if (!search.trim()) return allComplaints;
    const q = search.trim().toLowerCase();
    return allComplaints.filter(
      (c) =>
        c.complaint_number.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.category_name?.toLowerCase().includes(q) ||
        c.ward?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q),
    );
  }, [allComplaints, search]);

  const kpis = useMemo(() => computeDashboardKpis(searchedComplaints), [searchedComplaints]);

  const mapComplaints: MapComplaint[] = useMemo(
    () =>
      searchedComplaints
        .filter((c) => c.has_location && isValidCoordinate(c.lat!, c.lng!))
        .map(toMapComplaint),
    [searchedComplaints],
  );

  const aiHotspots = useAiHotspots(searchedComplaints);

  const selectedComplaint = useMemo(
    () => searchedComplaints.find((c) => c.id === selectedId) ?? null,
    [searchedComplaints, selectedId],
  );

  // --- Handlers ---
  const handleFilterChange = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleFilterReset = useCallback(() => {
    setFilters(DEFAULT_DASHBOARD_FILTERS);
    setSearch('');
  }, []);

  const handleComplaintClick = useCallback((complaint: MapComplaint) => {
    setSelectedId(complaint.id);
  }, []);

  const handleListSelect = useCallback((complaint: DashboardMapComplaint) => {
    setSelectedId(complaint.id);
  }, []);

  const handleFitAll = useCallback(() => {
    mapRef.current?.fitBounds(mapComplaints);
  }, [mapComplaints]);

  const handleClosePreview = useCallback(() => setSelectedId(null), []);

  const handleBoundsChange = useCallback((_bounds: MapBounds) => {}, []);

  const handleLayersChange = useCallback((layers: MapLayers) => {
    setActiveLayers(layers);
  }, []);

  // Derive the current view mode from activeLayers for the mode switcher.
  const currentMode: 'markers' | 'heatmap' | 'both' =
    activeLayers.heatmap && activeLayers.complaints
      ? 'both'
      : activeLayers.heatmap
        ? 'heatmap'
        : 'markers';

  const handleModeChange = useCallback((mode: 'markers' | 'heatmap' | 'both') => {
    setActiveLayers((prev) => ({
      ...prev,
      complaints: mode === 'markers' || mode === 'both',
      heatmap: mode === 'heatmap' || mode === 'both',
    }));
  }, []);

  const handleToggleClustering = useCallback(() => {
    setActiveLayers((prev) => ({ ...prev, clusters: !prev.clusters }));
  }, []);

  const handleHotspotClick = useCallback((hotspot: { id: string; complaintIds: string[] }) => {
    setHotspotEvidence(hotspot);
  }, []);

  const filterProps = {
    filters,
    categories: categoriesResult.data ?? [],
    departments: departmentsResult.data ?? [],
    wards: wardsResult.data ?? [],
    onChange: handleFilterChange,
    onReset: handleFilterReset,
  };

  const hasError = complaintsResult.error;

  return (
    <PageContainer title={t('dashboard.title')} description={t('dashboard.civicCommandCenter')}>
      {hasError ? (
        <ErrorState
          title={t('dashboard.couldNotLoad')}
          message={complaintsResult.error instanceof Error ? complaintsResult.error.message : undefined}
        />
      ) : (
        <div className="space-y-4">
          {/* KPI Row */}
          <DashboardKpiRow kpis={kpis} loading={complaintsResult.loading} />

          {/* Search + Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search complaints by ID, category, ward, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background pl-10 pr-4 text-sm shadow-sm focus:ring-1 focus:ring-primary"
              />
              {search && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <DashboardFiltersBar {...filterProps} />
          </div>

          {/* Civic Map */}
          <div
            className="relative overflow-hidden rounded-lg border bg-card"
            style={{ height: 'calc(100vh - 420px)', minHeight: '450px' }}
          >
            {/* Toolbar (top-left): Fit All + Mode switcher + Clustering */}
            <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-background/90 shadow-sm"
                onClick={handleFitAll}
              >
                <Maximize2 className="h-4 w-4" />
                {t('map.fitAll')}
              </Button>

              {/* Mode switcher */}
              <div className="flex overflow-hidden rounded-md border bg-background/90 shadow-sm">
                <ModeButton
                  active={currentMode === 'markers'}
                  onClick={() => handleModeChange('markers')}
                  icon={MapPin}
                  label={t('map.markers')}
                />
                <ModeButton
                  active={currentMode === 'heatmap'}
                  onClick={() => handleModeChange('heatmap')}
                  icon={Flame}
                  label={t('map.heatmap')}
                />
                <ModeButton
                  active={currentMode === 'both'}
                  onClick={() => handleModeChange('both')}
                  icon={Layers}
                  label={t('map.both')}
                />
              </div>

              {/* Clustering toggle */}
              <Button
                variant={activeLayers.clusters ? 'default' : 'outline'}
                size="sm"
                className="bg-background/90 shadow-sm"
                onClick={handleToggleClustering}
              >
                <Layers className="h-4 w-4" />
                {t('map.clustering')}
              </Button>
            </div>

            {/* Stats overlay (top-right, below controls) */}
            <div className="absolute right-3 top-3 z-20 rounded-md bg-background/90 px-3 py-1.5 text-xs shadow-sm">
              <span className="font-medium">{t('map.complaintsInView', { count: mapComplaints.length })}</span>
              {kpis.locationUnavailable > 0 && (
                <span className="ml-2 text-muted-foreground">
                  {kpis.locationUnavailable} {t('map.locationUnavailable')}
                </span>
              )}
            </div>

            {/* Loading overlay */}
            {complaintsResult.loading && (
              <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                <div className="flex items-center gap-2 rounded-lg bg-background/95 px-4 py-3 shadow-lg">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm font-medium">{t('map.loadingComplaints')}</span>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!complaintsResult.loading && mapComplaints.length === 0 && searchedComplaints.length === 0 && (
              <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
                <EmptyState icon={MapIcon} title={t('map.noComplaints')} description={t('map.noComplaintsMsg')} />
              </div>
            )}

            {/* The Map */}
            <MapComponent
              ref={mapRef}
              complaints={mapComplaints}
              loading={complaintsResult.loading}
              onBoundsChange={handleBoundsChange}
              onComplaintClick={handleComplaintClick}
              selectedId={selectedId}
              activeLayers={activeLayers}
              onLayersChange={handleLayersChange}
              initialCenter={BHOPAL_CENTER}
              initialZoom={BHOPAL_ZOOM}
              maxBounds={BHOPAL_MAX_BOUNDS}
              aiHotspots={aiHotspots}
              onHotspotClick={handleHotspotClick}
            />

            {/* Legend — only when heatmap is visible */}
            {(currentMode === 'heatmap' || currentMode === 'both') && <MapLegend />}

            {/* Complaint Preview Panel */}
            {selectedComplaint && (
              <ComplaintPreviewPanel complaint={selectedComplaint} onClose={handleClosePreview} />
            )}
          </div>

          {/* Bottom section — Complaint List + AI Insights */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DashboardComplaintList
                complaints={searchedComplaints}
                loading={complaintsResult.loading}
                selectedId={selectedId}
                onSelect={handleListSelect}
              />
            </div>
            <AiCivicInsights complaints={searchedComplaints} loading={complaintsResult.loading} />
          </div>

          {/* AI Hotspot Evidence Modal */}
          {hotspotEvidence && (
            <HotspotEvidenceModal
              complaintIds={hotspotEvidence.complaintIds}
              complaints={searchedComplaints}
              onClose={() => setHotspotEvidence(null)}
              onViewComplaint={(id) => {
                setSelectedId(id);
                setHotspotEvidence(null);
              }}
            />
          )}
        </div>
      )}
    </PageContainer>
  );
}

// --- AI Hotspot Evidence Modal -----------------------------------------------

function HotspotEvidenceModal({
  complaintIds,
  complaints,
  onClose,
  onViewComplaint,
}: {
  complaintIds: string[];
  complaints: DashboardMapComplaint[];
  onClose: () => void;
  onViewComplaint: (id: string) => void;
}) {
  const hotspotComplaints = useMemo(
    () => complaints.filter((c) => complaintIds.includes(c.id)),
    [complaints, complaintIds],
  );

  const category = hotspotComplaints[0]?.category_name ?? 'Unknown';
  const ward = hotspotComplaints[0]?.ward ?? 'Unknown';

  // Determine trend
  const now = Date.now();
  const recent = hotspotComplaints.filter(
    (c) => now - new Date(c.created_at).getTime() < 30 * 86400000,
  ).length;
  const trend = recent > hotspotComplaints.length * 0.5 ? 'increasing' : recent < hotspotComplaints.length * 0.3 ? 'decreasing' : 'stable';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-base font-semibold">AI Hotspot Evidence</h3>
            <p className="text-xs text-muted-foreground">
              {category} · {ward} · {hotspotComplaints.length} complaints
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b px-4 py-2">
          <span className="text-xs font-medium text-muted-foreground">Trend:</span>
          {trend === 'increasing' ? (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600">
              <TrendingUp className="h-3.5 w-3.5" /> Increasing
            </span>
          ) : trend === 'decreasing' ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <TrendingDown className="h-3.5 w-3.5" /> Decreasing
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <Minus className="h-3.5 w-3.5" /> Stable
            </span>
          )}
          <span className="text-xs text-muted-foreground">· Recurring complaint pattern detected</span>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Title</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {hotspotComplaints.map((c) => (
                <tr key={c.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{c.complaint_number}</td>
                  <td className="max-w-[200px] truncate px-4 py-2 text-xs">{c.title}</td>
                  <td className="px-4 py-2 text-xs">{c.status}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      to={`/complaints/${c.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => onViewComplaint(c.id)}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode switcher button (markers / heatmap / both)
// ---------------------------------------------------------------------------
function ModeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof MapPin;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent'
      }`}
      aria-pressed={active}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
