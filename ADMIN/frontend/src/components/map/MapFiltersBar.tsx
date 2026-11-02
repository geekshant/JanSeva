import { X, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ComplaintStatus, ComplaintSeverity } from '@/types';
import { COMPLAINT_STATUSES, COMPLAINT_SEVERITIES } from '@/types';
import type { CategoryRow, DepartmentRow } from '@/types';
import type { MapFilters, DateRangePreset } from '@/types/map';

export function MapFiltersBar({
  filters,
  categories,
  departments,
  wards,
  onChange,
  onReset,
}: {
  filters: MapFilters;
  categories: CategoryRow[];
  departments: DepartmentRow[];
  wards: string[];
  onChange: (patch: Partial<MapFilters>) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const hasActiveFilters =
    filters.status ||
    filters.severity ||
    filters.categoryId ||
    filters.departmentId ||
    filters.ward ||
    filters.sla !== 'all' ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.datePreset !== 'all';

  const handlePresetChange = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      onChange({ datePreset: 'custom' });
      return;
    }
    if (preset === 'all') {
      onChange({ datePreset: 'all', dateFrom: '', dateTo: '' });
      return;
    }
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    const days = preset === 'today' ? 0 : preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    onChange({ datePreset: preset, dateFrom: from, dateTo: to });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{t('map.filters')}</span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto h-7 px-2 text-xs">
            <X className="h-3 w-3" />
            {t('map.clear')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9">
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('map.filterStatus')}</Label>
          <Select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as ComplaintStatus | '' })}
          >
            <option value="">{t('map.allStatuses')}</option>
            {COMPLAINT_STATUSES.map((s) => (
              <option key={s} value={s}>{t('status.' + s.toLowerCase())}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('map.filterPriority')}</Label>
          <Select
            value={filters.severity}
            onChange={(e) => onChange({ severity: e.target.value as ComplaintSeverity | '' })}
          >
            <option value="">{t('map.allPriorities')}</option>
            {COMPLAINT_SEVERITIES.map((s) => (
              <option key={s} value={s}>{t('severity.' + s.toLowerCase())}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('map.filterCategory')}</Label>
          <Select
            value={filters.categoryId}
            onChange={(e) => onChange({ categoryId: e.target.value })}
          >
            <option value="">{t('map.allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('map.filterDepartment')}</Label>
          <Select
            value={filters.departmentId}
            onChange={(e) => onChange({ departmentId: e.target.value })}
          >
            <option value="">{t('map.allDepartments')}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('map.filterWard')}</Label>
          <Select
            value={filters.ward}
            onChange={(e) => onChange({ ward: e.target.value })}
          >
            <option value="">{t('map.allWards')}</option>
            {wards.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('map.filterSla')}</Label>
          <Select
            value={filters.sla}
            onChange={(e) => onChange({ sla: e.target.value as MapFilters['sla'] })}
          >
            <option value="all">{t('common.all')}</option>
            <option value="on_track">{t('slaState.onTrack')}</option>
            <option value="due_soon">{t('slaState.dueSoon')}</option>
            <option value="at_risk">{t('slaState.atRisk')}</option>
            <option value="breached">{t('slaState.breached')}</option>
            <option value="resolved">{t('slaState.resolved')}</option>
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('map.filterDateRange')}</Label>
          <Select
            value={filters.datePreset}
            onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
          >
            <option value="all">{t('map.allTime')}</option>
            <option value="today">{t('map.today')}</option>
            <option value="7d">{t('map.last7Days')}</option>
            <option value="30d">{t('map.last30Days')}</option>
            <option value="90d">{t('map.last90Days')}</option>
            <option value="custom">{t('map.customRange')}</option>
          </Select>
        </div>

        {filters.datePreset === 'custom' && (
          <>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">{t('map.filterFrom')}</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onChange({ dateFrom: e.target.value })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs text-muted-foreground">{t('map.filterTo')}</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onChange({ dateTo: e.target.value })}
              />
            </div>
          </>
        )}

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('map.filterDataSource')}</Label>
          <Select
            value={filters.dataSource}
            onChange={(e) => onChange({ dataSource: e.target.value as MapFilters['dataSource'] })}
          >
            <option value="complaints">{t('map.dataSourceComplaints')}</option>
            <option value="incidents">{t('map.dataSourceIncidents')}</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
