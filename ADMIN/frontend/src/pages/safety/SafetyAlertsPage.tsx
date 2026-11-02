import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/translate';
import {
  ShieldAlert,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  User,
  Navigation,
  UserCheck,
  PlayCircle,
  TimerOff,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useActiveSafetyAlerts,
  useAcknowledgeSos,
  useAssignSosResponder,
  useStartSosResponse,
  useResolveSos,
  useCloseSos,
} from '@/hooks/useSafety';
import { useBuzzerContext } from '@/contexts/BuzzerContext';
import type { SafetyAlertEntry } from '@/types';

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------
function formatTimeAgo(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getAlertUrgency(alert: SafetyAlertEntry): 'critical' | 'urgent' | 'normal' {
  const seconds = alert.seconds_since_triggered;
  if (alert.incident_status === 'ACTIVE' && seconds > 600) return 'critical';
  if (alert.incident_status === 'ACTIVE') return 'urgent';
  return 'normal';
}

// ---------------------------------------------------------------------------
// Status badge component
// ---------------------------------------------------------------------------
function StatusBadge({ incidentStatus }: { incidentStatus: string }) {
  const variant =
    incidentStatus === 'ACTIVE' ? 'destructive' :
    incidentStatus === 'ACKNOWLEDGED' ? 'default' :
    incidentStatus === 'RESPONDER_ASSIGNED' || incidentStatus === 'RESPONSE_IN_PROGRESS' ? 'default' :
    incidentStatus === 'TRACKING_EXPIRED' ? 'warning' :
    'secondary';

  const pulse = incidentStatus === 'ACTIVE';

  return (
    <Badge variant={variant as 'destructive' | 'default' | 'warning' | 'secondary'} className={pulse ? 'animate-pulse' : ''}>
      {incidentStatus.replace(/_/g, ' ')}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Tracking status card
// ---------------------------------------------------------------------------
function TrackingStatus({ alert }: { alert: SafetyAlertEntry }) {
  if (alert.tracking_active && alert.tracking_seconds_remaining > 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/5 px-3 py-2">
        <Navigation className="h-4 w-4 animate-pulse text-blue-500" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Live Tracking Active</p>
          <p className="text-xs text-muted-foreground">
            Expires in {formatCountdown(alert.tracking_seconds_remaining)}
          </p>
        </div>
      </div>
    );
  }

  if (alert.tracking_ended_at || alert.incident_status === 'TRACKING_EXPIRED') {
    return (
      <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
        <TimerOff className="h-4 w-4 text-amber-500" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Live Tracking Expired</p>
          <p className="text-xs text-muted-foreground">
            {alert.tracking_end_reason
              ? `Tracking ended: ${alert.tracking_end_reason}`
              : 'Tracking session has expired'}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Last location display
// ---------------------------------------------------------------------------
function LastLocation({ alert }: { alert: SafetyAlertEntry }) {
  const lat = alert.last_latitude ?? alert.latitude;
  const lng = alert.last_longitude ?? alert.longitude;

  if (lat == null || lng == null) return null;

  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-1 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
        <span>{alert.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}</span>
      </div>
      <div className="flex items-center gap-3">
        <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
          View on Google Maps
        </a>
        {alert.last_location_at && (
          <span className="text-xs text-muted-foreground">
            Updated {new Date(alert.last_location_at).toLocaleTimeString()}
          </span>
        )}
        {alert.last_accuracy != null && (
          <span className="text-xs text-muted-foreground">
            Accuracy: {Math.round(alert.last_accuracy)}m
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert card
// ---------------------------------------------------------------------------
function AlertCard({
  alert,
  onAcknowledge,
  onAssignResponder,
  onStartResponse,
  onResolve,
  onClose,
  isAcknowledging,
  isResolving,
  isStartingResponse,
  isClosing,
}: {
  alert: SafetyAlertEntry;
  onAcknowledge: () => void;
  onAssignResponder: () => void;
  onStartResponse: () => void;
  onResolve: () => void;
  onClose: () => void;
  isAcknowledging: boolean;
  isResolving: boolean;
  isStartingResponse: boolean;
  isClosing: boolean;
}) {
  const urgency = getAlertUrgency(alert);
  const contacts = alert.contacts ?? [];
  const status = alert.incident_status;

  const urgencyBorder =
    urgency === 'critical' ? 'border-red-500 bg-red-500/5' :
    status === 'ACTIVE' ? 'border-amber-500 bg-amber-500/5' :
    status === 'TRACKING_EXPIRED' ? 'border-amber-500 bg-amber-500/5' :
    'border-green-500 bg-green-500/5';

  const canAcknowledge = status === 'ACTIVE' || status === 'TRACKING_EXPIRED';
  const canAssign = status === 'ACKNOWLEDGED' || status === 'TRACKING_EXPIRED';
  const canStartResponse = status === 'ACKNOWLEDGED' || status === 'RESPONDER_ASSIGNED' || status === 'TRACKING_EXPIRED';
  const canResolve = ['ACTIVE', 'ACKNOWLEDGED', 'RESPONDER_ASSIGNED', 'RESPONSE_IN_PROGRESS', 'TRACKING_EXPIRED'].includes(status);
  const canClose = status === 'TRACKING_EXPIRED';

  return (
    <Card className={`border-2 ${urgencyBorder}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: user info */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* User header */}
            <div className="flex items-center gap-2">
              {alert.anonymous ? (
                <User className="h-5 w-5 text-muted-foreground" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                  <span className="text-sm font-bold text-red-600">
                    {alert.user_name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold">{alert.anonymous ? 'Anonymous Report' : alert.user_name}</p>
                {alert.user_phone && !alert.anonymous && (
                  <a href={`tel:${alert.user_phone}`} className="flex items-center gap-1 text-sm text-primary hover:underline">
                    <Phone className="h-3 w-3" />
                    {alert.user_phone}
                  </a>
                )}
              </div>
            </div>

            {/* Status + time */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge incidentStatus={status} />
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {formatTimeAgo(alert.seconds_since_triggered)}
                  {urgency === 'critical' && (
                    <span className="ml-1 font-bold text-red-600"> — OVERDUE!</span>
                  )}
                </span>
              </div>
            </div>

            {/* Tracking status */}
            <TrackingStatus alert={alert} />

            {/* Location */}
            <LastLocation alert={alert} />

            {/* Assigned officer */}
            {alert.assigned_officer_name && (
              <div className="flex items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-1.5">
                <UserCheck className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">{alert.assigned_officer_name}</p>
                  {alert.assigned_officer_title && (
                    <p className="text-xs text-muted-foreground">{alert.assigned_officer_title}</p>
                  )}
                </div>
              </div>
            )}

            {/* Message */}
            {alert.message && (
              <div className="rounded-md border p-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {alert.anonymous ? 'Report' : 'Message'}
                </p>
                <p className="mt-1">{alert.message}</p>
              </div>
            )}

            {/* Trusted contacts */}
            {!alert.anonymous && contacts.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Trusted Contacts ({contacts.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {contacts.map((contact, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-1.5">
                      <div>
                        <p className="text-sm font-medium">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {contact.phone}
                          {contact.relationship ? ` · ${contact.relationship}` : ''}
                        </p>
                      </div>
                      <a href={`tel:${contact.phone}`} className="ml-2">
                        <Phone className="h-4 w-4 text-green-600" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 flex-col gap-2 lg:items-end">
            {canAcknowledge && (
              <Button
                size="sm"
                onClick={onAcknowledge}
                disabled={isAcknowledging}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isAcknowledging ? 'Acknowledging...' : 'Acknowledge'}
              </Button>
            )}

            {canAssign && !alert.assigned_officer_id && (
              <Button
                size="sm"
                variant="outline"
                onClick={onAssignResponder}
              >
                <UserCheck className="h-3.5 w-3.5" />
                Assign Responder
              </Button>
            )}

            {canStartResponse && (
              <Button
                size="sm"
                variant="outline"
                onClick={onStartResponse}
                disabled={isStartingResponse}
              >
                <PlayCircle className="h-3.5 w-3.5" />
                {isStartingResponse ? 'Starting...' : 'Start Response'}
              </Button>
            )}

            {canResolve && (
              <Button
                size="sm"
                variant="outline"
                onClick={onResolve}
                disabled={isResolving}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isResolving ? 'Resolving...' : 'Resolve & Close'}
              </Button>
            )}

            {canClose && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                disabled={isClosing}
              >
                <XCircle className="h-3.5 w-3.5" />
                {isClosing ? 'Closing...' : 'Close Case'}
              </Button>
            )}

            {alert.acknowledged_at && (
              <p className="text-xs text-muted-foreground">
                Acknowledged at {new Date(alert.acknowledged_at).toLocaleTimeString()}
              </p>
            )}
            {alert.response_started_at && (
              <p className="text-xs text-muted-foreground">
                Response started at {new Date(alert.response_started_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Flashing banner
// ---------------------------------------------------------------------------
function FlashingAlertBanner({ count }: { count: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (count === 0) return;
    const interval = setInterval(() => setVisible((v) => !v), 500);
    return () => clearInterval(interval);
  }, [count]);

  if (count === 0) return null;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border-2 border-red-500 p-4 transition-opacity ${
        visible ? 'opacity-100 bg-red-500/10' : 'opacity-50 bg-red-500/5'
      }`}
    >
      <ShieldAlert className="h-8 w-8 animate-pulse text-red-600" />
      <div className="flex-1">
        <p className="text-lg font-bold text-red-700 dark:text-red-400">
          SOS ALERT — {count} active {count === 1 ? 'alert' : 'alerts'} need attention!
        </p>
        <p className="text-sm text-red-600 dark:text-red-500">
          A woman has triggered SOS. Check her location and contacts immediately.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Safety Alerts page
// ---------------------------------------------------------------------------
export function SafetyAlertsPage() {
  const { t } = useTranslation();
  const alertsQuery = useActiveSafetyAlerts(50);
  const acknowledgeMutation = useAcknowledgeSos();
  const assignMutation = useAssignSosResponder();
  const startResponseMutation = useStartSosResponse();
  const resolveMutation = useResolveSos();
  const closeMutation = useCloseSos();

  const [resolveTarget, setResolveTarget] = useState<SafetyAlertEntry | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const buzzer = useBuzzerContext();

  const alerts = alertsQuery.data ?? [];
  const activeCount = alerts.filter((a) => a.incident_status === 'ACTIVE').length;

  return (
    <PageContainer
      title={t('safety.title')}
      description={t('safety.desc')}
      actions={
        <div className="flex items-center gap-2">
          {buzzer.isPlaying ? (
            <Button variant="destructive" size="sm" onClick={buzzer.stop}>
              <VolumeX className="h-4 w-4" />
              Stop Buzzer
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => void buzzer.play('safety')}>
              <Volume2 className="h-4 w-4" />
              {t('safety.testBuzzer')}
            </Button>
          )}
          <Button
            variant={buzzer.enabled ? 'outline' : 'ghost'}
            size="sm"
            onClick={buzzer.toggle}
          >
            {buzzer.enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {buzzer.enabled ? t('safety.buzzerOn') : t('safety.buzzerOff')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <FlashingAlertBanner count={activeCount} />

        {alertsQuery.error ? (
          <ErrorState
            title={t('safety.loadFailed')}
            message={alertsQuery.error instanceof Error ? alertsQuery.error.message : undefined}
            onRetry={() => void alertsQuery.refetch()}
          />
        ) : alertsQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title={t('safety.noAlerts')}
            description={t('safety.noAlertsMsg')}
          />
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={() => acknowledgeMutation.mutate(alert.incident_id)}
                onAssignResponder={() => {
                  // For now, assign to the first available officer
                  // TODO: Show officer selection dialog
                  assignMutation.mutate({ incidentId: alert.incident_id, officerId: '' });
                }}
                onStartResponse={() => startResponseMutation.mutate(alert.incident_id)}
                onResolve={() => {
                  setResolveTarget(alert);
                  setResolveNote('');
                }}
                onClose={() => closeMutation.mutate(alert.incident_id)}
                isAcknowledging={acknowledgeMutation.isPending}
                isResolving={resolveMutation.isPending}
                isStartingResponse={startResponseMutation.isPending}
                isClosing={closeMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Resolve dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('safety.resolveTitle')}</DialogTitle>
            <DialogDescription>{t('safety.resolveDesc')}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t('safety.resolveNotePlaceholder')}
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                if (!resolveTarget) return;
                resolveMutation.mutate(
                  { incidentId: resolveTarget.incident_id, note: resolveNote.trim() || null },
                  { onSuccess: () => setResolveTarget(null) },
                );
              }}
              disabled={resolveMutation.isPending}
            >
              {resolveMutation.isPending ? t('safety.resolving') : t('safety.resolve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
