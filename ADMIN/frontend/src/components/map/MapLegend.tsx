import { Flame } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';

// ---------------------------------------------------------------------------
// MapLegend — explains the heatmap gradient and weighted density.
// ---------------------------------------------------------------------------

export function MapLegend() {
  const { t } = useTranslation();
  return (
    <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-background/95 p-3 shadow-lg">
      <div className="mb-2 flex items-center gap-1.5">
        <Flame className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold">{t('map.densityTitle')}</span>
      </div>
      {/* Gradient bar */}
      <div
        className="h-2 w-32 rounded-full"
        style={{
          background:
            'linear-gradient(to right, #3b82f6, #a78bfa, #f59e0b, #ef4444, #dc2626)',
        }}
      />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{t('map.densityLow')}</span>
        <span>{t('map.densityHigh')}</span>
      </div>
      <p className="mt-2 max-w-[140px] text-[10px] leading-tight text-muted-foreground">
        {t('map.densityDesc')}
      </p>
    </div>
  );
}
