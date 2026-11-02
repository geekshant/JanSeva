import { useMemo, useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent } from '@/components/ui/card';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { Pagination } from '@/components/common/Pagination';
import {
  ComplaintFiltersBar,
  type ComplaintFilters,
} from '@/components/complaints/ComplaintFiltersBar';
import {
  ComplaintsTable,
  BulkActionBar,
  type ComplaintActions,
} from '@/components/complaints/ComplaintsTable';
import { ChangeStatusDialog } from '@/components/complaints/ChangeStatusDialog';
import { AddNoteDialog } from '@/components/complaints/AddNoteDialog';
import { EscalateDialog } from '@/components/complaints/EscalateDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useComplaints, useUpdateComplaintStatus, useAddComplaintNote, useEscalateComplaint, useBulkDeleteComplaints } from '@/hooks/useComplaints';
import { useComplaintsRealtime } from '@/hooks/useRealtime';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import type { ComplaintStatus } from '@/types';
import type { SortField, SlaFilter } from '@/services/complaints';

const PAGE_LIMIT = 20;

function parseParams(searchParams: URLSearchParams): ComplaintFilters & { page: number } {
  return {
    search: searchParams.get('search') ?? '',
    status: (searchParams.get('status') as ComplaintStatus | '') ?? '',
    severity: (searchParams.get('severity') as '' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') ?? '',
    categoryId: searchParams.get('categoryId') ?? '',
    sla: (searchParams.get('sla') as SlaFilter) ?? 'all',
    sort: (searchParams.get('sort') as SortField) ?? 'newest',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
    page: parseInt(searchParams.get('page') ?? '1', 10) || 1,
  };
}

function buildSearchParams(filters: ComplaintFilters, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.sla !== 'all') params.set('sla', filters.sla);
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateFrom);
  if (page > 1) params.set('page', String(page));
  return params;
}

