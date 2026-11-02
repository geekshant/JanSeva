import { Search, X } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type {
  ComplaintStatus,
  ComplaintSeverity,
} from '@/types';
import { COMPLAINT_STATUSES, COMPLAINT_SEVERITIES } from '@/types';
import type { CategoryRow } from '@/types';
import type { SortField, SlaFilter } from '@/services/complaints';

export interface ComplaintFilters {
  search: string;
  status: ComplaintStatus | '';
  severity: ComplaintSeverity | '';
  categoryId: string;
  sla: SlaFilter;
  sort: SortField;
  dateFrom: string;
  dateTo: string;
}

export function ComplaintFiltersBar({
  filters,
  categories,
  onChange,
  onReset,
}: {
  filters: ComplaintFilters;
  categories: CategoryRow[];
  onChange: (patch: Partial<ComplaintFilters>) => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const hasActiveFilters =
    filters.search ||
    filters.status ||
    filters.severity ||
    filters.categoryId ||
    filters.sla !== 'all' ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      {/* Row 1: Search + Sort */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('complaints.searchPlaceholder')}
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-40">
          <Label className="mb-1 block text-xs text-muted-foreground">{t('complaints.sort')}</Label>
          <Select
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as SortField })}
          >
            <option value="newest">{t('complaints.newestFirst')}</option>
            <option value="oldest">{t('complaints.oldestFirst')}</option>
            <option value="priority">{t('complaints.highestPriority')}</option>
            <option value="sla">{t('complaints.slaDeadline')}</option>
          </Select>
        </div>
      </div>

      {/* Row 2: Filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('complaints.status')}</Label>
          <Select
            value={filters.status}
            onChange={(e) =>
              onChange({ status: e.target.value as ComplaintStatus | '' })
            }
          >
            <option value="">{t('complaints.allStatuses')}</option>
            {COMPLAINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s.toLowerCase()}`)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('complaints.priority')}</Label>
          <Select
            value={filters.severity}
            onChange={(e) =>
              onChange({ severity: e.target.value as ComplaintSeverity | '' })
            }
          >
            <option value="">{t('complaints.allPriorities')}</option>
            {COMPLAINT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {t(`severity.${s.toLowerCase()}`)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('complaints.category')}</Label>
          <Select
            value={filters.categoryId}
            onChange={(e) => onChange({ categoryId: e.target.value })}
          >
            <option value="">{t('complaints.allCategories')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('complaints.sla')}</Label>
          <Select
            value={filters.sla}
            onChange={(e) => onChange({ sla: e.target.value as SlaFilter })}
          >
            <option value="all">{t('complaints.all')}</option>
            <option value="on_track">{t('complaints.onTrack')}</option>
            <option value="due_soon">{t('complaints.dueSoon')}</option>
            <option value="overdue">{t('complaints.overdue')}</option>
            <option value="resolved">{t('complaints.resolved')}</option>
          </Select>
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('complaints.fromDate')}</Label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
          />
        </div>

        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t('complaints.toDate')}</Label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ dateTo: e.target.value })}
          />
        </div>

        {hasActiveFilters && (
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={onReset} className="w-full">
              <X className="h-4 w-4" />
              {t('common.clear')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
