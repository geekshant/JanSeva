import { PageContainer } from '@/components/layout/PageContainer';
import { useTranslation } from '@/i18n/translate';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdminRole } from '@/lib/workflow';

// ---------------------------------------------------------------------------
// Roles & Permissions — display the permission matrix.
// Roles and their permissions are defined in code (lib/workflow.ts) and
// enforced across the admin frontend. This page provides a read-only view
// for transparency and onboarding. Changes require a code deployment.
// ---------------------------------------------------------------------------

interface PermissionDef {
  key: string;
  labelKey: string;
  descKey: string;
  roles: AdminRole[];
}

const ALL_ROLES: AdminRole[] = ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN', 'OFFICER'];

const PERMISSIONS: PermissionDef[] = [
  { key: 'view_complaints', labelKey: 'settings.permViewComplaints', descKey: 'settings.permViewComplaintsDesc', roles: ALL_ROLES },
  { key: 'assign', labelKey: 'settings.permAssign', descKey: 'settings.permAssignDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'change_status', labelKey: 'settings.permChangeStatus', descKey: 'settings.permChangeStatusDesc', roles: ALL_ROLES },
  { key: 'escalate', labelKey: 'settings.permEscalate', descKey: 'settings.permEscalateDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'add_note', labelKey: 'settings.permAddNote', descKey: 'settings.permAddNoteDesc', roles: ALL_ROLES },
  { key: 'view_citizen_contact', labelKey: 'settings.permViewContact', descKey: 'settings.permViewContactDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'suspend_citizen', labelKey: 'settings.permSuspend', descKey: 'settings.permSuspendDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'restore_citizen', labelKey: 'settings.permRestore', descKey: 'settings.permRestoreDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'delete_citizen', labelKey: 'settings.permDelete', descKey: 'settings.permDeleteDesc', roles: ['SYSTEM_ADMIN'] },
  { key: 'upload_evidence', labelKey: 'settings.permUpload', descKey: 'settings.permUploadDesc', roles: ALL_ROLES },
  { key: 'reopen_complaint', labelKey: 'settings.permReopen', descKey: 'settings.permReopenDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'view_verification', labelKey: 'settings.permViewVerification', descKey: 'settings.permViewVerificationDesc', roles: ALL_ROLES },
  { key: 'manage_incidents', labelKey: 'settings.permManageIncidents', descKey: 'settings.permManageIncidentsDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'manage_categories', labelKey: 'settings.permManageCategories', descKey: 'settings.permManageCategoriesDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'manage_sla_rules', labelKey: 'settings.permManageSla', descKey: 'settings.permManageSlaDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'manage_departments', labelKey: 'settings.permManageDepartments', descKey: 'settings.permManageDepartmentsDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'manage_badges', labelKey: 'settings.permManageBadges', descKey: 'settings.permManageBadgesDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'manage_reward_rules', labelKey: 'settings.permManageRewardRules', descKey: 'settings.permManageRewardRulesDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'manage_notification_config', labelKey: 'settings.permManageNotif', descKey: 'settings.permManageNotifDesc', roles: ['SYSTEM_ADMIN', 'DEPARTMENT_ADMIN'] },
  { key: 'view_audit_logs', labelKey: 'settings.permViewAudit', descKey: 'settings.permViewAuditDesc', roles: ['SYSTEM_ADMIN'] },
];

const ROLE_LABELS: Record<AdminRole, string> = {
  SYSTEM_ADMIN: 'settings.roleSystemAdmin',
  DEPARTMENT_ADMIN: 'settings.roleDeptAdmin',
  OFFICER: 'settings.roleOfficer',
};

export function RolesPermissionsPage() {
  const { t } = useTranslation();
  return (
    <PageContainer
      title={t('settings.rolesTitle')}
      description={t('settings.rolesDesc')}
    >
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">{t('settings.tablePermission')}</TableHead>
                <TableHead>{t('settings.tableDescription')}</TableHead>
                {ALL_ROLES.map((role) => (
                  <TableHead key={role} className="text-center">
                    {t(ROLE_LABELS[role])}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map((perm) => (
                <TableRow key={perm.key}>
                  <TableCell className="font-medium">{t(perm.labelKey)}</TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    {t(perm.descKey)}
                  </TableCell>
                  {ALL_ROLES.map((role) => (
                    <TableCell key={role} className="text-center">
                      {perm.roles.includes(role) ? (
                        <Badge variant="success" className="text-[10px]">{t('settings.yes')}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('settings.rolesFootnote')}
        </p>
      </div>
    </PageContainer>
  );
}
