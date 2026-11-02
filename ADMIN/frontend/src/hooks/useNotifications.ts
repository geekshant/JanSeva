import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  type ListNotificationsParams,
} from '@/services/notifications';

const notificationsKey = ['notifications'] as const;

export function useNotifications(params: ListNotificationsParams = {}) {
  return useQuery({
    queryKey: [...notificationsKey, 'list', params],
    queryFn: () => listNotifications(params),
  });
}

export function useUnreadCount(userId: string) {
  return useQuery({
    queryKey: [...notificationsKey, 'unread-count', userId],
    queryFn: () => getUnreadCount(userId),
    enabled: !!userId,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => markAllNotificationsRead(userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}