export function ComplaintsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t } = useTranslation();
  const categoriesQuery = useCategories();

  useComplaintsRealtime();

  const parsed = useMemo(() => parseParams(searchParams), [searchParams]);
  const { page, ...filterValues } = parsed;
  const filters = filterValues as ComplaintFilters;

  const complaintsQuery = useComplaints({
    page,
    limit: PAGE_LIMIT,
    search: filters.search || undefined,
    status: filters.status || undefined,
    severity: filters.severity || undefined,
    categoryId: filters.categoryId || undefined,
    sla: filters.sla,
    sort: filters.sort,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });

  const updateStatusMutation = useUpdateComplaintStatus();
  const addNoteMutation = useAddComplaintNote();
  const escalateMutation = useEscalateComplaint();
  const bulkDeleteMutation = useBulkDeleteComplaints();

  // Action dialog state
  const [actionType, setActionType] = useState<'status' | 'note' | 'escalate' | null>(null);
  const [actionComplaintId, setActionComplaintId] = useState<string | null>(null);
  const [actionCurrentStatus, setActionCurrentStatus] = useState<ComplaintStatus>('SUBMITTED');

  // Bulk selection + delete dialog state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');

  const updateUrl = useCallback(
    (patch: Partial<ComplaintFilters>, newPage?: number) => {
      const merged = { ...filters, ...patch };
      const p = newPage ?? (patch && Object.keys(patch).length > 0 ? 1 : page);
      const params = buildSearchParams(merged, p);
      setSearchParams(params, { replace: true });
    },
    [filters, page, setSearchParams],
  );

  const handleFilterChange = (patch: Partial<ComplaintFilters>) => {
    updateUrl(patch, 1);
  };

  const handleReset = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > (complaintsQuery.data?.totalPages ?? 1)) return;
    updateUrl({}, newPage);
  };

  // Action handlers
  const openAction = (type: 'status' | 'note' | 'escalate', complaintId: string) => {
    const complaint = complaintsQuery.data?.data.find((c) => c.id === complaintId);
    setActionType(type);
    setActionComplaintId(complaintId);
    setActionCurrentStatus(complaint?.status ?? 'SUBMITTED');
  };

  const actions: ComplaintActions = {
    onView: (id) => navigate(`/complaints/${id}`),
    onAssign: (id) => navigate(`/complaints/${id}?action=assign`),
    onChangeStatus: (id) => openAction('status', id),
    onEscalate: (id) => openAction('escalate', id),
    onAddNote: (id) => openAction('note', id),
  };

  const handleConfirmStatus = async (status: ComplaintStatus, comment: string) => {
    if (!actionComplaintId) return;
    await updateStatusMutation.mutateAsync({
      id: actionComplaintId,
      status,
      comment: comment || null,
      updatedBy: user?.id ?? null,
    });
  };

  const handleConfirmNote = async (note: string) => {
    if (!actionComplaintId) return;
    await addNoteMutation.mutateAsync({
      complaintId: actionComplaintId,
      note,
      updatedBy: user?.id ?? null,
    });
  };

  const handleConfirmEscalate = async (reason: string) => {
    if (!actionComplaintId) return;
    await escalateMutation.mutateAsync({
      id: actionComplaintId,
      reason,
      updatedBy: user?.id ?? null,
    });
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.size === 0 || !bulkDeleteReason.trim()) return;
    await bulkDeleteMutation.mutateAsync({
      complaintIds: Array.from(selectedIds),
      reason: bulkDeleteReason.trim(),
      deletedBy: user?.id ?? null,
    });
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    setBulkDeleteReason('');
  };

  return (
    <PageContainer
      title={t('complaints.title')}
      description={t('complaints.desc')}
    >
      <div className="space-y-4">
        {/* Filters */}
        <ComplaintFiltersBar
          filters={filters}
          categories={categoriesQuery.data ?? []}
          onChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* Bulk action bar (appears when rows are selected) */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          onDelete={() => setBulkDeleteOpen(true)}
          onClear={() => setSelectedIds(new Set())}
        />

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            {complaintsQuery.error ? (
              <ErrorState
                title={t('complaints.couldNotLoad')}
                message={complaintsQuery.error instanceof Error ? complaintsQuery.error.message : undefined}
                onRetry={() => void complaintsQuery.refetch()}
              />
            ) : (
              <>
                <ComplaintsTable
                  complaints={complaintsQuery.data?.data ?? []}
                  loading={complaintsQuery.isLoading}
                  actions={actions}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                />
                <Pagination
                  page={page}
                  totalPages={complaintsQuery.data?.totalPages ?? 1}
                  total={complaintsQuery.data?.total ?? 0}
                  limit={PAGE_LIMIT}
                  onPageChange={handlePageChange}
                />
              </>
            )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action dialogs */}
      <ChangeStatusDialog
        open={actionType === 'status'}
        onOpenChange={(open) => !open && setActionType(null)}
        currentStatus={actionCurrentStatus}
        role={role}
        onConfirm={handleConfirmStatus}
      />
      <AddNoteDialog
        open={actionType === 'note'}
        onOpenChange={(open) => !open && setActionType(null)}
        onConfirm={handleConfirmNote}
      />
      <EscalateDialog
        open={actionType === 'escalate'}
        onOpenChange={(open) => !open && setActionType(null)}
        onConfirm={handleConfirmEscalate}
      />

      {/* Bulk delete dialog */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open);
          if (!open) setBulkDeleteReason('');
        }}
        title={t('complaints.bulkDeleteTitle')}
        description={t('complaints.bulkDeleteConfirm', { count: selectedIds.size })}
        confirmLabel={t('complaints.bulkDelete')}
        variant="destructive"
        onConfirm={handleBulkDeleteConfirm}
      >
        <div className="space-y-2 py-2">
          <Label htmlFor="bulk-delete-reason">
            {t('complaints.bulkDeleteReasonLabel')}
          </Label>
          <Textarea
            id="bulk-delete-reason"
            placeholder={t('complaints.bulkDeleteReasonPlaceholder')}
            value={bulkDeleteReason}
            onChange={(e) => setBulkDeleteReason(e.target.value)}
            rows={3}
            autoFocus
          />
        </div>
      </ConfirmDialog>
    </PageContainer>
  );
}
