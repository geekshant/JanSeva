import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  MoreHorizontal,
  Eye,
  UserPlus,
  ArrowRightCircle,
  AlertTriangle,
  MessageSquarePlus,
  Trash2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge, SeverityBadge } from '@/components/common/StatusBadge';
import { AiDecisionBadge } from '@/components/common/AiDecisionBadge';
import { AiAlertBadge, deriveAiAlerts } from '@/components/common/AiAlertBadge';
import { SlaBadge } from '@/components/common/SlaBadge';
import { EmptyState } from '@/components/common/EmptyState';
import type { ComplaintWithRelations, SlaState } from '@/types';
import { computeSlaState } from '@/types';

function timeAgo(iso: string, t: (k: string, o?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('time.justNow');
  if (mins < 60) return t('time.minAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hrAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('time.dayAgo', { count: days });
}

export interface ComplaintActions {
  onView: (id: string) => void;
  onAssign: (id: string) => void;
  onChangeStatus: (id: string) => void;
  onEscalate: (id: string) => void;
  onAddNote: (id: string) => void;
}

export function ComplaintsTable({
  complaints,
  loading,
  actions,
  selectedIds,
  onSelectionChange,
}: {
  complaints: ComplaintWithRelations[];
  loading: boolean;
  actions: ComplaintActions;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  if (complaints.length === 0) {
    return (
      <EmptyState
        title={t('complaints.noComplaintsFound')}
        description={t('complaints.noComplaintsFoundMsg')}
      />
    );
  }

  const allSelected = complaints.length > 0 && complaints.every((c) => selectedIds.has(c.id));
  const someSelected = complaints.some((c) => selectedIds.has(c.id)) && !allSelected;

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selectedIds);
      complaints.forEach((c) => next.delete(c.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      complaints.forEach((c) => next.add(c.id));
      onSelectionChange(next);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={toggleAll}
              aria-label="Select all"
            />
          </TableHead>
          <TableHead>{t('dashboard.tableId')}</TableHead>
          <TableHead>{t('dashboard.tableCategory')}</TableHead>
          <TableHead>{t('dashboard.tableTitle')}</TableHead>
          <TableHead>{t('dashboard.tableLocation')}</TableHead>
          <TableHead>{t('dashboard.tableReporter')}</TableHead>
          <TableHead>{t('dashboard.tableStatus')}</TableHead>
          <TableHead>{t('aiVerification.aiDecision')}</TableHead>
          <TableHead>{t('dashboard.tableAiAlert')}</TableHead>
          <TableHead>{t('dashboard.tablePriority')}</TableHead>
          <TableHead>{t('dashboard.tableSla')}</TableHead>
          <TableHead>{t('dashboard.tableCreated')}</TableHead>
          <TableHead className="text-right">{t('dashboard.tableActions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {complaints.map((c) => {
          const slaState: SlaState = computeSlaState(c.sla_deadline, c.status);
          const aiVer = c.complaint_ai_verification?.[0];
          const aiAlerts = deriveAiAlerts({
            aiDecision: aiVer?.ai_decision ?? null,
            aiStatus: aiVer?.status ?? null,
            categoryMatch: aiVer?.category_match ?? null,
            evidenceQuality: aiVer?.evidence_quality ?? null,
            imageCount: aiVer?.image_count ?? null,
          });
          const isSelected = selectedIds.has(c.id);
          return (
            <TableRow key={c.id} data-selected={isSelected}>
              <TableCell>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleRow(c.id)}
                  aria-label={`Select ${c.complaint_number}`}
                />
              </TableCell>
              <TableCell className="font-mono text-xs">
                <Link to={`/complaints/${c.id}`} className="text-primary hover:underline">
                  {c.complaint_number}
                </Link>
              </TableCell>
              <TableCell className="text-sm">{c.categories?.name ?? '—'}</TableCell>
              <TableCell className="max-w-[200px] truncate text-sm font-medium">
                {c.title}
              </TableCell>
              <TableCell className="max-w-[140px] truncate text-sm text-muted-foreground">
                {c.address ?? '—'}
              </TableCell>
              <TableCell className="text-sm">{c.profiles?.name ?? '—'}</TableCell>
              <TableCell>
                <StatusBadge status={c.status} />
              </TableCell>
              <TableCell>
                <AiDecisionBadge
                  decision={aiVer?.ai_decision ?? null}
                  aiStatus={aiVer?.status ?? null}
                  reason={aiVer?.reason ?? null}
                  categoryMatch={aiVer?.category_match ?? null}
                  evidenceQuality={aiVer?.evidence_quality ?? null}
                  imageCount={aiVer?.image_count ?? null}
                  detectedCategory={aiVer?.detected_category ?? null}
                  selectedCategory={aiVer?.selected_category ?? null}
                />
              </TableCell>
              <TableCell>
                <AiAlertBadge alerts={aiAlerts} />
              </TableCell>
              <TableCell>
                <SeverityBadge severity={c.severity} />
              </TableCell>
              <TableCell>
                <SlaBadge state={slaState} />
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {timeAgo(c.created_at, t)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t('dashboard.tableActions')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => actions.onView(c.id)}>
                      <Eye className="h-4 w-4" />
                      {t('complaints.actionView')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => actions.onAssign(c.id)}>
                      <UserPlus className="h-4 w-4" />
                      {t('complaints.actionAssign')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => actions.onChangeStatus(c.id)}>
                      <ArrowRightCircle className="h-4 w-4" />
                      {t('complaints.actionChangeStatus')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => actions.onEscalate(c.id)}>
                      <AlertTriangle className="h-4 w-4" />
                      {t('complaints.actionEscalate')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => actions.onAddNote(c.id)}>
                      <MessageSquarePlus className="h-4 w-4" />
                      {t('complaints.actionAddNote')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Bulk action bar — appears above the table when rows are selected
// ---------------------------------------------------------------------------

export function BulkActionBar({
  selectedCount,
  onDelete,
  onClear,
}: {
  selectedCount: number;
  onDelete: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2">
      <span className="text-sm font-medium">
        {t('complaints.bulkSelected', { count: selectedCount })}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onClear}>
          {t('common.clearSelection')}
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          {t('complaints.bulkDelete')}
        </Button>
      </div>
    </div>
  );
}
