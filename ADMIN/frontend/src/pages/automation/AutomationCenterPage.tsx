import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  RotateCcw,
  FileSearch,
  Users,
  TrendingUp,
  Workflow,
  Activity,
  XCircle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
} from '@/components/ui/select';
import {
  useAutomationStats,
  useAutomationRulesWithStats,
  useAutomationExecutionLog,
  useFailedAutomations,
  useRetryAutomationExecution,
  useAutomationRealtime,
} from '@/hooks/useAutomation';
import type {
  AutomationAuditLogEntry,
  AutomationEventType,
  AutomationActionType,
  AutomationExecutionStatus,
} from '@/types';

// ---------------------------------------------------------------------------
// Action / event metadata — shared with the Automation Rules page.
// ---------------------------------------------------------------------------
const actionTypeConfig: Record<string, { icon: LucideIcon; color: string; key: string }> = {
  AUTO_VERIFY: { icon: CheckCircle2, color: 'text-green-600', key: 'automation.actionAutoVerify' },
  AUTO_ASSIGN: { icon: Zap, color: 'text-blue-600', key: 'automation.actionAutoAssign' },
  SET_SLA: { icon: Clock, color: 'text-blue-600', key: 'automation.actionSetSla' },
  SLA_WARNING: { icon: AlertTriangle, color: 'text-amber-600', key: 'automation.actionSlaWarning' },
  ESCALATE: { icon: AlertTriangle, color: 'text-red-600', key: 'automation.actionEscalate' },
  REQUEST_COMMUNITY_VERIFICATION: { icon: Users, color: 'text-purple-600', key: 'automation.actionRequestCommunityVerification' },
  AUTO_RESOLVE: { icon: CheckCircle2, color: 'text-green-600', key: 'automation.actionAutoResolve' },
  AUTO_REOPEN: { icon: RotateCcw, color: 'text-red-600', key: 'automation.actionAutoReopen' },
  NOTIFY: { icon: Bot, color: 'text-gray-600', key: 'automation.actionNotify' },
  FLAG_FOR_REVIEW: { icon: FileSearch, color: 'text-amber-600', key: 'automation.actionFlagForReview' },
};

const eventLabels: Record<AutomationEventType, string> = {
  COMPLAINT_CREATED: 'automation.eventComplaintCreated',
  COMPLAINT_VERIFIED: 'automation.eventComplaintVerified',
  COMPLAINT_ASSIGNED: 'automation.eventComplaintAssigned',
  COMPLAINT_ACKNOWLEDGED: 'automation.eventComplaintAcknowledged',
  WORK_STARTED: 'automation.eventWorkStarted',
  EVIDENCE_UPLOADED: 'automation.eventEvidenceUploaded',
  RESOLUTION_SUBMITTED: 'automation.eventResolutionSubmitted',
  COMMUNITY_RESPONSE_RECEIVED: 'automation.eventCommunityResponseReceived',
  SLA_WARNING: 'automation.eventSlaWarning',
  SLA_BREACHED: 'automation.eventSlaBreached',
  COMPLAINT_REOPENED: 'automation.eventComplaintReopened',
  STATUS_CHANGED: 'automation.eventStatusChanged',
};

const actionLabels: Record<AutomationActionType, string> = {
  AUTO_VERIFY: 'automation.actionAutoVerify',
  AUTO_ASSIGN: 'automation.actionAutoAssign',
  SET_SLA: 'automation.actionSetSla',
  SLA_WARNING: 'automation.actionSlaWarning',
  ESCALATE: 'automation.actionEscalate',
  REQUEST_COMMUNITY_VERIFICATION: 'automation.actionRequestCommunityVerification',
  AUTO_RESOLVE: 'automation.actionAutoResolve',
  AUTO_REOPEN: 'automation.actionAutoReopen',
  NOTIFY: 'automation.actionNotify',
  FLAG_FOR_REVIEW: 'automation.actionFlagForReview',
};

// Execution status → badge variant + label key
const executionStatusConfig: Record<
  AutomationExecutionStatus,
  { variant: 'success' | 'destructive' | 'warning' | 'secondary' | 'default'; key: string }
