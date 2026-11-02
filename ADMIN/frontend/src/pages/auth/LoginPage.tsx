import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from '@/i18n/translate';
import { ShieldCheck, AlertCircle, Copy, Check, Eye, EyeOff } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/hooks/useAuth';

const DEMO_ACCOUNTS = [
  {
    roleKey: 'System Admin',
    email: 'admin@janmitra.demo',
    description: 'Full access — all modules & settings',
  },
  {
    roleKey: 'Department Admin',
    email: 'dept.admin@janmitra.demo',
    description: 'Manages a department & its officers',
  },
  {
    roleKey: 'Officer',
    email: 'officer@janmitra.demo',
    description: 'Handles assigned complaints',
  },
];
const DEMO_PASSWORD = 'Demo@1234';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // `ProtectedRoute` stores a path string; ignore anything else.
  const stateFrom = (location.state as { from?: unknown } | null)?.from;
  const from = typeof stateFrom === 'string' && stateFrom.startsWith('/') ? stateFrom : '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error && err.message ? err.message : '';
      setError(msg || t('auth.signInFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard may be blocked in insecure contexts
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-4xl grid gap-8 lg:grid-cols-2 lg:items-center">
        {/* Login form */}
        <Card className="w-full">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">{t('auth.brand')}</span>
            </div>
            <CardTitle className="text-2xl">{t('auth.signIn')}</CardTitle>
            <CardDescription>{t('auth.signInDesc')}</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  {t('auth.email')}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.passwordPlaceholder')}
                    autoComplete="current-password"
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    tabIndex={-1}
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? t('common.hidePassword')
                        : t('common.showPassword')
                    }
                    className="absolute right-0 top-0 h-9 w-10 px-0 hover:bg-transparent"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    {t('auth.signingIn')}
                  </>
                ) : (
                  t('auth.signIn')
                )}
              </Button>
            </CardContent>
          </form>
          <CardFooter className="flex flex-col gap-2">
            <p className="w-full text-center text-xs text-muted-foreground">
              {t('auth.footer')}
            </p>
          </CardFooter>
        </Card>

        {/* Demo credentials */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t('auth.demoAccounts')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('auth.demoDesc')}
            </p>
          </div>
          <div className="space-y-3">
            {DEMO_ACCOUNTS.map((acc) => (
              <div
                key={acc.email}
                className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{acc.roleKey}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {acc.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fillDemo(acc.email)}
                  >
                    {t('common.use')}
                  </Button>
                </div>
                <Separator className="my-3" />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t('complaints.citizenEmail')}</span>
                    <code className="font-mono">{acc.email}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(acc.email, acc.email)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={t('common.copyEmail')}
                    >
                      {copied === acc.email ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">{t('auth.password')}</span>
                    <code className="font-mono">{DEMO_PASSWORD}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(DEMO_PASSWORD, 'password')}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={t('common.copyPassword')}
                    >
                      {copied === 'password' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {t('auth.demoAllPassword')}{' '}
            <code className="font-mono font-medium">{t('auth.demoPasswordValue')}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
