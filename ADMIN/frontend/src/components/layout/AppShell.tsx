import { useState, useEffect, type ReactNode } from 'react';
import { useTranslation } from '@/i18n/translate';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useSlaBreachAlerts } from '@/hooks/useSlaBreachAlerts';
import { useNewComplaintAlerts } from '@/hooks/useNewComplaintAlerts';
import { useGlobalRealtime } from '@/hooks/useRealtime';
import { useBuzzerContext } from '@/contexts/BuzzerContext';
import { useSafetyRealtime, useActiveSafetyAlertsCount } from '@/hooks/useSafety';

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // ── Global buzzer (works on every page) ──────────────────────────────
  const buzzer = useBuzzerContext();
  const safetyCount = useActiveSafetyAlertsCount();

  // SOS buzzer: fires on any page when a new active safety alert arrives
  useSafetyRealtime(buzzer.play);

  // Auto-unlock audio on first user interaction (browser autoplay policy).
  // Any click/keydown unlocks audio so realtime callbacks can play sound.
  useEffect(() => {
    if (buzzer.audioUnlocked) return;
    const handler = () => {
      if (!buzzer.enabled) return;
      void buzzer.unlock();
    };
    window.addEventListener('click', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [buzzer]);

  // Stop the buzzer when there are no more active alerts (acknowledged/resolved)
  useEffect(() => {
    if ((safetyCount.data ?? 0) === 0) buzzer.stop();
  }, [safetyCount.data, buzzer]);

  // ── Global realtime + alerts ─────────────────────────────────────────
  useGlobalRealtime();
  useSlaBreachAlerts();

  // New complaint alerts with small chime buzzer
  useNewComplaintAlerts(() => buzzer.play('complaint'));

  // Close mobile drawer on Escape key.
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className="hidden shrink-0 transition-all duration-200 lg:block"
        style={{ width: collapsed ? 64 : 256 }}
      >
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((p) => !p)}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.navMenu')}>
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-64 shadow-xl">
            <Sidebar
              collapsed={false}
              onToggleCollapse={() => {}}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
