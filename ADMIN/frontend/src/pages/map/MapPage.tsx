import { useState, useCallback } from 'react';
import { useTranslation } from '@/i18n/translate';
import {
  MapPin,
  Flame,
  Layers,
  PanelLeftClose,
  PanelLeft,
  Map as MapIcon,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { CivicMap } from '@/components/map/CivicMap';
import { MapFiltersBar } from '@/components/map/MapFiltersBar';
import { MapListPanel } from '@/components/map/MapListPanel';
import { MapLegend } from '@/components/map/MapLegend';
import { MapStats } from '@/components/map/MapStats';
import {
  useMapComplaints,
  useUniqueWards,
  DEFAULT_BOUNDS,
  BHOPAL_CENTER,
  BHOPAL_ZOOM,
} from '@/hooks/useMap';
import { useCategories } from '@/hooks/useCategories';
import { useDepartments } from '@/hooks/useDepartments';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import type { MapBounds, MapFilters, MapComplaint, MapViewMode } from '@/types/map';
import { DEFAULT_MAP_FILTERS } from '@/types/map';

export function MapPage() {
  const { t } = useTranslation();
  const [bounds, setBounds] = useState<MapBounds>(DEFAULT_BOUNDS);
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_MAP_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const [viewMode, setViewMode] = useState<MapViewMode>('both');
  const [enableClustering, setEnableClustering] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Data queries
  const categoriesQuery = useCategories();
  const departmentsQuery = useDepartments();
  const wardsQuery = useUniqueWards();
  const mapQuery = useMapComplaints(bounds, filters);

  const complaints = mapQuery.data?.complaints ?? [];
  const total = mapQuery.data?.total ?? 0;

  // Filter change handler
  const handleFilterChange = useCallback((patch: Partial<MapFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleFilterReset = useCallback(() => {
    setFilters(DEFAULT_MAP_FILTERS);
  }, []);

  // Bounds change from the map
  const handleBoundsChange = useCallback((newBounds: MapBounds) => {
    setBounds(newBounds);
  }, []);

  // Complaint click — select in list + on map
  const handleComplaintClick = useCallback((complaint: MapComplaint) => {
    setSelectedId(complaint.id);
  }, []);

  const filterProps = {
    filters,
    categories: categoriesQuery.data ?? [],
    departments: departmentsQuery.data ?? [],
    wards: wardsQuery.data ?? [],
    onChange: handleFilterChange,
    onReset: handleFilterReset,
  };

  return (
    <PageContainer
      title={t('map.title')}
      description={t('map.desc')}
    >
      <div className="space-y-3">
        {/* Desktop filters */}
        <div className="hidden lg:block">
          <MapFiltersBar {...filterProps} />
        </div>

        {/* Mobile filter trigger */}
        <div className="flex items-center justify-between lg:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t('map.filters')}
          </Button>
          <span className="text-xs text-muted-foreground">
            {t('map.complaintsInView', { count: complaints.length })}
          </span>
        </div>

        {/* Mobile filter drawer */}
        {mobileFiltersOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label={t('map.filters')}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setMobileFiltersOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-lg bg-background p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{t('map.filters')}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileFiltersOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <MapFiltersBar {...filterProps} />
              <Button
                className="mt-3 w-full"
                onClick={() => setMobileFiltersOpen(false)}
              >
                {t('map.applyFilters')}
              </Button>
            </div>
          </div>
        )}

        {/* Map + List Split View */}
        <div
          className="flex overflow-hidden rounded-lg border bg-card"
          style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}
        >
          {/* List Panel (left) — hidden on mobile */}
          {showList && (
            <div className="hidden w-[360px] shrink-0 border-r md:block">
              <MapListPanel
                complaints={complaints}
                loading={mapQuery.isLoading}
                total={total}
                selectedId={selectedId}
                onSelect={handleComplaintClick}
              />
            </div>
          )}

          {/* Map Panel */}
          <div className="relative flex-1">
            {/* Toolbar overlay — mode switcher + list toggle */}
            <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden bg-background/90 shadow-sm md:flex"
                onClick={() => setShowList((p) => !p)}
              >
                {showList ? (
                  <><PanelLeftClose className="h-4 w-4" /> {t('map.hideList')}</>
                ) : (
                  <><PanelLeft className="h-4 w-4" /> {t('map.showList')}</>
                )}
              </Button>

              {/* Mode switcher */}
              <div className="flex overflow-hidden rounded-md border bg-background/90 shadow-sm">
                <ModeButton
                  active={viewMode === 'markers'}
                  onClick={() => setViewMode('markers')}
                  icon={MapPin}
                  label={t('map.markers')}
                />
                <ModeButton
                  active={viewMode === 'heatmap'}
                  onClick={() => setViewMode('heatmap')}
                  icon={Flame}
                  label={t('map.heatmap')}
                />
                <ModeButton
                  active={viewMode === 'both'}
                  onClick={() => setViewMode('both')}
                  icon={Layers}
                  label={t('map.both')}
                />
              </div>

              <Button
                variant={enableClustering ? 'default' : 'outline'}
                size="sm"
                className="bg-background/90 shadow-sm"
                onClick={() => setEnableClustering((p) => !p)}
              >
                <Layers className="h-4 w-4" />
                {t('map.clustering')}
              </Button>
            </div>

            {/* Stats overlay */}
            <MapStats complaints={complaints} total={total} />

            {/* Legend — only when heatmap is visible */}
            {(viewMode === 'heatmap' || viewMode === 'both') && <MapLegend />}

            {/* Loading overlay */}
            {mapQuery.isLoading && (
              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <div className="flex items-center gap-2 rounded-lg bg-background/95 px-4 py-3 shadow-lg">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm font-medium">{t('map.loadingComplaints')}</span>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {mapQuery.error && (
              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <ErrorState
                  title={t('map.errorLoading')}
                  message={mapQuery.error instanceof Error ? mapQuery.error.message : undefined}
                  onRetry={() => void mapQuery.refetch()}
                />
              </div>
            )}

            {/* Empty state overlay */}
            {!mapQuery.isLoading && !mapQuery.error && complaints.length === 0 && (
              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <EmptyState
                  icon={MapIcon}
                  title={t('map.noComplaints')}
                  description={t('map.noComplaintsMsg')}
                />
              </div>
            )}

            <CivicMap
              complaints={complaints}
              loading={mapQuery.isLoading}
              onBoundsChange={handleBoundsChange}
              onComplaintClick={handleComplaintClick}
              selectedId={selectedId}
              viewMode={viewMode}
              enableClustering={enableClustering}
              initialCenter={BHOPAL_CENTER}
              initialZoom={BHOPAL_ZOOM}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Mode switcher button
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
