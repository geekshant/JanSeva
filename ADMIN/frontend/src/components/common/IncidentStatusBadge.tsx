import { Badge, type BadgeProps } from '@/components/ui/badge';
import { useTranslation } from '@/i18n/translate';
import type { CivicIncidentRow } from '@/types';

const STATUS_CONFIG: Record<
  CivicIncidentRow['status'],
  { variant: BadgeProps['variant']; key: string }
> = {
  active: { variant: 'warning', key: 'incidentStatus.active' },
  merged: { variant: 'secondary', key: 'incidentStatus.merged' },
  resolved: { variant: 'success', key: 'incidentStatus.resolved' },
  closed: { variant: 'secondary', key: 'incidentStatus.closed' },
};

export function IncidentStatusBadge({ status }: { status: CivicIncidentRow['status'] }) {
  const { t } = useTranslation();
  const info = STATUS_CONFIG[status] ?? STATUS_CONFIG.active;
  return <Badge variant={info.variant}>{t(info.key)}</Badge>;
}
