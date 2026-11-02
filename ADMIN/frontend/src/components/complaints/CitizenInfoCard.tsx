import { User, Mail, Phone, Calendar, Award } from 'lucide-react';
import { useTranslation } from '@/i18n/translate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import type { AdminRole } from '@/lib/workflow';
import { canViewCitizenContact } from '@/lib/workflow';

interface CitizenInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  points?: number;
  level?: number;
  created_at?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Citizen information card — shows reporter details.
 * Contact info (email, phone) is only shown to roles with permission.
 */
export function CitizenInfoCard({
  citizen,
  role,
}: {
  citizen: CitizenInfo;
  role: AdminRole | null;
}) {
  const { t } = useTranslation();
  const showContact = canViewCitizenContact(role ?? 'OFFICER');
  const initials = citizen.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('complaints.citizenInformation')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {initials || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{citizen.name}</p>
            {citizen.level !== undefined && (
              <p className="text-xs text-muted-foreground">{t('complaints.citizenLevel', { level: citizen.level })}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Contact — role-filtered */}
        <div className="space-y-2 text-sm">
          {showContact ? (
            <>
              {citizen.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('complaints.citizenEmail')}</span>
                  <span className="font-medium truncate">{citizen.email}</span>
                </div>
              )}
              {citizen.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('complaints.citizenPhone')}</span>
                  <span className="font-medium">{citizen.phone}</span>
                </div>
              )}
              {citizen.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('complaints.citizenMemberSince')}</span>
                  <span className="font-medium">{formatDate(citizen.created_at)}</span>
                </div>
              )}
              {citizen.points !== undefined && (
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('complaints.citizenPoints')}</span>
                  <span className="font-medium">{citizen.points}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-xs">
                {t('complaints.citizenContactRestricted')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
