import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  User as UserIcon,
  Settings,
  Radio,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  VolumeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeContext, type ConnectionStatus } from '@/contexts/RealtimeContext';
import { useBuzzerContext } from '@/contexts/BuzzerContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export function TopNav({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, signOut, role: adminRole } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/complaints?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  // Extract name initials for avatar fallback
  const initials = (user?.email ?? '?')
    .split('@')[0]!
    .split(/[.\s]/)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');

  // Canonical staff role (app_metadata), with a friendly fallback for
  // accounts that hold no staff role at all.
  const role = adminRole ?? t('topnav.defaultRole');

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4 lg:px-6">
      {/* Mobile menu toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label={t('nav.toggleNav')}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Breadcrumbs — hidden on small screens, flex-1 on large */}
      <div className="hidden min-w-0 flex-1 md:block">
        <Breadcrumbs />
      </div>

      {/* Search — hidden on small screens */}
      <form onSubmit={handleSearch} className="relative hidden sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder={t('topnav.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48 pl-9 lg:w-64"
        />
      </form>

      {/* Spacer — takes remaining space on mobile */}
      <div className="flex-1 sm:flex-none" />

      {/* Right-side action cluster — fixed width, no wrapping */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Realtime connection indicator */}
        <RealtimeIndicator />

        {/* Global buzzer mute toggle */}
        <BuzzerToggle />

        <Separator orientation="vertical" className="hidden h-6 sm:block" />

        {/* Dark mode toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/notifications')}
              aria-label={t('topnav.notifications')}
            >
              <Bell className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('topnav.notifications')}</TooltipContent>
        </Tooltip>

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label={t('topnav.profileMenu')}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url as string | undefined} />
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">
                {user?.email ?? t('common.unknown')}
              </span>
              <Badge variant="secondary" className="w-fit text-[10px]">
                {role}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <UserIcon className="h-4 w-4" />
              {t('topnav.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4" />
              {t('nav.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="h-4 w-4" />
              {t('topnav.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// ThemeToggle — toggles between light and dark mode.
// ---------------------------------------------------------------------------

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={isDark ? t('topnav.switchLight') : t('topnav.switchDark')}
        >
          {isDark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isDark ? t('topnav.lightMode') : t('topnav.darkMode')}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// RealtimeIndicator — shows connection status from RealtimeContext.
// Green pulse = connected, amber = connecting, red = disconnected/error.
// Tooltip shows active subscription count.
// ---------------------------------------------------------------------------

function RealtimeIndicator() {
  const { status, activeSubscriptions } = useRealtimeContext();

  const colorMap: Record<ConnectionStatus, { dot: string; ping: string; icon: string; pulse?: boolean }> = {
    connected: { dot: 'bg-green-500', ping: 'bg-green-500', icon: 'text-green-600', pulse: true },
    connecting: { dot: 'bg-amber-500', ping: 'bg-amber-500', icon: 'text-amber-600', pulse: true },
    disconnected: { dot: 'bg-red-500', ping: 'bg-red-500', icon: 'text-red-500' },
    error: { dot: 'bg-red-500', ping: 'bg-red-500', icon: 'text-red-500' },
  };

  const c = colorMap[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5">
          <span className="relative flex h-2 w-2">
            {c.pulse && (
              <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', c.ping)} />
            )}
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                c.dot,
              )}
            />
          </span>
          <Radio
            className={cn(
              'h-3.5 w-3.5',
              c.icon,
            )}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {`Realtime: ${status} (${activeSubscriptions} active)`}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------------------------------------------------------------------
// BuzzerToggle — global mute/unmute for the admin buzzer (safety + complaint)
// ---------------------------------------------------------------------------
function BuzzerToggle() {
  const buzzer = useBuzzerContext();
  // Show a warning indicator when the buzzer is enabled but audio is locked
  // (browser autoplay policy). The admin needs to click once to unlock.
  const needsUnlock = buzzer.enabled && !buzzer.audioUnlocked;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={buzzer.toggle}
          aria-label={buzzer.enabled ? 'Mute buzzer' : 'Unmute buzzer'}
          className={needsUnlock ? 'relative animate-pulse text-destructive' : ''}
        >
          {needsUnlock ? (
            <VolumeOff className="h-5 w-5 text-destructive" />
          ) : buzzer.enabled ? (
            <Volume2 className="h-5 w-5 text-primary" />
          ) : (
            <VolumeX className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {needsUnlock
          ? 'Buzzer ON but audio locked — click to enable emergency sound'
          : buzzer.enabled
            ? 'Buzzer ON (click to mute)'
            : 'Buzzer OFF (click to unmute)'}
      </TooltipContent>
    </Tooltip>
  );
}
