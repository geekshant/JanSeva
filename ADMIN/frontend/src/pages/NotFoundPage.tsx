import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <Compass className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">{t('common.pageNotFound')}</h1>
      <p className="text-sm text-muted-foreground">
        {t('common.pageNotFoundMsg')}
      </p>
      <Button asChild>
        <Link to="/">{t('common.backToDashboard')}</Link>
      </Button>
    </div>
  );
}
