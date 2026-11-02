import { useState } from 'react';
import { useTranslation } from '@/i18n/translate';
import { Bell, CheckCheck, BellOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { PageContainer } from '@/components/layout/PageContainer';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { useAuth } from '@/hooks/useAuth';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import { useNotificationsRealtime } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';
import type { NotificationRow } from '@/types';

const PAGE_LIMIT = 20;

export function NotificationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const notificationsQuery = useNotifications({ page, limit: PAGE_LIMIT, unreadOnly });
  const markReadMutation = useMarkNotificationRead();
  const markAllMutation = useMarkAllNotificationsRead();

  // Realtime: update list when new notifications arrive.
  useNotificationsRealtime(user?.id);

  const handleMarkRead = async (id: string) => {
    await markReadMutation.mutateAsync(id);
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllMutation.mutateAsync(user.id);
  };

  return (
    <PageContainer
      title={t('notifications.title')}
      description={t('notifications.desc')}
      actions={
        <div className="flex items-center gap-2">
          <Select
            value={unreadOnly ? 'unread' : 'all'}
            onChange={(e) => {
              setUnreadOnly(e.target.value === 'unread');
              setPage(1);
            }}
            className="w-32"
          >
            <option value="all">{t('notifications.all')}</option>
            <option value="unread">{t('notifications.unread')}</option>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllMutation.isPending || !notificationsQuery.data?.data.some((n) => !n.is_read)}
          >
            <CheckCheck className="h-4 w-4" />
            {t('notifications.markAllRead')}
          </Button>
        </div>
      }
    >
      {notificationsQuery.error ? (
        <ErrorState
          title={t('notifications.couldNotLoad')}
          onRetry={() => void notificationsQuery.refetch()}
        />
      ) : notificationsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : notificationsQuery.data && notificationsQuery.data.data.length > 0 ? (
        <>
          <div className="space-y-2">
            {notificationsQuery.data.data.map((notif) => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                onMarkRead={() => handleMarkRead(notif.id)}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={notificationsQuery.data.totalPages}
            total={notificationsQuery.data.total}
            limit={PAGE_LIMIT}
            onPageChange={setPage}
          />
        </>
      ) : (
        <EmptyState
          icon={unreadOnly ? BellOff : Bell}
          title={unreadOnly ? t('notifications.noUnread') : t('notifications.noNotifications')}
          description={unreadOnly ? t('notifications.noUnreadMsg') : t('notifications.noNotificationsMsg')}
        />
      )}
    </PageContainer>
  );
}

function NotificationCard({
  notification,
  onMarkRead,
}: {
  notification: NotificationRow;
  onMarkRead: () => void;
}) {
  const { t } = useTranslation();
  const timeAgo = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('time.justNow');
    if (mins < 60) return t('time.minAgo', { count: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('time.hrAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('time.dayAgo', { count: days });
  };

  return (
    <Card className={cn('transition-colors', !notification.is_read && 'border-primary/30 bg-primary/5')}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          notification.is_read ? 'bg-muted' : 'bg-primary/10',
        )}>
          <Bell className={cn('h-4 w-4', notification.is_read ? 'text-muted-foreground' : 'text-primary')} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{notification.title}</p>
            {!notification.is_read && <Badge variant="default" className="text-[10px]">{t('notifications.new')}</Badge>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">{timeAgo(notification.created_at)}</p>
        </div>
        {!notification.is_read && (
          <Button variant="ghost" size="sm" onClick={onMarkRead} className="shrink-0 text-xs">
            {t('notifications.markRead')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
