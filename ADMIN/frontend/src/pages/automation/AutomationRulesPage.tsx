import {
  Bot,
  Zap,
  Clock,
  AlertTriangle,
  Users,
  CheckCircle2,
  RotateCcw,
  FileSearch,
  Bell,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { useAutomationRules, useToggleAutomationRule } from '@/hooks/useAutomation';
import type { AutomationRuleRow, AutomationEventType, AutomationActionType } from '@/types';

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

const actionIcons: Record<AutomationActionType, LucideIcon> = {
  AUTO_VERIFY: CheckCircle2,
  AUTO_ASSIGN: Zap,
  SET_SLA: Clock,
  SLA_WARNING: AlertTriangle,
  ESCALATE: AlertTriangle,
  REQUEST_COMMUNITY_VERIFICATION: Users,
  AUTO_RESOLVE: CheckCircle2,
  AUTO_REOPEN: RotateCcw,
  NOTIFY: Bell,
  FLAG_FOR_REVIEW: FileSearch,
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

function RuleCard({
  rule,
  onToggle,
  isToggling,
}: {
  rule: AutomationRuleRow;
  onToggle: (id: string, enabled: boolean) => void;
  isToggling: boolean;
}) {
  const { t } = useTranslation();
  const Icon = actionIcons[rule.action_type] ?? Bot;

  return (
    <Card className={rule.enabled ? '' : 'opacity-60'}>
      <CardContent className="flex items-start justify-between p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{rule.name}</h3>
              <Badge variant="outline" className="text-xs">
                P{rule.priority}
              </Badge>
            </div>
            {rule.description && (
              <p className="text-sm text-muted-foreground">{rule.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="secondary" className="text-xs">
                {t(eventLabels[rule.event_type] ?? rule.event_type)}
              </Badge>
              <Badge variant="default" className="text-xs">
                {t(actionLabels[rule.action_type] ?? rule.action_type)}
              </Badge>
              {rule.enabled ? (
                <Badge variant="success" className="text-xs">{t('automation.active')}</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">{t('automation.disabled')}</Badge>
              )}
            </div>
          </div>
        </div>
        <Switch
          checked={rule.enabled}
          disabled={isToggling}
          onCheckedChange={(checked) => onToggle(rule.id, checked)}
        />
      </CardContent>
    </Card>
  );
}

export function AutomationRulesPage() {
  const { t } = useTranslation();
  const { data: rules, isLoading, error, refetch } = useAutomationRules();
  const toggleMutation = useToggleAutomationRule();

  if (error) {
    return (
      <PageContainer title={t('automation.rulesTitle')} description={t('automation.rulesShortDesc')}>
        <ErrorState message={t('automation.failedLoadRules')} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t('automation.rulesTitle')}
      description={t('automation.rulesDesc')}
    >
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-3 p-4 sm:p-6">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-11" />
              </CardContent>
            </Card>
          ))
        ) : !rules || rules.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title={t('automation.noRules')}
            description={t('automation.noRulesMsg')}
          />
        ) : (
          rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={(id, enabled) => toggleMutation.mutate({ id, enabled })}
              isToggling={toggleMutation.isPending}
            />
          ))
        )}
      </div>
    </PageContainer>
  );
}