> = {
  pending: { variant: 'secondary', key: 'automation.pendingRunning' },
  running: { variant: 'default', key: 'automation.pendingRunning' },
  retrying: { variant: 'warning', key: 'automation.retry' },
  completed: { variant: 'success', key: 'automation.completed' },
  failed: { variant: 'destructive', key: 'automation.failed' },
  skipped: { variant: 'secondary', key: 'automation.skipped' },
};

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------
function timeAgo(iso: string | null, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (!iso) return t('automation.never');
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('time.justNow');
  if (mins < 60) return t('time.minAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('time.hrAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('time.dayAgo', { count: days });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatAvgDuration(ms: number): string {
  if (ms === 0) return '—';
  return formatDuration(ms);
}

// ---------------------------------------------------------------------------
// Automation Engine status indicator (Operational / Degraded / Offline)
// ---------------------------------------------------------------------------
type EngineStatus = 'operational' | 'degraded' | 'offline';

function deriveEngineStatus(
  activeRules: number,
  failedExecutions: number,
  hasError: boolean,
): EngineStatus {
  if (hasError) return 'offline';
  if (activeRules === 0) return 'offline';
  if (failedExecutions > 0) return 'degraded';
  return 'operational';
}

function EngineStatusBadge({ status }: { status: EngineStatus }) {
  const { t } = useTranslation();
  const config = {
    operational: {
      color: 'bg-green-500',
      label: t('automation.engineOperational'),
      icon: CheckCircle2,
    },
    degraded: {
      color: 'bg-amber-500',
      label: t('automation.engineDegraded'),
      icon: AlertTriangle,
    },
    offline: {
      color: 'bg-red-500',
      label: t('automation.engineOffline'),
      icon: XCircle,
    },
  } as const;
  const cfg = config[status];
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5">
      <span className={`relative flex h-2.5 w-2.5`}>
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${cfg.color}`} />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.color}`} />
      </span>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{cfg.label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4 sm:p-6">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-16" />
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </div>
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recent activity feed (audit log timeline)
// ---------------------------------------------------------------------------
function ActivityFeed({ entries, loading }: { entries: AutomationAuditLogEntry[]; loading: boolean }) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return <EmptyState icon={Bot} title={t('automation.noActivity')} description={t('automation.noActivityMsg')} />;
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, idx) => {
        const meta = actionTypeConfig[entry.action_type] ?? { icon: Bot, color: 'text-gray-600', key: 'automation.automatedAction' };
        const Icon = meta.icon;
        return (
          <div key={entry.id} className="relative flex items-start gap-3 pb-4">
            {idx < entries.length - 1 && (
              <div className="absolute left-4 top-9 bottom-0 w-px bg-border" />
            )}
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted ${meta.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t(meta.key)}</span>
                {entry.new_status && (
                  <Badge variant="outline" className="text-xs">
                    {t('status.' + entry.new_status.toLowerCase())}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{timeAgo(entry.executed_at, t)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {entry.reason ?? t('automation.automatedAction')}
              </p>
              <Link to={`/complaints/${entry.complaint_id}`}>
                <span className="text-xs text-primary hover:underline">
                  {entry.complaint_number}
                </span>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Automation Rules table with per-rule execution stats
// ---------------------------------------------------------------------------
function AutomationRulesTable() {
  const { t } = useTranslation();
  const rulesQuery = useAutomationRulesWithStats();

  if (rulesQuery.error) {
    return (
      <ErrorState
        title={t('automation.failedLoadRules')}
        message={rulesQuery.error instanceof Error ? rulesQuery.error.message : undefined}
        onRetry={() => void rulesQuery.refetch()}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          {t('automation.rulesWithStatsTitle')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('automation.rulesWithStatsDesc')}</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {rulesQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !rulesQuery.data || rulesQuery.data.length === 0 ? (
            <EmptyState
              icon={Workflow}
              title={t('automation.noRules')}
              description={t('automation.noRulesMsg')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('automation.tableRule')}</TableHead>
                  <TableHead>{t('automation.tableTrigger')}</TableHead>
                  <TableHead>{t('automation.tableAction')}</TableHead>
                  <TableHead>{t('automation.tableStatus')}</TableHead>
                  <TableHead className="text-center">{t('automation.tablePriority')}</TableHead>
                  <TableHead className="text-right">{t('automation.tableExecutions')}</TableHead>
                  <TableHead className="text-right">{t('automation.tableSuccess')}</TableHead>
                  <TableHead className="text-right">{t('automation.tableFailures')}</TableHead>
                  <TableHead>{t('automation.tableLastExecuted')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesQuery.data.map((rule) => {
                  const Icon = actionTypeConfig[rule.action_type]?.icon ?? Bot;
                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{rule.name}</p>
                            {rule.description && (
                              <p className="truncate text-xs text-muted-foreground">{rule.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {t(eventLabels[rule.event_type] ?? rule.event_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {t(actionLabels[rule.action_type] ?? rule.action_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {rule.enabled ? (
                          <Badge variant="success" className="text-xs">{t('automation.active')}</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">{t('automation.disabled')}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">P{rule.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{rule.execution_count}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm text-green-600">{rule.success_count}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono text-sm ${rule.failure_count > 0 ? 'text-red-600' : ''}`}>
                          {rule.failure_count}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {timeAgo(rule.last_executed_at, t)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Execution log table with status + rule filters
// ---------------------------------------------------------------------------
function ExecutionLogTable() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<AutomationExecutionStatus | 'all'>('all');
  const [ruleFilter, setRuleFilter] = useState<string | 'all'>('all');
  const rulesQuery = useAutomationRulesWithStats();
  const logQuery = useAutomationExecutionLog(
    statusFilter === 'all' ? null : statusFilter,
    ruleFilter === 'all' ? null : ruleFilter,
    50,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t('automation.execLogTitle')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('automation.execLogDesc')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AutomationExecutionStatus | 'all')}
              className="w-[160px]"
            >
              <option value="all">{t('automation.filterAllStatuses')}</option>
              <option value="completed">{t('automation.completed')}</option>
              <option value="failed">{t('automation.failed')}</option>
              <option value="skipped">{t('automation.skipped')}</option>
              <option value="running">{t('automation.pendingRunning')}</option>
              <option value="pending">{t('automation.pendingRunning')}</option>
              <option value="retrying">{t('automation.retry')}</option>
            </Select>
            <Select
              value={ruleFilter}
              onChange={(e) => setRuleFilter(e.target.value)}
              className="w-[200px]"
            >
              <option value="all">{t('automation.filterAllRules')}</option>
              {(rulesQuery.data ?? []).map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {logQuery.error ? (
            <ErrorState
              title={t('automation.failedLoadExecutions')}
              message={logQuery.error instanceof Error ? logQuery.error.message : undefined}
              onRetry={() => void logQuery.refetch()}
            />
          ) : logQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !logQuery.data || logQuery.data.length === 0 ? (
            <EmptyState
              icon={Activity}
              title={t('automation.execLogEmpty')}
              description={t('automation.execLogEmptyMsg')}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('automation.tableComplaint')}</TableHead>
                  <TableHead>{t('automation.tableRule')}</TableHead>
                  <TableHead>{t('automation.tableEventType')}</TableHead>
                  <TableHead>{t('automation.tableStatus')}</TableHead>
                  <TableHead className="text-center">{t('automation.tableAttempt')}</TableHead>
                  <TableHead>{t('automation.tableStartedAt')}</TableHead>
                  <TableHead>{t('automation.tableDuration')}</TableHead>
                  <TableHead>{t('automation.tableResult')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logQuery.data.map((entry) => {
                  const statusCfg = executionStatusConfig[entry.status] ?? executionStatusConfig.pending;
                  return (
                    <TableRow key={entry.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">
                        {entry.complaint_number ? (
                          <Link to={`/complaints/${entry.complaint_id}`} className="text-primary hover:underline">
                            {entry.complaint_number}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{entry.rule_name ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {eventLabels[entry.event_type as AutomationEventType]
                            ? t(eventLabels[entry.event_type as AutomationEventType])
                            : entry.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant} className="text-xs">
                          {t(statusCfg.key)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {entry.attempt}/{entry.max_attempts}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(entry.started_at)}
                      </TableCell>
                      <TableCell className="text-xs">{formatDuration(entry.duration_ms)}</TableCell>
                      <TableCell className="max-w-[240px]">
                        {entry.status === 'failed' && entry.error ? (
                          <span className="text-xs text-red-600" title={entry.error}>
                            {entry.error.length > 60 ? entry.error.slice(0, 60) + '…' : entry.error}
                          </span>
                        ) : entry.result ? (
                          <span className="text-xs text-muted-foreground">
                            {typeof entry.result === 'object' && entry.result !== null && 'reason' in entry.result
                              ? String((entry.result as { reason?: string }).reason ?? '—')
                              : '—'}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Failed automations section with retry
// ---------------------------------------------------------------------------
function FailedAutomationsSection() {
  const { t } = useTranslation();
  const failedQuery = useFailedAutomations(20);
  const retryMutation = useRetryAutomationExecution();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (executionId: string) => {
    setRetryingId(executionId);
    try {
      await retryMutation.mutateAsync(executionId);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-600" />
          {t('automation.failedTitle')}
          {failedQuery.data && failedQuery.data.length > 0 && (
            <Badge variant="destructive" className="ml-1">{failedQuery.data.length}</Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('automation.failedDesc')}</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {failedQuery.error ? (
            <ErrorState
              title={t('automation.failedLoadFailed')}
              message={failedQuery.error instanceof Error ? failedQuery.error.message : undefined}
              onRetry={() => void failedQuery.refetch()}
            />
          ) : failedQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !failedQuery.data || failedQuery.data.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title={t('automation.failedEmpty')}
              description={t('automation.failedEmptyMsg')}
            />
          ) : (
            <div className="divide-y">
              {failedQuery.data.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm">{entry.rule_name ?? t('automation.automatedAction')}</span>
                      <Badge variant="destructive" className="text-xs">
                        {t('automation.failed')}
                      </Badge>
                      {entry.attempt >= entry.max_attempts && (
                        <Badge variant="secondary" className="text-xs">
                          {t('automation.noMoreAttempts')}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {t('automation.tableAttempt')}: {entry.attempt}/{entry.max_attempts}
                      </span>
                    </div>
                    {entry.complaint_number && (
                      <Link to={`/complaints/${entry.complaint_id}`} className="font-mono text-xs text-primary hover:underline">
                        {entry.complaint_number}
                        {entry.complaint_title ? ` — ${entry.complaint_title}` : ''}
                      </Link>
                    )}
                    <div className="rounded-md border border-red-500/30 bg-red-500/5 p-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                        {t('automation.failedReason')}
                      </p>
                      <p className="mt-0.5 text-sm text-red-700 dark:text-red-400">
                        {entry.error ?? t('automation.automatedAction')}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.completed_at ?? entry.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {entry.complaint_id && (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/complaints/${entry.complaint_id}`}>
                          {t('automation.viewComplaint')}
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleRetry(entry.id)}
                      disabled={retryMutation.isPending || entry.attempt >= entry.max_attempts}
                    >
                      {retryingId === entry.id && retryMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {t('automation.retrying')}
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          {t('automation.retry')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Automation Center page
// ---------------------------------------------------------------------------
export function AutomationCenterPage() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useAutomationStats();
  // Subscribe to realtime updates for the whole page.
  useAutomationRealtime();

  // Distinguish "query failed" from "no data" — the spec is explicit that we
  // must never show an empty state when the actual query failed.
  if (error) {
    const errMsg = error instanceof Error ? error.message : '';
    const isPermission = /access denied|permission|is_admin/i.test(errMsg);
    return (
      <PageContainer title={t('automation.title')} description={t('automation.shortDesc')}>
        <ErrorState
          title={isPermission ? t('automation.permissionDenied') : t('automation.failedLoad')}
          message={isPermission ? undefined : (errMsg || t('automation.failedLoadMsg'))}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  const executions = data?.executions;
  const complaints = data?.complaints;
  const rulesSummary = data?.rules_summary;
  const failedCount = executions?.failed ?? 0;
  const activeRules = rulesSummary?.active_rules ?? 0;
  const engineStatus = deriveEngineStatus(activeRules, failedCount, false);
  const successRate =
    executions && executions.total > 0
      ? ((executions.completed / executions.total) * 100).toFixed(1) + '%'
      : '—';

  return (
    <PageContainer
      title={t('automation.title')}
      description={t('automation.desc')}
      actions={
        <div className="flex items-center gap-3">
          <EngineStatusBadge status={engineStatus} />
          <Button variant="outline" asChild>
            <Link to="/automation/rules">
              <Workflow className="mr-2 h-4 w-4" />
              {t('automation.manageRules')}
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Automation Health — spec section 3 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {t('automation.healthTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <StatCard label={t('automation.totalRules')} value={rulesSummary?.total ?? 0} icon={Workflow} color="bg-blue-100 text-blue-600" loading={isLoading} />
              <StatCard label={t('automation.activeRules')} value={activeRules} icon={CheckCircle2} color="bg-green-100 text-green-600" loading={isLoading} />
              <StatCard label={t('automation.disabledRules')} value={rulesSummary?.disabled_rules ?? 0} icon={XCircle} color="bg-gray-100 text-gray-600" loading={isLoading} />
              <StatCard label={t('automation.executionsToday')} value={executions?.exec_today ?? 0} icon={Activity} color="bg-blue-100 text-blue-600" loading={isLoading} />
              <StatCard label={t('automation.executionsThisWeek')} value={executions?.exec_this_week ?? 0} icon={TrendingUp} color="bg-purple-100 text-purple-600" loading={isLoading} />
              <StatCard label={t('automation.successRate')} value={successRate} icon={CheckCircle2} color="bg-green-100 text-green-600" loading={isLoading} />
              <StatCard label={t('automation.successfulExecutions')} value={executions?.completed ?? 0} icon={CheckCircle2} color="bg-green-100 text-green-600" loading={isLoading} />
              <StatCard label={t('automation.failedExecutions')} value={failedCount} icon={XCircle} color="bg-red-100 text-red-600" loading={isLoading} />
              <StatCard label={t('automation.pendingExecutions')} value={executions?.pending ?? 0} icon={Clock} color="bg-amber-100 text-amber-600" loading={isLoading} />
              <StatCard label={t('automation.avgExecutionTime')} value={formatAvgDuration(executions?.avg_duration_ms ?? 0)} icon={Clock} color="bg-blue-100 text-blue-600" loading={isLoading} />
              <StatCard label={t('automation.lastSuccess')} value={timeAgo(executions?.last_success_at ?? null, t)} icon={CheckCircle2} color="bg-green-100 text-green-600" loading={isLoading} />
              <StatCard label={t('automation.lastFailure')} value={timeAgo(executions?.last_failed_at ?? null, t)} icon={AlertTriangle} color="bg-red-100 text-red-600" loading={isLoading} />
            </div>
          </CardContent>
        </Card>

        {/* Complaint stats — kept from the original page */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label={t('automation.autoVerified')} value={complaints?.auto_verified ?? 0} icon={CheckCircle2} color="bg-green-100 text-green-600" loading={isLoading} />
          <StatCard label={t('automation.autoAssigned')} value={complaints?.auto_assigned ?? 0} icon={Zap} color="bg-blue-100 text-blue-600" loading={isLoading} />
          <StatCard label={t('automation.needsReview')} value={complaints?.needs_review ?? 0} icon={FileSearch} color="bg-amber-100 text-amber-600" loading={isLoading} />
          <StatCard label={t('automation.escalated')} value={complaints?.escalated ?? 0} icon={AlertTriangle} color="bg-red-100 text-red-600" loading={isLoading} />
          <StatCard label={t('automation.communityVerification')} value={complaints?.community_verification ?? 0} icon={Users} color="bg-purple-100 text-purple-600" loading={isLoading} />
          <StatCard label={t('automation.autoResolved')} value={complaints?.resolved ?? 0} icon={TrendingUp} color="bg-green-100 text-green-600" loading={isLoading} />
          <StatCard label={t('automation.reopened')} value={complaints?.reopened ?? 0} icon={RotateCcw} color="bg-red-100 text-red-600" loading={isLoading} />
          <StatCard label={t('automation.slaBreached')} value={complaints?.sla_breached ?? 0} icon={Clock} color="bg-red-100 text-red-600" loading={isLoading} />
        </div>

        {/* Recent activity + execution summary side-by-side */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                {t('automation.recentActivity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed entries={data?.recent_activity ?? []} loading={isLoading} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('automation.executionSummary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('automation.totalExecutions')}</span>
                {isLoading ? <Skeleton className="h-5 w-10" /> : <span className="font-semibold">{executions?.total ?? 0}</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('automation.completed')}</span>
                {isLoading ? <Skeleton className="h-5 w-10" /> : <Badge variant="success">{executions?.completed ?? 0}</Badge>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('automation.failed')}</span>
                {isLoading ? <Skeleton className="h-5 w-10" /> : <Badge variant="destructive">{executions?.failed ?? 0}</Badge>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('automation.skipped')}</span>
                {isLoading ? <Skeleton className="h-5 w-10" /> : <Badge variant="secondary">{executions?.skipped ?? 0}</Badge>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('automation.pendingRunning')}</span>
                {isLoading ? <Skeleton className="h-5 w-10" /> : <Badge variant="warning">{executions?.pending ?? 0}</Badge>}
              </div>

              {data?.by_action_type && Object.keys(data.by_action_type).length > 0 && (
                <div className="border-t pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('automation.byActionType')}</p>
                  <div className="space-y-1">
                    {Object.entries(data.by_action_type).map(([action, count]) => (
                      <div key={action} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('status.' + action.toLowerCase())}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Automation Rules with stats — spec section 4 */}
        <AutomationRulesTable />

        {/* Execution Log — spec section 5 */}
        <ExecutionLogTable />

        {/* Failed Automations with retry — spec section 6 + 14 */}
        <FailedAutomationsSection />
      </div>
    </PageContainer>
  );
}
