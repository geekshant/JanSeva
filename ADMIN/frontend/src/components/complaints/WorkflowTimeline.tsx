import { CheckCircle2, Circle, XCircle, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { cn } from '@/lib/utils';
import type { ComplaintStatus } from '@/types';
import { WORKFLOW_ORDER } from '@/lib/workflow';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Visual workflow timeline — shows the full complaint lifecycle with
 * the current position highlighted and past steps marked as completed.
 *
 *   SUBMITTED → VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED
 *
 * REJECTED is shown as a separate terminal state.
 */
export function WorkflowTimeline({
  currentStatus,
  history,
  loading,
}: {
  currentStatus: ComplaintStatus;
  history: { status: ComplaintStatus; created_at: string; comment: string | null }[];
  loading?: boolean;
}) {
  const { t } = useTranslation();
  if (loading) {
    return <Skeleton className="h-24" />;
  }

  // If rejected, show a special view
  if (currentStatus === 'REJECTED') {
    return (
      <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
        <XCircle className="h-5 w-5 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">{t('complaints.rejectedTitle')}</p>
          <p className="text-xs text-muted-foreground">
            {t('complaints.rejectedDesc')}
          </p>
        </div>
      </div>
    );
  }

  // Find the index of the current status in the workflow order
  const currentIndex = WORKFLOW_ORDER.indexOf(currentStatus);

  // Build a map of status → first occurrence timestamp from history
  const statusTimestamps = new Map<ComplaintStatus, string>();
  for (const entry of history) {
    if (!statusTimestamps.has(entry.status)) {
      statusTimestamps.set(entry.status, entry.created_at);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {WORKFLOW_ORDER.map((status, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isPending = i > currentIndex;
        const timestamp = statusTimestamps.get(status);

        return (
          <div key={status} className="flex items-center gap-1">
            {/* Step */}
            <div
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-md border px-3 py-2 transition-colors',
                isCompleted && 'border-green-200 bg-green-50',
                isCurrent && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                isPending && 'border-border bg-muted/30 opacity-60',
              )}
            >
              <div className="flex items-center gap-1.5">
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : isCurrent ? (
                  <Circle className="h-4 w-4 fill-primary text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    isCompleted && 'text-green-700',
                    isCurrent && 'text-primary',
                    isPending && 'text-muted-foreground',
                  )}
                >
                  {t('status.' + status.toLowerCase())}
                </span>
              </div>
              {timestamp && (
                <span className="text-[10px] text-muted-foreground">
                  {new Date(timestamp).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              )}
            </div>

            {/* Arrow */}
            {i < WORKFLOW_ORDER.length - 1 && (
              <ArrowRight
                className={cn(
                  'h-4 w-4 shrink-0',
                  i < currentIndex ? 'text-green-500' : 'text-muted-foreground/40',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
