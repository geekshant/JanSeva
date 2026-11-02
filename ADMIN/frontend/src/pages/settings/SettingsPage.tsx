import { Link } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  User,
  Moon,
  Sun,
  Palette,
  Info,
  Tags,
  Clock,
  Building2,
  Shield,
  Trophy,
  Bell,
  ChevronRight,
  FlaskConical,
  Zap,
  Loader2,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { PageContainer } from '@/components/layout/PageContainer';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { canManageIncidents } from '@/lib/workflow';
import {
  useDemoModeStatus,
  useToggleDemoMode,
  useSeedDemoComplaints,
  useDemoModeRunner,
} from '@/hooks/useDemo';

interface ConfigLink {
  to: string;
  icon: typeof Tags;
  labelKey: string;
  descriptionKey: string;
  adminOnly?: boolean;
}

const CONFIG_SECTIONS: ConfigLink[] = [
  { to: '/settings/categories', icon: Tags, labelKey: 'settings.sectionCategories', descriptionKey: 'settings.sectionCategoriesDesc' },
  { to: '/sla/rules', icon: Clock, labelKey: 'settings.sectionSlaRules', descriptionKey: 'settings.sectionSlaRulesDesc' },
  { to: '/departments', icon: Building2, labelKey: 'settings.sectionDepartments', descriptionKey: 'settings.sectionDepartmentsDesc' },
  { to: '/settings/roles', icon: Shield, labelKey: 'settings.sectionRoles', descriptionKey: 'settings.sectionRolesDesc' },
  { to: '/gamification/badges', icon: Trophy, labelKey: 'settings.sectionBadges', descriptionKey: 'settings.sectionBadgesDesc' },
  { to: '/gamification/rewards', icon: Trophy, labelKey: 'settings.sectionRewardRules', descriptionKey: 'settings.sectionRewardRulesDesc' },
  { to: '/settings/notifications', icon: Bell, labelKey: 'settings.sectionNotifications', descriptionKey: 'settings.sectionNotificationsDesc' },
];

export function SettingsPage() {
  const { t } = useTranslation();
  const { user, signOut, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const canManage = canManageIncidents(role ?? 'OFFICER');
  const demoStatusQuery = useDemoModeStatus();
  const toggleMutation = useToggleDemoMode();
  const seedMutation = useSeedDemoComplaints();
  const runner = useDemoModeRunner();
  const demoEnabled = demoStatusQuery.data ?? false;

  const userRole = role ?? 'User';

  const initials = (user?.email ?? '?')
    .split('@')[0]!
    .split(/[.\s]/)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  return (
    <PageContainer
      title={t('settings.title')}
      description={t('settings.desc')}
    >
      <div className="space-y-6">
        {/* System Configuration */}
        <div>
          <h2 className="mb-3 text-lg font-semibold">{t('settings.systemConfig')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONFIG_SECTIONS.map((section) => {
              if (section.adminOnly && !canManage) return null;
              const Icon = section.icon;
              return (
                <Link key={section.to} to={section.to}>
                  <Card className="h-full transition-colors hover:bg-accent">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="rounded-md bg-primary/10 p-2">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{t(section.labelKey)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t(section.descriptionKey)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Account & Display */}
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                {t('settings.account')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.user_metadata?.avatar_url as string | undefined} />
                  <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{user?.email ?? t('common.unknown')}</p>
                  <Badge variant="secondary">{userRole}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                {t('settings.display')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="h-5 w-5 text-blue-400" />
                  ) : (
                    <Sun className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{t('settings.theme')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.currently', { value: theme === 'dark' ? t('topnav.darkMode') : t('topnav.lightMode') })}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={toggleTheme}>
                  {theme === 'dark' ? t('settings.switchToLight') : t('settings.switchToDark')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="h-4 w-4" />
                Demo Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {demoEnabled ? (
                    <Zap className="h-5 w-5 text-amber-500" />
                  ) : (
                    <FlaskConical className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm font-medium">Automated Demo Workflow</p>
                    <p className="text-xs text-muted-foreground">
                      {demoEnabled
                        ? 'Auto-advancing complaints every 10s. New complaints created periodically.'
                        : 'Enable to simulate the full complaint lifecycle automatically.'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={demoEnabled}
                  onCheckedChange={(v) => toggleMutation.mutate(v)}
                  disabled={toggleMutation.isPending}
                />
              </div>
              {demoEnabled && (
                <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>
                    Runner active — {runner.totalAdvanced} workflow steps advanced so far.
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Seed Bhopal Complaints</p>
                    <p className="text-xs text-muted-foreground">
                      Insert 15 realistic complaints across Bhopal with image evidence.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                >
                  {seedMutation.isPending ? 'Seeding...' : 'Seed Now'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4" />
                {t('settings.about')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>{t('settings.platform')}</span>
                <span className="font-medium text-foreground">{t('settings.platformValue')}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>{t('settings.version')}</span>
                <span className="font-mono text-foreground">{t('settings.versionValue')}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span>{t('settings.backend')}</span>
                <span className="font-mono text-foreground">{t('settings.backendValue')}</span>
              </div>
            </CardContent>
          </Card>

          <Button variant="destructive" className="w-full" onClick={async () => { await signOut(); window.location.href = '/login'; }}>
            {t('settings.signOut')}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
