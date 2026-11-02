import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from './useRealtimeSubscription';

// ---------------------------------------------------------------------------
// Domain-specific realtime hooks.
// Each hook invalidates the appropriate TanStack Query cache when a relevant
// realtime event arrives, so the UI updates without a manual refetch.
//
// All subscriptions respect RLS — users only receive events for rows they
// are authorized to read.
// ---------------------------------------------------------------------------

// --- Complaints table (INSERT / UPDATE / DELETE) ---------------------------

/** Invalidates all complaint-related queries when the complaints table changes. */
export function useComplaintsRealtime() {
  const qc = useQueryClient();

  useRealtimeSubscription({
    channelName: 'realtime-complaints',
    event: '*',
    table: 'complaints',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['complaints'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['analytics'] });
      void qc.invalidateQueries({ queryKey: ['sla'] });
      void qc.invalidateQueries({ queryKey: ['map'] });
    },
  });
}

/** Invalidates a specific complaint's detail + history when it changes. */
export function useComplaintDetailRealtime(complaintId: string) {
  const qc = useQueryClient();

  useRealtimeSubscription({
    channelName: `realtime-complaint-${complaintId}`,
    event: 'UPDATE',
    table: 'complaints',
    filter: `id=eq.${complaintId}`,
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['complaints', 'detail', complaintId] });
    },
  });
}

// --- Complaint status history (INSERT) -------------------------------------

/** Invalidates complaint history when new status history entries arrive. */
export function useComplaintHistoryRealtime(complaintId: string) {
  const qc = useQueryClient();

  useRealtimeSubscription({
    channelName: `realtime-history-${complaintId}`,
    event: 'INSERT',
    table: 'complaint_status_history',
    filter: `complaint_id=eq.${complaintId}`,
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['complaints', 'history', complaintId] });
      // Also invalidate the complaint detail (status may have changed)
      void qc.invalidateQueries({ queryKey: ['complaints', 'detail', complaintId] });
      // And dashboard activity
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// --- Global status history (for dashboard activity feed) -------------------

/** Invalidates dashboard activity feed when any status history entry is added. */
export function useActivityFeedRealtime() {
  const qc = useQueryClient();

  useRealtimeSubscription({
    channelName: 'realtime-activity-feed',
    event: 'INSERT',
    table: 'complaint_status_history',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['dashboard', 'activity'] });
    },
  });
}

// --- New complaints (for dashboard + complaints list) ---------------------

/** Invalidates dashboard KPIs + recent complaints when a new complaint is created. */
export function useNewComplaintsRealtime() {
  const qc = useQueryClient();

  useRealtimeSubscription({
    channelName: 'realtime-new-complaints',
    event: 'INSERT',
    table: 'complaints',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['dashboard', 'kpis'] });
      void qc.invalidateQueries({ queryKey: ['dashboard', 'recent-complaints'] });
      void qc.invalidateQueries({ queryKey: ['complaints', 'list'] });
    },
  });
}

// --- Complaint images (INSERT) ---------------------------------------------

/** Invalidates complaint images when new evidence is uploaded. */
export function useComplaintImagesRealtime(complaintId: string) {
  const qc = useQueryClient();

  useRealtimeSubscription({
    channelName: `realtime-images-${complaintId}`,
    event: 'INSERT',
    table: 'complaint_images',
    filter: `complaint_id=eq.${complaintId}`,
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['complaints', 'images', complaintId] });
      void qc.invalidateQueries({ queryKey: ['complaints', 'detail', complaintId] });
    },
  });
}

// --- Notifications (INSERT / UPDATE) ---------------------------------------

/** Invalidates notification queries when new notifications arrive. */
export function useNotificationsRealtime(userId?: string) {
  const qc = useQueryClient();

  useRealtimeSubscription({
    channelName: 'realtime-notifications',
    event: '*',
    table: 'notifications',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// --- SLA breach detection (UPDATE on complaints) --------------------------

/**
 * Monitors complaint updates for SLA state changes. When a complaint's
 * sla_deadline passes (the row is updated or a new one is inserted with
 * a deadline), the SLA queries are invalidated to re-compute breach states.
 */
export function useSlaRealtime() {
  const qc = useQueryClient();

  useRealtimeSubscription({
    channelName: 'realtime-sla',
    event: '*',
    table: 'complaints',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['sla'] });
    },
  });
}

