import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AdminRole } from '@/lib/workflow';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: AdminRole | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Canonical staff roles for the dashboard, plus accepted aliases.
 *
 * Supabase is the source of truth here: `public.is_admin()` in
 * `database/02_functions_triggers.sql` and the `public.officers.role` column
 * both spell the field role `OFFICER`. The separate Express/Prisma backend
 * calls the same seat `OFFICIAL`, so that spelling is normalised to `OFFICER`.
 */
const ADMIN_ROLES: Record<string, AdminRole> = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  DEPARTMENT_ADMIN: 'DEPARTMENT_ADMIN',
  OFFICER: 'OFFICER',
  OFFICIAL: 'OFFICER',
};

/**
 * Resolve the signed-in user's staff role.
 *
 * Only `app_metadata` is consulted. It is written exclusively by the service
 * role (and by the Supabase dashboard), so unlike `user_metadata` — which the
 * user can edit themselves via `auth.updateUser` — it cannot be used to
 * self-grant elevated access. This mirrors the `is_admin()` RLS helper, which
 * also reads `app_metadata` only.
 *
 * Returns `null` for citizens, unknown roles and signed-out users, which every
 * `canXxx()` helper in `lib/workflow.ts` treats as "no permissions".
 */
export function resolveAdminRole(user: User | null): AdminRole | null {
  const raw = (user?.app_metadata as { role?: unknown } | undefined)?.role;
  if (typeof raw !== 'string') return null;
  return ADMIN_ROLES[raw.trim().toUpperCase()] ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const user = session?.user ?? null;
  const role = resolveAdminRole(user);

  return (
    <AuthContext.Provider
      value={{ session, user, loading, role, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
