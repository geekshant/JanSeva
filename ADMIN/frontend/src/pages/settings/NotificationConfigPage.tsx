import { PageContainer } from '@/components/layout/PageContainer';
import { useTranslation } from '@/i18n/translate';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useNotificationConfigs, useUpdateNotificationConfig } from '@/hooks/useNotificationConfig';
import { useAuth } from '@/hooks/useAuth';

export function NotificationConfigPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const configsQuery = useNotificationConfigs();
  const updateMutation = useUpdateNotificationConfig();

  const handleToggle = async (
    id: string,
    field: 'in_app_enabled' | 'push_enabled',
    value: boolean,
  ) => {
    await updateMutation.mutateAsync({
      id,
      patch: { [field]: value },
      actorId: user?.id ?? null,
    });
  };

  return (
    <PageContainer
      title={t('settings.notifConfigTitle')}
      description={t('settings.notifConfigDesc')}
    >
      <div className="space-y-4">
        {configsQuery.error ? (
          <ErrorState title={t('settings.notifConfigCouldNotLoad')} onRetry={() => void configsQuery.refetch()} />
        ) : configsQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : configsQuery.data && configsQuery.data.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.tableEventType')}</TableHead>
                  <TableHead>{t('settings.tableDescription')}</TableHead>
                  <TableHead className="text-center">{t('settings.tableInApp')}</TableHead>
                  <TableHead className="text-center">{t('settings.tablePush')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configsQuery.data.map((cfg) => (
                  <TableRow key={cfg.id}>
                    <TableCell>
                      <div className="font-medium">{cfg.label}</div>
                      <span className="font-mono text-xs text-muted-foreground">{cfg.event_type}</span>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      {cfg.description ?? '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={cfg.in_app_enabled}
                        onCheckedChange={(v: boolean) => handleToggle(cfg.id, 'in_app_enabled', v)}
                        disabled={updateMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={cfg.push_enabled}
                        onCheckedChange={(v: boolean) => handleToggle(cfg.id, 'push_enabled', v)}
                        disabled={updateMutation.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('settings.noNotifConfigs')}
          </p>
        )}
      </div>
    </PageContainer>
  );
}