// --- Departments / Officers (for admin pages) ------------------------------

/** Invalidates department queries when departments change. */
export function useDepartmentsRealtime() {
  const qc = useQueryClient();

  useRealtimeSubscription({
    channelName: 'realtime-departments',
    event: '*',
    table: 'departments',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['departments'] });
    },
  });
}

/** Invalidates officer queries when officers change. */
export function useOfficersRealtime() {
  const qc = useQueryClient();

  useRealtimeSubscription({
    channelName: 'realtime-officers',
    event: '*',
    table: 'officers',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['officers'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Global realtime — mounted once in AppShell.
// Subscribes to all major tables and invalidates all relevant query caches
// so ANY page the admin is viewing updates when the mobile app changes data.
// ---------------------------------------------------------------------------

export function useGlobalRealtime() {
  const qc = useQueryClient();

  // Complaints — any change triggers broad invalidation.
  useRealtimeSubscription({
    channelName: 'global-complaints',
    event: '*',
    table: 'complaints',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['complaints'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['analytics'] });
      void qc.invalidateQueries({ queryKey: ['sla'] });
      void qc.invalidateQueries({ queryKey: ['map'] });
      void qc.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  // Status history — new entries update activity feed + complaint details.
  useRealtimeSubscription({
    channelName: 'global-status-history',
    event: 'INSERT',
    table: 'complaint_status_history',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  // Complaint images — new evidence updates complaint details.
  useRealtimeSubscription({
    channelName: 'global-complaint-images',
    event: 'INSERT',
    table: 'complaint_images',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  // Notifications — new/updated notifications.
  useRealtimeSubscription({
    channelName: 'global-notifications',
    event: '*',
    table: 'notifications',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Profiles — citizen points/level/badges change.
  useRealtimeSubscription({
    channelName: 'global-profiles',
    event: 'UPDATE',
    table: 'profiles',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      void qc.invalidateQueries({ queryKey: ['gamification'] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Rewards — new points transactions.
  useRealtimeSubscription({
    channelName: 'global-rewards',
    event: 'INSERT',
    table: 'rewards',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      void qc.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  // User badges — badge earned.
  useRealtimeSubscription({
    channelName: 'global-user-badges',
    event: 'INSERT',
    table: 'user_badges',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
      void qc.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  // Departments.
  useRealtimeSubscription({
    channelName: 'global-departments',
    event: '*',
    table: 'departments',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['departments'] });
      void qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  // Officers.
  useRealtimeSubscription({
    channelName: 'global-officers',
    event: '*',
    table: 'officers',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['officers'] });
    },
  });

  // Badges config.
  useRealtimeSubscription({
    channelName: 'global-badges',
    event: '*',
    table: 'badges',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  // Reward rules config.
  useRealtimeSubscription({
    channelName: 'global-reward-rules',
    event: '*',
    table: 'reward_rules',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['gamification'] });
    },
  });

  // Resolution evidence — new evidence uploads.
  useRealtimeSubscription({
    channelName: 'global-resolution-evidence',
    event: '*',
    table: 'resolution_evidence',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['verification'] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  // Community verifications — citizen responses.
  useRealtimeSubscription({
    channelName: 'global-community-verifications',
    event: '*',
    table: 'community_verifications',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['verification'] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  // Civic incidents.
  useRealtimeSubscription({
    channelName: 'global-civic-incidents',
    event: '*',
    table: 'civic_incidents',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['incidents'] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  // Duplicate links.
  useRealtimeSubscription({
    channelName: 'global-duplicate-links',
    event: '*',
    table: 'duplicate_links',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['incidents'] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  // Automation audit log.
  useRealtimeSubscription({
    channelName: 'global-automation-audit',
    event: '*',
    table: 'automation_audit_log',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['automation'] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });

  // Automation executions.
  useRealtimeSubscription({
    channelName: 'global-automation-executions',
    event: '*',
    table: 'automation_executions',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['automation'] });
    },
  });

  // Automation rules config.
  useRealtimeSubscription({
    channelName: 'global-automation-rules',
    event: '*',
    table: 'automation_rules',
    onEvent: () => {
      void qc.invalidateQueries({ queryKey: ['automation'] });
    },
  });
}
