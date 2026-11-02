import { useParams, Link } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { useTranslation } from '@/i18n/translate';
import {
  ArrowLeft,
  Users,
  FileText,
  Image as ImageIcon,
  MapPin,
  Building2,
  Unlink,
  Copy,
  Layers,
  Link2,
  GitMerge,
  Loader2,
  Search,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge, SeverityBadge } from '@/components/common/StatusBadge';
import { IncidentStatusBadge } from '@/components/common/IncidentStatusBadge';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  useIncident,
  useIncidentComplaints,
  useIncidentLinks,
  useIncidentPhotos,
  useUnlinkComplaint,
  useMarkAsDuplicate,
  useLinkComplaint,
  useMergeIncidents,
  usePotentialDuplicates,
  useIncidents,
} from '@/hooks/useIncidents';
import { useSignedImageUrls } from '@/hooks/useSignedImageUrls';
import { useAuth } from '@/hooks/useAuth';
import { canManageIncidents } from '@/lib/workflow';
import type { AdminRole } from '@/lib/workflow';
import type { ComplaintWithRelations, DuplicateLinkRow } from '@/types';
import { supabase } from '@/lib/supabase';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IncidentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();

  const incidentQuery = useIncident(id ?? '');
  const complaintsQuery = useIncidentComplaints(id ?? '');
  const linksQuery = useIncidentLinks(id ?? '');
  const photosQuery = useIncidentPhotos(id ?? '');

  const unlinkMutation = useUnlinkComplaint();
  const markDuplicateMutation = useMarkAsDuplicate();
  const linkMutation = useLinkComplaint();
  const mergeMutation = useMergeIncidents();

  const adminRole: AdminRole = role ?? 'OFFICER';
  const canManage = canManageIncidents(adminRole);

  // Dialog state
  const [linkOpen, setLinkOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linking, setLinking] = useState(false);
  const [mergeSearch, setMergeSearch] = useState('');
  const [merging, setMerging] = useState(false);

  // Potential duplicates — only for active incidents with a location.
  const geoPoint = parseGeoPoint(incidentQuery.data?.location);
  const duplicatesQuery = usePotentialDuplicates(
    geoPoint?.lat ?? 0,
    geoPoint?.lng ?? 0,
    undefined,
    canManage && incidentQuery.data?.status === 'active' && !!geoPoint,
  );
  const potentialDuplicates = duplicatesQuery.data ?? [];

  // Merge candidates — other active incidents (excluding this one).
  const mergeCandidatesQuery = useIncidents({ status: 'active', limit: 50 });
  const mergeCandidates = (mergeCandidatesQuery.data?.data ?? []).filter(
    (inc) => inc.id !== id,
  );

  const handleUnlink = useCallback(
    async (complaintId: string) => {
      if (!id) return;
      await unlinkMutation.mutateAsync({
        complaintId,
        incidentId: id,
        unlinkedBy: user?.id ?? null,
      });
    },
    [id, unlinkMutation, user],
  );

  const handleMarkDuplicate = useCallback(
    async (complaintId: string) => {
      if (!id) return;
      await markDuplicateMutation.mutateAsync({
        complaintId,
        incidentId: id,
        adminId: user?.id ?? null,
      });
    },
    [id, markDuplicateMutation, user],
  );

  const handleLinkComplaint = useCallback(
    async (complaintId: string) => {
      if (!id) return;
      setLinking(true);
      try {
        await linkMutation.mutateAsync({
          complaintId,
          incidentId: id,
          linkedBy: user?.id ?? null,
        });
        setLinkOpen(false);
        setLinkSearch('');
      } finally {
        setLinking(false);
      }
    },
    [id, linkMutation, user],
  );

  const handleMergeIncident = useCallback(
    async (sourceIncidentId: string) => {
      if (!id) return;
      setMerging(true);
      try {
        // Merge the selected source incident INTO this incident (target).
        await mergeMutation.mutateAsync({
          sourceIncidentId,
          targetIncidentId: id,
          adminId: user?.id ?? null,
        });
        setMergeOpen(false);
        setMergeSearch('');
      } finally {
        setMerging(false);
      }
    },
    [id, mergeMutation, user],
  );

  if (incidentQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </PageContainer>
    );
  }

  if (incidentQuery.error || !incidentQuery.data) {
    return (
      <PageContainer>
        <ErrorState title={t('incidents.notFound')} />
      </PageContainer>
    );
  }

  const incident = incidentQuery.data;
  const complaints = complaintsQuery.data ?? [];
  const links = linksQuery.data ?? [];
  const photos = photosQuery.data ?? [];
  const photoUrls = useSignedImageUrls(photos);

  // Build a map of complaint_id → link_type.
  const linkTypeMap = new Map<string, string>();
  links.forEach((l: DuplicateLinkRow) => {
    linkTypeMap.set(l.complaint_id, l.link_type);
  });

  return (
    <PageContainer>
      {/* Back link */}
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/incidents">
            <ArrowLeft className="h-4 w-4" />
            {t('incidents.back')}
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
              <IncidentStatusBadge status={incident.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                {incident.incident_number}
              </span>
              <SeverityBadge severity={incident.severity} />
              {incident.categories && (
                <span className="text-sm text-muted-foreground">
                  {incident.categories.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <StatItem icon={FileText} label={t('incidents.statReports')} value={incident.report_count} />
          <StatItem icon={Users} label={t('incidents.statCitizens')} value={incident.citizen_count} />
          <StatItem icon={ImageIcon} label={t('incidents.statPhotos')} value={incident.photo_count} />
          <StatItem icon={MapPin} label={t('incidents.statLocation')} value={incident.address ? 1 : 0} />
          <StatItem icon={Building2} label={t('incidents.statDepartment')} value={incident.departments ? 1 : 0} />
          <div className="col-span-2 sm:col-span-1">
            <span className="text-xs text-muted-foreground">{t('incidents.statCreated')}</span>
            <p className="text-sm font-medium">
              {formatDate(incident.created_at)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content — left 2/3 */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          {incident.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('incidents.description')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{incident.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Linked complaints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  {t('incidents.linkedComplaints', { count: complaints.length })}
                </span>
                {canManage && incident.status === 'active' && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
                      <Link2 className="h-4 w-4" />
                      {t('incidents.linkComplaint')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setMergeOpen(true)}>
                      <GitMerge className="h-4 w-4" />
                      {t('incidents.mergeIncident')}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {complaintsQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : complaints.length > 0 ? (
                <div className="space-y-2">
                  {complaints.map((c: ComplaintWithRelations) => {
                    const linkType = linkTypeMap.get(c.id) ?? 'original';
                    return (
                      <div
                        key={c.id}
                        className="flex items-start gap-3 rounded-md border p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/complaints/${c.id}`}
                              className="font-mono text-xs text-primary hover:underline"
                            >
                              {c.complaint_number}
                            </Link>
                            <StatusBadge status={c.status} />
                            <SeverityBadge severity={c.severity} />
                            {linkType === 'duplicate' && (
                              <Badge variant="secondary" className="text-[10px]">
                                <Copy className="mr-1 h-2.5 w-2.5" />
                                {t('incidents.duplicate')}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm font-medium">{c.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.profiles?.name ?? 'Unknown'} · {formatDate(c.created_at)}
                          </p>
                          {c.address && (
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {c.address}
                            </p>
                          )}
                        </div>
                        {canManage && (
                          <div className="flex shrink-0 flex-col gap-1">
                            {linkType !== 'duplicate' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkDuplicate(c.id)}
                                disabled={markDuplicateMutation.isPending}
                                className="h-7 text-xs"
                              >
                                <Copy className="h-3 w-3" />
                                {t('incidents.markDuplicate')}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlink(c.id)}
                              disabled={unlinkMutation.isPending}
                              className="h-7 text-xs text-destructive"
                            >
                              <Unlink className="h-3 w-3" />
                              {t('incidents.unlink')}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t('incidents.noLinked')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Evidence gallery */}
          {photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4" />
                  {t('incidents.evidence', { count: photos.length })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.map((photo) => {
                    const src = photoUrls[photo.id];
                    return (
                      <a
                        key={photo.id}
                        href={src ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted"
                      >
                        {src ? (
                        <img
                          src={src}
                          alt={t('complaints.evidenceImgAlt')}
                          className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                        />
                        ) : (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Potential duplicates — nearby unlinked complaints for admin review */}
          {canManage && incident.status === 'active' && geoPoint && (
            <PotentialDuplicatesPanel
              duplicates={potentialDuplicates}
              loading={duplicatesQuery.isLoading}
              onLink={handleLinkComplaint}
              linking={linking}
              linkedIds={new Set(complaints.map((c) => c.id))}
            />
          )}
        </div>

        {/* Sidebar — right 1/3 */}
        <div className="space-y-6">
          {/* Affected area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                {t('incidents.affectedArea')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {incident.address && (
                <div>
                  <span className="text-muted-foreground">{t('incidents.addressLabel')}</span>
                  <p className="font-medium">{incident.address}</p>
                </div>
              )}
              {incident.ward && (
                <div>
                  <span className="text-muted-foreground">{t('incidents.wardLabel')}</span>
                  <p className="font-medium">{incident.ward}</p>
                </div>
              )}
              {incident.departments && (
                <div>
                  <span className="text-muted-foreground">{t('incidents.departmentLabel')}</span>
                  <p className="font-medium">{incident.departments.name}</p>
                </div>
              )}
              {!incident.address && !incident.ward && (
                <p className="text-sm text-muted-foreground">{t('incidents.noLocation')}</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('incidents.timeline')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <TimelineItem
                label={t('incidents.incidentCreated')}
                date={incident.created_at}
              />
              {complaints.map((c) => (
                <TimelineItem
                  key={c.id}
                  label={t('incidents.reportRef', { number: c.complaint_number })}
                  date={c.created_at}
                  sub={c.title}
                />
              ))}
              {incident.status === 'resolved' && incident.updated_at !== incident.created_at && (
                <TimelineItem
                  label={t('incidents.incidentResolved')}
                  date={incident.updated_at}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Link Complaint Dialog */}
      <LinkComplaintDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        search={linkSearch}
        onSearchChange={setLinkSearch}
        onLink={handleLinkComplaint}
        linking={linking}
      />

      {/* Merge Incident Dialog */}
      <MergeIncidentDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        candidates={mergeCandidates}
        search={mergeSearch}
        onSearchChange={setMergeSearch}
        onMerge={handleMergeIncident}
        merging={merging}
        loading={mergeCandidatesQuery.isLoading}
      />
    </PageContainer>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  sub,
}: {
  label: string;
  date: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
        <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parses a PostGIS geography GeoJSON value into {lat, lng}. */
function parseGeoPoint(location: unknown): { lat: number; lng: number } | null {
  if (!location || typeof location !== 'object') return null;
  const obj = location as { coordinates?: unknown };
  const coords = obj.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = coords[0];
  const lat = coords[1];
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  return { lat, lng };
}

/** Computes a simple confidence score (0–100) from distance in meters. */
function confidenceFromDistance(distanceMeters: number | null): number {
  if (distanceMeters == null) return 0;
  if (distanceMeters <= 50) return 95;
  if (distanceMeters <= 200) return 80;
  if (distanceMeters <= 500) return 60;
  return 30;
}

// ---------------------------------------------------------------------------
// Potential Duplicates Panel
// ---------------------------------------------------------------------------

interface PotentialDuplicateItem {
  complaint_id: string;
  complaint_number: string;
  title: string;
  severity: string;
  status: string;
  address: string | null;
  ward: string | null;
  created_at: string;
  distance_meters: number | null;
}

function PotentialDuplicatesPanel({
  duplicates,
  loading,
  onLink,
  linking,
  linkedIds,
}: {
  duplicates: PotentialDuplicateItem[];
  loading: boolean;
  onLink: (complaintId: string) => void;
  linking: boolean;
  linkedIds: Set<string>;
}) {
  const { t } = useTranslation();
  const available = duplicates.filter((d) => !linkedIds.has(d.complaint_id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="h-4 w-4" />
          {t('incidents.potentialDuplicates', { count: available.length })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : available.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t('incidents.duplicatesHelper')}
            </p>
            {available.map((d) => {
              const confidence = confidenceFromDistance(d.distance_meters);
              return (
                <div
                  key={d.complaint_id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary">
                        {d.complaint_number}
                      </span>
                      <Badge
                        variant={confidence >= 80 ? 'default' : 'secondary'}
                        className="text-[10px]"
                      >
                        {t('incidents.confidenceMatch', { value: confidence })}
                      </Badge>
                      {d.distance_meters != null && (
                        <span className="text-xs text-muted-foreground">
                          {d.distance_meters < 1000
                            ? t('incidents.distanceM', { value: Math.round(d.distance_meters) })
                            : t('incidents.distanceKm', { value: (d.distance_meters / 1000).toFixed(1) })}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{d.title}</p>
                    {d.address && (
                      <p className="truncate text-xs text-muted-foreground">
                        {d.address}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLink(d.complaint_id)}
                    disabled={linking}
                    className="shrink-0"
                  >
                    <Link2 className="h-3 w-3" />
                    {t('incidents.link')}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('incidents.noDuplicates')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Link Complaint Dialog
// ---------------------------------------------------------------------------

function LinkComplaintDialog({
  open,
  onOpenChange,
  search,
  onSearchChange,
  onLink,
  linking,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onLink: (complaintId: string) => void;
  linking: boolean;
}) {
  const { t } = useTranslation();
  const [results, setResults] = useState<{ id: string; complaint_number: string; title: string; status: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async () => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await supabase
        .from('complaints')
        .select('id, complaint_number, title, status')
        .or(`complaint_number.ilike.%${search.trim()}%,title.ilike.%${search.trim()}%`)
        .is('incident_id', null)
        .limit(10);
      setResults((data ?? []) as { id: string; complaint_number: string; title: string; status: string }[]);
    } finally {
      setSearching(false);
    }
  }, [search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {t('incidents.linkDialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('incidents.linkDialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={t('incidents.linkPlaceholder')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            />
            <Button variant="outline" onClick={doSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {results.length > 0 && (
            <div className="space-y-1">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onLink(r.id)}
                  disabled={linking}
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-accent"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-primary">{r.complaint_number}</span>
                    <p className="truncate text-sm font-medium">{r.title}</p>
                  </div>
                  <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
          {search.trim() && results.length === 0 && !searching && (
            <p className="text-center text-sm text-muted-foreground">
              {t('incidents.noUnlinked')}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Merge Incident Dialog
// ---------------------------------------------------------------------------

function MergeIncidentDialog({
  open,
  onOpenChange,
  candidates,
  search,
  onSearchChange,
  onMerge,
  merging,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: { id: string; incident_number: string; title: string; report_count: number }[];
  search: string;
  onSearchChange: (s: string) => void;
  onMerge: (sourceIncidentId: string) => void;
  merging: boolean;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const filtered = search.trim()
    ? candidates.filter(
        (c) =>
          c.incident_number.toLowerCase().includes(search.trim().toLowerCase()) ||
          c.title.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : candidates;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5" />
            {t('incidents.mergeDialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('incidents.mergeDialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder={t('incidents.mergePlaceholder')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length > 0 ? (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {filtered.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => onMerge(inc.id)}
                  disabled={merging}
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-accent"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-primary">{inc.incident_number}</span>
                    <p className="truncate text-sm font-medium">{inc.title}</p>
                    <p className="text-xs text-muted-foreground">{t('complaints.reportsCount', { count: inc.report_count })}</p>
                  </div>
                  <GitMerge className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('incidents.noOtherIncidents')}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
