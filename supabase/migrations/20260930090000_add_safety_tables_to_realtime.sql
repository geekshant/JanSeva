-- ============================================================================
-- Add safety_alerts and safety_incidents to the Supabase Realtime publication
-- ============================================================================
-- The safety tables (safety_alerts, safety_incidents) were created by the
-- add_women_safety_feature migration (20260928101720), which ran AFTER the
-- enable_realtime_all_tables migration (20260924212417). As a result, these
-- tables were never added to the supabase_realtime publication, so no
-- postgres_changes events were sent to the admin dashboard when a new SOS
-- was created. The buzzer never rang because the realtime callback never fired.
--
-- This migration adds both tables to the publication so INSERT/UPDATE/DELETE
-- events are broadcast to subscribed clients (the admin dashboard).
-- ============================================================================

alter publication supabase_realtime add table public.safety_alerts;
alter publication supabase_realtime add table public.safety_incidents;
