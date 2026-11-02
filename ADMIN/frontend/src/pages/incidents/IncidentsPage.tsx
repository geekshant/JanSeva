import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  AlertOctagon,
  Search,
  Users,
  FileText,
  Image,
  Plus,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useIncidents, useCreateIncident } from '@/hooks/useIncidents';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import { canManageIncidents } from '@/lib/workflow';
import { IncidentStatusBadge } from '@/components/common/IncidentStatusBadge';
import type { CivicIncidentRow, ComplaintSeverity } from '@/types';

const PAGE_LIMIT = 20;

export function IncidentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const canManage = canManageIncidents(role ?? 'OFFICER');
  const createMutation = useCreateIncident();

  const categoriesQuery = useCategories();
  const incidentsQuery = useIncidents({
    page,
    limit: PAGE_LIMIT,
    search: search || undefined,
    status: (status || undefined) as CivicIncidentRow['status'] | undefined,
    categoryId: categoryId || undefined,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  if (incidentsQuery.error) {
    return (
      <PageContainer title={t('incidents.title')}>
        <ErrorState
          title={t('incidents.couldNotLoad')}
          onRetry={() => void incidentsQuery.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t('incidents.title')}
      description={t('incidents.desc')}
      actions={
        canManage && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('incidents.create')}
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <form onSubmit={handleSearch} className="col-span-2 sm:col-span-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('incidents.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </form>
          <div>
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">{t('incidents.allStatuses')}</option>
              <option value="active">{t('incidents.active')}</option>
              <option value="merged">{t('incidents.merged')}</option>
              <option value="resolved">{t('incidents.resolved')}</option>
              <option value="closed">{t('incidents.closed')}</option>
            </Select>
          </div>
          <div>
            <Select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
              <option value="">{t('incidents.allCategories')}</option>
              {categoriesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Table */}
        {incidentsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : incidentsQuery.data && incidentsQuery.data.data.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('incidents.tableIncident')}</TableHead>
                    <TableHead>{t('incidents.tableTitle')}</TableHead>
                    <TableHead>{t('incidents.tableReports')}</TableHead>
                    <TableHead>{t('incidents.tableCitizens')}</TableHead>
                    <TableHead>{t('incidents.tablePhotos')}</TableHead>
                    <TableHead>{t('incidents.tableWard')}</TableHead>
                    <TableHead>{t('incidents.tableStatus')}</TableHead>
                    <TableHead>{t('incidents.tableCreated')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidentsQuery.data.data.map((incident) => {
                    return (
                      <TableRow
                        key={incident.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/incidents/${incident.id}`)}
                      >
                        <TableCell className="font-mono text-xs font-medium">
                          {incident.incident_number}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm font-medium">
                          {incident.title}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            {incident.report_count}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            {incident.citizen_count}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <Image className="h-3.5 w-3.5 text-muted-foreground" />
                            {incident.photo_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {incident.ward ?? '—'}
                        </TableCell>
                        <TableCell>
                          <IncidentStatusBadge status={incident.status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(incident.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <Pagination
              page={page}
              totalPages={incidentsQuery.data.totalPages}
              total={incidentsQuery.data.total}
              limit={PAGE_LIMIT}
              onPageChange={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={AlertOctagon}
            title={t('incidents.empty')}
            description={t('incidents.emptyMsg')}
          />
        )}
      </div>

      <CreateIncidentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={categoriesQuery.data ?? []}
        onCreate={async (input) => {
          const incident = await createMutation.mutateAsync({
            ...input,
            created_by: user?.id ?? null,
          });
          setCreateOpen(false);
          navigate(`/incidents/${incident.id}`);
        }}
        creating={createMutation.isPending}
      />
    </PageContainer>
  );
}

// ---------------------------------------------------------------------------
// Create Incident Dialog
// ---------------------------------------------------------------------------

function CreateIncidentDialog({
  open,
  onOpenChange,
  categories,
  onCreate,
  creating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string }[];
  onCreate: (input: {
    title: string;
    description?: string;
    category_id?: string;
    severity?: ComplaintSeverity;
    address?: string;
    ward?: string;
  }) => void;
  creating: boolean;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [severity, setSeverity] = useState<ComplaintSeverity>('MEDIUM');
  const [address, setAddress] = useState('');
  const [ward, setWard] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      description: description.trim() || undefined,
      category_id: categoryId || undefined,
      severity,
      address: address.trim() || undefined,
      ward: ward.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('incidents.createTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('incidents.createDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('incidents.titleLabel')}</label>
            <Input
              placeholder={t('incidents.titlePlaceholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">{t('incidents.descLabel')}</label>
            <Input
              placeholder={t('incidents.descPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t('incidents.category')}</label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('incidents.severity')}</label>
              <Select value={severity} onChange={(e) => setSeverity(e.target.value as ComplaintSeverity)}>
                <option value="LOW">{t('severity.low')}</option>
                <option value="MEDIUM">{t('severity.medium')}</option>
                <option value="HIGH">{t('severity.high')}</option>
                <option value="CRITICAL">{t('severity.critical')}</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">{t('incidents.address')}</label>
              <Input
                placeholder={t('incidents.addressPlaceholder')}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('incidents.ward')}</label>
              <Input
                placeholder={t('incidents.wardPlaceholder')}
                value={ward}
                onChange={(e) => setWard(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('incidents.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || creating}>
            {creating ? t('incidents.creating') : t('incidents.createBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
