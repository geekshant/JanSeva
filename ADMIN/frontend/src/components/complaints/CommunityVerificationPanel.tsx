import { useState } from 'react';
import { useTranslation } from '@/i18n/translate';
import {
  Users,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  useVerificationSummary,
  useCommunityVerifications,
  useConfirmResolution,
  useReopenComplaint,
  useMarkNeedsReview,
} from '@/hooks/useVerification';
import { useAuth } from '@/hooks/useAuth';
import {
  canReopenComplaint,
  canViewVerification,
} from '@/lib/workflow';
import type { AdminRole } from '@/lib/workflow';
import type { VerificationStatus } from '@/types';
import { cn } from '@/lib/utils';

interface CommunityVerificationPanelProps {
  complaintId: string;
  resolved: boolean;
  role: AdminRole | null;
}

export function CommunityVerificationPanel({
  complaintId,
  resolved,
  role,
}: CommunityVerificationPanelProps) {
  const { t } = useTranslation();
  const summaryQuery = useVerificationSummary(complaintId);
  const verificationsQuery = useCommunityVerifications(complaintId);
  const confirmMutation = useConfirmResolution();
  const reopenMutation = useReopenComplaint();
  const needsReviewMutation = useMarkNeedsReview();
  const { user } = useAuth();

  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const canManage = canReopenComplaint(role ?? 'OFFICER');
  const canView = canViewVerification(role ?? 'OFFICER');

  const summary = summaryQuery.data;
  const verifications = verificationsQuery.data ?? [];

  if (!resolved && !summary?.status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            {t('complaints.communityVerification')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('complaints.cvNotOpen')}
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusConfig: Record<VerificationStatus, { variant: 'default' | 'success' | 'destructive' | 'warning' | 'secondary'; label: string; icon: React.ComponentType<{ className?: string }> }> = {
    pending: { variant: 'warning', label: t('complaints.cvPending'), icon: AlertCircle },
    confirmed: { variant: 'success', label: t('complaints.cvConfirmed'), icon: CheckCircle2 },
    reopened: { variant: 'destructive', label: t('complaints.cvReopened'), icon: RotateCcw },
    needs_review: { variant: 'secondary', label: t('complaints.cvNeedsReview'), icon: AlertCircle },
  };

  const currentStatus = summary?.status ?? 'pending';
  const statusInfo = statusConfig[currentStatus];
  const StatusIcon = statusInfo.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('complaints.communityVerification')}
          </span>
          {summary && (
            <Badge variant={statusInfo.variant}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusInfo.label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaryQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : summary ? (
          <>
            {/* Verification stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-green-500/5 p-3 text-center">
                <ThumbsUp className="mx-auto mb-1 h-5 w-5 text-green-600" />
                <p className="text-xl font-bold text-green-600">{summary.verified}</p>
                <p className="text-xs text-muted-foreground">{t('complaints.cvStatConfirmed')}</p>
              </div>
              <div className="rounded-lg border bg-red-500/5 p-3 text-center">
                <ThumbsDown className="mx-auto mb-1 h-5 w-5 text-red-600" />
                <p className="text-xl font-bold text-red-600">{summary.rejected}</p>
                <p className="text-xs text-muted-foreground">{t('complaints.cvStatDisputed')}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <Users className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                <p className="text-xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">{t('complaints.cvStatTotal')}</p>
              </div>
            </div>

            {/* Verification rate bar */}
            {summary.total > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('complaints.cvRate')}</span>
                  <span className="font-medium">{summary.verification_rate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      summary.verification_rate >= 60 ? 'bg-green-500' : 'bg-amber-500',
                    )}
                    style={{ width: `${summary.verification_rate}%` }}
                  />
                </div>
              </div>
            )}

            {/* Admin actions */}
            {canManage && currentStatus === 'pending' && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => confirmMutation.mutate({ complaintId, adminId: user?.id ?? null })}
                  disabled={confirmMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {t('complaints.confirmResolution')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => needsReviewMutation.mutate({ complaintId, adminId: user?.id ?? null })}
                  disabled={needsReviewMutation.isPending}
                >
                  <AlertCircle className="h-4 w-4" />
                  {t('complaints.needsReviewAction')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setReopenDialogOpen(true)}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('complaints.reopen')}
                </Button>
              </div>
            )}

            {/* Reopened status notice */}
            {currentStatus === 'reopened' && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <RotateCcw className="mt-0.5 h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">
                  {t('complaints.reopenedNotice')}
                </p>
              </div>
            )}
          </>
        ) : null}

        {/* Individual verifications list */}
        {canView && verifications.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('complaints.citizenResponses')}
            </p>
            {verifications.map((v) => (
              <div
                key={v.id}
                className={cn(
                  'flex items-start gap-3 rounded-md border p-3',
                  v.verified ? 'border-green-500/20' : 'border-red-500/20',
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={v.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {v.profiles?.name?.charAt(0).toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{v.profiles?.name ?? 'Unknown'}</span>
                    {v.verified ? (
                      <Badge variant="success" className="text-[10px]">
                        <ThumbsUp className="mr-1 h-2.5 w-2.5" />
                        {t('complaints.cvStatConfirmed')}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px]">
                        <ThumbsDown className="mr-1 h-2.5 w-2.5" />
                        {t('complaints.cvStatDisputed')}
                      </Badge>
                    )}
                  </div>
                  {v.comment && (
                    <p className="mt-0.5 text-xs text-muted-foreground">"{v.comment}"</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading state for verifications */}
        {verificationsQuery.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        )}
      </CardContent>

      {/* Reopen dialog */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              {t('complaints.reopenDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('complaints.reopenDialogDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reopen-reason">{t('complaints.reopenReasonLabel')}</Label>
            <Textarea
              id="reopen-reason"
              placeholder={t('complaints.reopenReasonPlaceholder')}
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
            {!reopenReason.trim() && (
              <p className="text-xs text-muted-foreground">{t('complaints.reopenReasonRequired')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await reopenMutation.mutateAsync({
                  complaintId,
                  reason: reopenReason.trim(),
                  adminId: user?.id ?? null,
                });
                setReopenDialogOpen(false);
                setReopenReason('');
              }}
              disabled={!reopenReason.trim() || reopenMutation.isPending}
            >
              <RotateCcw className="h-4 w-4" />
              {t('complaints.reopenComplaint')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
