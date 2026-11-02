import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listNotificationConfigs,
  updateNotificationConfig,
} from '@/services/notificationConfig';
import { toastSuccess, toastError, errMessage } from '@/hooks/useToastFeedback';
import type { NotificationConfigUpdate } from '@/types';

const configKey = ['notification-config'] as const;

export function useNotificationConfigs() {
  return useQuery({
    queryKey: [...configKey, 'list'],
    queryFn: () => listNotificationConfigs(),
  });
}

export function useUpdateNotificationConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
      actorId,
    }: {
      id: string;
      patch: NotificationConfigUpdate;
      actorId: string | null;
    }) => updateNotificationConfig(id, patch, actorId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: configKey });
      toastSuccess('Notification preference updated');
    },
    onError: (err) => toastError('Failed to update preference', errMessage(err)),
  });
}
