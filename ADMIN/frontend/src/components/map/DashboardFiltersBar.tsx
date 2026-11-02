import { X, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { ComplaintStatus, ComplaintSeverity } from '@/types';
import { COMPLAINT_STATUSES, COMPLAINT_SEVERITIES } from '@/types';
import type { CategoryRow, DepartmentRow } from '@/types';
import type { DashboardFilters, DateRangePreset } from '@/types/map';

export function DashboardFiltersBar({
  filters,
  categories,
  departments,
  wards,
  onChange,
  onReset,
}: {
  filters: DashboardFilters;
  categories: CategoryRow[];
  departments: DepartmentRow[];
  wards: string[];
  onChange: (patch: Partial<DashboardFilters>) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const hasActiveFilters =
    filters.status ||
    filters.severity ||
    filters.categoryId ||
    filters.departmentId ||
    filters.ward ||
    filters.datePreset !== '30d';

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
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        {t('dashboard.filters')}
      </div>

      <FilterItem label={t('map.filterStatus')}>
        <Select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as ComplaintStatus | '' })}
          className="h-8 text-xs"
        >
          <option value="">{t('map.allStatuses')}</option>
          {COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>{t('status.' + s.toLowerCase())}</option>
          ))}
        </Select>
      </FilterItem>

      <FilterItem label={t('map.filterCategory')}>
        <Select
          value={filters.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
          className="h-8 text-xs"
        >
          <option value="">{t('map.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </FilterItem>

      <FilterItem label={t('map.filterDepartment')}>
        <Select
          value={filters.departmentId}
          onChange={(e) => onChange({ departmentId: e.target.value })}
          className="h-8 text-xs"
        >
          <option value="">{t('map.allDepartments')}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </Select>
      </FilterItem>

      <FilterItem label={t('map.filterWard')}>
        <Select
          value={filters.ward}
          onChange={(e) => onChange({ ward: e.target.value })}
          className="h-8 text-xs"
        >
          <option value="">{t('map.allWards')}</option>
          {wards.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </Select>
      </FilterItem>

      <FilterItem label={t('map.filterPriority')}>
        <Select
          value={filters.severity}
          onChange={(e) => onChange({ severity: e.target.value as ComplaintSeverity | '' })}
          className="h-8 text-xs"
        >
          <option value="">{t('map.allPriorities')}</option>
          {COMPLAINT_SEVERITIES.map((s) => (
            <option key={s} value={s}>{t('severity.' + s.toLowerCase())}</option>
          ))}
        </Select>
      </FilterItem>

      <FilterItem label={t('map.filterDateRange')}>
        <Select
          value={filters.datePreset}
          onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
          className="h-8 text-xs"
        >
          <option value="all">{t('map.allTime')}</option>
          <option value="today">{t('map.today')}</option>
          <option value="7d">{t('map.last7Days')}</option>
          <option value="30d">{t('map.last30Days')}</option>
          <option value="90d">{t('map.last90Days')}</option>
          <option value="custom">{t('map.customRange')}</option>
        </Select>
      </FilterItem>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-8 px-2 text-xs">
          <X className="h-3 w-3" />
          {t('map.clear')}
        </Button>
      )}
    </div>
  );
}

function FilterItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-[140px]">
      <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
