import { useTranslation } from '@/i18n/translate';
import { Spinner } from '@/components/ui/spinner';

export function LoadingState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-muted-foreground">{message ?? t('common.loading')}</p>
    </div>
  );
}
