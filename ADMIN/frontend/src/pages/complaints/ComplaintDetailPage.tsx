import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from '@/i18n/translate';
import {
  ArrowLeft,
  AlertTriangle,
  MessageSquarePlus,
  ArrowRightCircle,
  UserPlus,
  FileText,
  Layers,
  Link2,
  Bot,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { StatusBadge, SeverityBadge } from '@/components/common/StatusBadge';
import { SlaBadge } from '@/components/common/SlaBadge';
import { ChangeStatusDialog } from '@/components/complaints/ChangeStatusDialog';
import { AddNoteDialog } from '@/components/complaints/AddNoteDialog';
import { EscalateDialog } from '@/components/complaints/EscalateDialog';
import { AssignmentDialog } from '@/components/complaints/AssignmentDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { GoogleMapsLocation } from '@/components/complaints/GoogleMapsLocation';
import { EvidenceGallery } from '@/components/complaints/EvidenceGallery';
import { CitizenInfoCard } from '@/components/complaints/CitizenInfoCard';
import { WorkflowTimeline } from '@/components/complaints/WorkflowTimeline';
import { ResolutionEvidencePanel } from '@/components/complaints/ResolutionEvidencePanel';
import { CommunityVerificationPanel } from '@/components/complaints/CommunityVerificationPanel';
import { AiVerificationPanel } from '@/components/complaints/AiVerificationPanel';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  useComplaint,
  useComplaintHistory,
  useUpdateComplaintStatus,
  useAddComplaintNote,
  useEscalateComplaint,
  useAssignComplaint,
} from '@/hooks/useComplaints';
import {
  useComplaintDetailRealtime,
  useComplaintHistoryRealtime,
  useComplaintImagesRealtime,
} from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { canAssign, canEscalate, canAddNote, canManageIncidents } from '@/lib/workflow';
import { useIncidents, useLinkComplaint, useUnlinkComplaint } from '@/hooks/useIncidents';
import { useComplaintAutomationHistory } from '@/hooks/useAutomation';
import { computeSlaState } from '@/types';
import type { ComplaintStatus } from '@/types';
import type { AdminRole } from '@/lib/workflow';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type DialogType = 'status' | 'note' | 'escalate' | 'assign' | null;

