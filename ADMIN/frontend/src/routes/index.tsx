import { Routes, Route, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { Spinner } from '@/components/ui/spinner';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ComplaintsPage } from '@/pages/complaints/ComplaintsPage';
import { ComplaintDetailPage } from '@/pages/complaints/ComplaintDetailPage';
import { AiReviewQueuePage } from '@/pages/complaints/AiReviewQueuePage';
import { ReopenedComplaintsPage } from '@/pages/complaints/ReopenedComplaintsPage';
import { IncidentsPage } from '@/pages/incidents/IncidentsPage';
import { IncidentDetailPage } from '@/pages/incidents/IncidentDetailPage';
import { DepartmentsPage } from '@/pages/departments/DepartmentsPage';
import { DepartmentDetailPage } from '@/pages/departments/DepartmentDetailPage';
import { OfficersPage } from '@/pages/officers/OfficersPage';
import { OfficerDetailPage } from '@/pages/officers/OfficerDetailPage';
import { SlaPage } from '@/pages/sla/SlaPage';
import { SlaRulesPage } from '@/pages/sla/SlaRulesPage';
import { SlaBreachedPage } from '@/pages/sla/SlaBreachedPage';
import { SlaEscalationsPage } from '@/pages/sla/SlaEscalationsPage';
import { CitizensPage } from '@/pages/citizens/CitizensPage';
import { CitizenDetailPage } from '@/pages/citizens/CitizenDetailPage';
import { GamificationPage } from '@/pages/gamification/GamificationPage';
import { BadgesPage } from '@/pages/gamification/BadgesPage';
import { RewardRulesPage } from '@/pages/gamification/RewardRulesPage';
import { LeaderboardPage } from '@/pages/gamification/LeaderboardPage';
import { CivicMissionsPage } from '@/pages/civic-missions/CivicMissionsPage';
import { AnalyticsOverviewPage } from '@/pages/analytics/AnalyticsOverviewPage';
import { AnalyticsComplaintsPage } from '@/pages/analytics/AnalyticsComplaintsPage';
import { AnalyticsResolutionPage } from '@/pages/analytics/AnalyticsResolutionPage';
import { AnalyticsDepartmentsPage } from '@/pages/analytics/AnalyticsDepartmentsPage';
import { AnalyticsWardsPage } from '@/pages/analytics/AnalyticsWardsPage';
import { AnalyticsCivicHealthPage } from '@/pages/analytics/AnalyticsCivicHealthPage';
import { AutomationCenterPage } from '@/pages/automation/AutomationCenterPage';
import { AutomationRulesPage } from '@/pages/automation/AutomationRulesPage';
import { NotificationsPage } from '@/pages/notifications/NotificationsPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { CategoriesSettingsPage } from '@/pages/settings/CategoriesSettingsPage';
import { NotificationConfigPage } from '@/pages/settings/NotificationConfigPage';
import { RolesPermissionsPage } from '@/pages/settings/RolesPermissionsPage';
import { AiVerificationSettingsPage } from '@/pages/settings/AiVerificationSettingsPage';
import { SafetyAlertsPage } from '@/pages/safety/SafetyAlertsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const MapPage = lazy(() =>
  import('@/pages/map/MapPage').then((m) => ({ default: m.MapPage })),
);

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — wrapped in auth + app shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell>
              <Outlet />
            </AppShell>
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route index element={<DashboardPage />} />

        {/* Operations */}
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="complaints/ai-review" element={<AiReviewQueuePage />} />
        <Route path="complaints/reopened" element={<ReopenedComplaintsPage />} />
        <Route path="complaints/:id" element={<ComplaintDetailPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/:id" element={<IncidentDetailPage />} />
        <Route
          path="map"
          element={
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Spinner className="h-8 w-8" />
                </div>
              }
            >
              <MapPage />
            </Suspense>
          }
        />
        <Route path="sla" element={<SlaPage />} />
        <Route path="sla/rules" element={<SlaRulesPage />} />
        <Route path="sla/breached" element={<SlaBreachedPage />} />
        <Route path="sla/escalations" element={<SlaEscalationsPage />} />

        {/* Organization */}
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="departments/:id" element={<DepartmentDetailPage />} />
        <Route path="officers" element={<OfficersPage />} />
        <Route path="officers/:id" element={<OfficerDetailPage />} />
        <Route path="citizens" element={<CitizensPage />} />
        <Route path="citizens/:id" element={<CitizenDetailPage />} />

        {/* Engagement */}
        <Route path="gamification" element={<GamificationPage />} />
        <Route path="gamification/badges" element={<BadgesPage />} />
        <Route path="gamification/rewards" element={<RewardRulesPage />} />
        <Route path="gamification/leaderboard" element={<LeaderboardPage />} />
        <Route path="civic-missions" element={<CivicMissionsPage />} />

        {/* Analytics */}
        <Route path="analytics" element={<AnalyticsOverviewPage />} />
        <Route path="analytics/complaints" element={<AnalyticsComplaintsPage />} />
        <Route path="analytics/resolution" element={<AnalyticsResolutionPage />} />
        <Route path="analytics/departments" element={<AnalyticsDepartmentsPage />} />
        <Route path="analytics/wards" element={<AnalyticsWardsPage />} />
        <Route path="analytics/civic-health" element={<AnalyticsCivicHealthPage />} />

        {/* Automation */}
        <Route path="automation" element={<AutomationCenterPage />} />
        <Route path="automation/rules" element={<AutomationRulesPage />} />

        {/* System */}
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/categories" element={<CategoriesSettingsPage />} />
        <Route path="settings/notifications" element={<NotificationConfigPage />} />
        <Route path="settings/roles" element={<RolesPermissionsPage />} />
        <Route path="settings/ai-verification" element={<AiVerificationSettingsPage />} />

        <Route path="safety" element={<SafetyAlertsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