export function ComplaintDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const complaintQuery = useComplaint(id ?? '');
  const historyQuery = useComplaintHistory(id ?? '');
  const automationHistoryQuery = useComplaintAutomationHistory(id);

  // Realtime: update complaint detail, history, and images when they change.
  useComplaintDetailRealtime(id ?? '');
  useComplaintHistoryRealtime(id ?? '');
  useComplaintImagesRealtime(id ?? '');

  const updateStatusMutation = useUpdateComplaintStatus();
  const addNoteMutation = useAddComplaintNote();
  const escalateMutation = useEscalateComplaint();
  const assignMutation = useAssignComplaint();

  const [dialog, setDialog] = useState<DialogType>(null);

  // Incident linking
  const canManageInc = canManageIncidents(role ?? 'OFFICER');
  const linkMutation = useLinkComplaint();
  const unlinkMutation = useUnlinkComplaint();
  const incidentsQuery = useIncidents({ status: 'active', limit: 50, search: undefined });
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);

  // Loading state
  if (complaintQuery.isLoading) {
    return (
      <PageContainer>
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // Error / not found — distinguish between a query error (network/schema/RLS)
  // and a genuinely missing complaint so the admin sees the real problem.
  if (complaintQuery.error) {
    return (
      <PageContainer>
        <ErrorState
          title={t('complaints.couldNotLoad')}
          message={complaintQuery.error instanceof Error ? complaintQuery.error.message : undefined}
          onRetry={() => void complaintQuery.refetch()}
        />
      </PageContainer>
    );
  }

  if (!complaintQuery.data) {
    return (
      <PageContainer>
        <ErrorState
          title={t('complaints.complaintNotFound')}
          message={t('complaints.complaintNotFoundMsg')}
        />
      </PageContainer>
    );
  }

  const complaint = complaintQuery.data;
  const slaState = computeSlaState(complaint.sla_deadline, complaint.status);
  const adminRole: AdminRole | null = role;

  return (
    <PageContainer>
      {/* Back link */}
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/complaints">
            <ArrowLeft className="h-4 w-4" />
            {t('complaints.backToComplaints')}
          </Link>
        </Button>
      </div>

      {/* ===== Header ===== */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{complaint.title}</h1>
              <StatusBadge status={complaint.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                {complaint.complaint_number}
              </span>
              <span className="text-sm text-muted-foreground">
                {complaint.categories?.name ?? t('common.uncategorized')}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={complaint.severity} />
            <SlaBadge state={slaState} />
          </div>
        </div>

        {/* Workflow visual timeline */}
        <WorkflowTimeline
          currentStatus={complaint.status}
          history={historyQuery.data ?? []}
          loading={historyQuery.isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== Main content — left 2/3 ===== */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {t('complaints.description')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {complaint.description ?? t('complaints.noDescription')}
              </p>
            </CardContent>
          </Card>

          {/* AI Verification Panel — shown when the complaint went through the
              AI evidence verification workflow. */}
          {['AI_CHECKING', 'AI_VERIFIED', 'AI_REVIEW_REQUIRED', 'AI_FAILED', 'EVIDENCE_REQUIRED'].includes(
            complaint.status,
          ) && <AiVerificationPanel complaintId={complaint.id} status={complaint.status} />}

          {/* Evidence Gallery */}
          {complaint.complaint_images && complaint.complaint_images.length > 0 && (
            <EvidenceGallery images={complaint.complaint_images} />
          )}

          {/* Google Maps Location */}
          <GoogleMapsLocation
            address={complaint.address}
            location={complaint.location}
          />

          {/* Status History Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('complaints.statusHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              {historyQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : historyQuery.data && historyQuery.data.length > 0 ? (
                <div className="relative space-y-4">
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                  {historyQuery.data.map((entry) => (
                    <div key={entry.id} className="relative flex items-start gap-3">
                      <div className="z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-card">
                        <ArrowRightCircle className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={entry.status} />
                          <span className="text-xs text-muted-foreground">
                            {formatDate(entry.created_at)}
                          </span>
                        </div>
                        {entry.comment && (
                          <p className="text-sm text-muted-foreground">{entry.comment}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('complaints.noStatusHistory')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Resolution Evidence (before/after images + metadata) */}
          <ResolutionEvidencePanel
            complaintId={complaint.id}
            beforeImages={complaint.complaint_images ?? []}
            resolved={complaint.status === 'RESOLVED' || complaint.verification_status !== null}
            role={adminRole}
          />

          {/* Automation History — "Why did this status change?" */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4 text-primary" />
                {t('complaints.automationHistory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {automationHistoryQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : automationHistoryQuery.data && automationHistoryQuery.data.length > 0 ? (
                <div className="relative space-y-4">
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
                  {automationHistoryQuery.data.map((entry) => (
                    <div key={entry.id} className="relative flex items-start gap-3">
                      <div className="z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-card">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {entry.action_type.replace(/_/g, ' ').toLowerCase()}
                          </Badge>
                          {entry.previous_status && entry.new_status && (
                            <span className="text-xs text-muted-foreground">
                              {t('status.' + entry.previous_status.toLowerCase())} → {t('status.' + entry.new_status.toLowerCase())}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(entry.executed_at)}
                          </span>
                        </div>
                        {entry.reason && (
                          <p className="text-sm text-muted-foreground">{entry.reason}</p>
                        )}
                        {entry.confidence !== null && (
                          <p className="text-xs text-muted-foreground">
                            {t('complaints.confidence', { value: Math.round(entry.confidence * 100) })}
                          </p>
                        )}
                        {entry.rule_name && (
                          <p className="text-xs font-medium text-primary">
                            {t('complaints.rule', { name: entry.rule_name })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('complaints.noAutomationHistory')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Community Verification (responses, percentage, reopen) */}
          <CommunityVerificationPanel
            complaintId={complaint.id}
            resolved={complaint.status === 'RESOLVED' || complaint.verification_status !== null}
            role={adminRole}
          />
        </div>

        {/* ===== Sidebar — right 1/3 ===== */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('complaints.actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full"
                variant="default"
                onClick={() => setDialog('status')}
                disabled={adminRole === null}
              >
                <ArrowRightCircle className="h-4 w-4" />
                {t('complaints.changeStatus')}
              </Button>
              {canAssign(adminRole ?? 'OFFICER') && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setDialog('assign')}
                >
                  <UserPlus className="h-4 w-4" />
                  {complaint.status === 'ASSIGNED' || complaint.status === 'IN_PROGRESS'
                    ? t('complaints.reassign')
                    : t('complaints.assign')}
                </Button>
              )}
              {canAddNote(adminRole ?? 'OFFICER') && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setDialog('note')}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  {t('complaints.addNote')}
                </Button>
              )}
              {canEscalate(adminRole ?? 'OFFICER') && (
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => setDialog('escalate')}
                >
                  <AlertTriangle className="h-4 w-4" />
                  {t('complaints.escalate')}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Citizen Information */}
          {complaint.profiles && (
            <CitizenInfoCard
              citizen={{
                id: complaint.profiles.id,
                name: complaint.profiles.name,
                email: null,
                phone: null,
                avatar_url: complaint.profiles.avatar_url,
              }}
              role={adminRole}
            />
          )}

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('complaints.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('complaints.category')}</span>
                <span className="font-medium">{complaint.categories?.name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('complaints.status')}</span>
                <StatusBadge status={complaint.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('complaints.priority')}</span>
                <SeverityBadge severity={complaint.severity} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('complaints.created')}</span>
                <span className="font-medium">{formatDate(complaint.created_at)}</span>
              </div>
              {complaint.resolved_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('complaints.resolved')}</span>
                  <span className="font-medium">{formatDate(complaint.resolved_at)}</span>
                </div>
              )}
              {complaint.sla_deadline && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('complaints.slaDeadline')}</span>
                  <span className="font-medium">{formatDate(complaint.sla_deadline)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserPlus className="h-4 w-4" />
                {t('complaints.assignment')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('complaints.department')}</span>
                <span className="font-medium">
                  {complaint.departments ? `${complaint.departments.name} (${complaint.departments.code})` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('complaints.officer')}</span>
                <span className="font-medium">
                  {complaint.officers?.profiles?.name ?? '—'}
                  {complaint.officers?.title ? ` (${complaint.officers.title})` : ''}
                </span>
              </div>
              {complaint.officers?.ward && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('complaints.ward')}</span>
                  <span className="font-medium">{complaint.officers.ward}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('complaints.routingMethod')}</span>
                <Badge variant={complaint.routing_method === 'auto' ? 'success' : 'secondary'}>
                  {complaint.routing_method === 'auto' ? 'Automatic' : 'Manual'}
                </Badge>
              </div>
              {complaint.routing_confidence != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">{Math.round(complaint.routing_confidence * 100)}%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Civic Incident Link */}
          {canManageInc && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4" />
                  {t('complaints.civicIncident')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {complaint.incident_id ? (
                  <>
                    <p className="text-muted-foreground">
                      {t('complaints.linkedIncident')}
                    </p>
                    <Link
                      to={`/incidents/${complaint.incident_id}`}
                      className="flex items-center gap-2 font-medium text-primary hover:underline"
                    >
                      <Link2 className="h-4 w-4" />
                      {t('complaints.viewIncident')}
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-xs text-destructive"
                      onClick={() =>
                        unlinkMutation.mutateAsync({
                          complaintId: complaint.id,
                          incidentId: complaint.incident_id!,
                          unlinkedBy: user?.id ?? null,
                        })
                      }
                      disabled={unlinkMutation.isPending}
                    >
                      {t('complaints.unlinkIncident')}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground">
                      {t('complaints.notLinkedIncident')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIncidentDialogOpen(true)}
                    >
                      <Link2 className="h-4 w-4" />
                      {t('complaints.linkIncident')}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ===== Dialogs ===== */}
      <ChangeStatusDialog
        open={dialog === 'status'}
        onOpenChange={(open) => !open && setDialog(null)}
        currentStatus={complaint.status}
        role={adminRole}
        onConfirm={async (status, comment) => {
          await updateStatusMutation.mutateAsync({
            id: complaint.id,
            status: status as ComplaintStatus,
            comment: comment || null,
            updatedBy: user?.id ?? null,
          });
        }}
      />
      <AssignmentDialog
        open={dialog === 'assign'}
        onOpenChange={(open) => !open && setDialog(null)}
        isReassign={complaint.status === 'ASSIGNED' || complaint.status === 'IN_PROGRESS'}
        complaintId={complaint.id}
        onConfirm={async (input) => {
          await assignMutation.mutateAsync({
            ...input,
            assignedBy: user?.id ?? null,
          });
        }}
      />
      <AddNoteDialog
        open={dialog === 'note'}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={async (note) => {
          await addNoteMutation.mutateAsync({
            complaintId: complaint.id,
            note,
            updatedBy: user?.id ?? null,
          });
        }}
      />
      <EscalateDialog
        open={dialog === 'escalate'}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={async (reason) => {
          await escalateMutation.mutateAsync({
            id: complaint.id,
            reason,
            updatedBy: user?.id ?? null,
          });
        }}
      />

      {/* Link to Incident Dialog */}
      <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {t('complaints.linkDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('complaints.linkDialogDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={t('complaints.linkDialogPlaceholder')}
              value={incidentSearch}
              onChange={(e) => setIncidentSearch(e.target.value)}
            />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {(incidentsQuery.data?.data ?? [])
                .filter(
                  (inc) =>
                    !incidentSearch.trim() ||
                    inc.title.toLowerCase().includes(incidentSearch.toLowerCase()) ||
                    inc.incident_number.toLowerCase().includes(incidentSearch.toLowerCase()),
                )
                .map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => {
                      linkMutation.mutateAsync({
                        complaintId: complaint.id,
                        incidentId: inc.id,
                        linkedBy: user?.id ?? null,
                      });
                      setIncidentDialogOpen(false);
                      setIncidentSearch('');
                    }}
                    disabled={linkMutation.isPending}
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-accent"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-primary">
                        {inc.incident_number}
                      </span>
                      <p className="truncate text-sm font-medium">{inc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t('complaints.reportsCount', { count: inc.report_count })}
                      </p>
                    </div>
                    <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              {incidentsQuery.data && incidentsQuery.data.data.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('complaints.noActiveIncidents')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncidentDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
