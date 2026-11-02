-- ===========================================================================
-- 14_async_ai_job_tracking_and_retry.sql
--
-- Asynchronous AI job tracking + automatic retry for stuck AI jobs.
--
-- Problem: complaints created with AI_CHECKING status create a
-- complaint_ai_verification record with status='pending'. The mobile app
-- fire-and-forgets the ai-evidence-verification edge function. If the
-- edge function never runs (cold start failure, network error, crash),
-- the complaint is stuck at 'pending' forever.
--
-- Solution:
--   1. Add timing/attempt columns to track AI job lifecycle.
--   2. Create retry_stuck_ai_jobs() that finds stuck jobs and re-invokes
--      the edge function via pg_net.
--   3. Schedule it with pg_cron every 2 minutes.
--   4. get_ai_processing_stats() for dashboard monitoring.
--   5. Clean up the currently-stuck record.
--
-- NOTE: The pg_cron schedule must be created separately because the
-- migration tool cannot handle nested dollar-quoted strings. Run:
--   SELECT cron.schedule(
--     'retry-stuck-ai-jobs',
--     '*/2 * * * *',
--     $CRON$SELECT * FROM public.retry_stuck_ai_jobs();$CRON$
--   );
-- ===========================================================================

ALTER TABLE public.complaint_ai_verification
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

COMMENT ON COLUMN public.complaint_ai_verification.started_at IS 'When AI processing started (status -> analyzing).';
COMMENT ON COLUMN public.complaint_ai_verification.completed_at IS 'When AI processing completed successfully (status -> completed).';
COMMENT ON COLUMN public.complaint_ai_verification.failed_at IS 'When the latest AI attempt failed (status -> error).';
COMMENT ON COLUMN public.complaint_ai_verification.attempt_count IS 'Number of AI processing attempts (0 = never started, 1+ = retried).';
COMMENT ON COLUMN public.complaint_ai_verification.last_error IS 'Error message from the latest failed attempt.';

CREATE OR REPLACE FUNCTION public.retry_stuck_ai_jobs()
RETURNS TABLE(
  complaint_id uuid,
  complaint_number text,
  reason text,
  attempt int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, extensions
AS $$
DECLARE
  v_supabase_url text;
  v_anon_key text;
  v_rec record;
  v_now timestamptz := now();
BEGIN
  SELECT value INTO v_supabase_url FROM public.system_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_anon_key FROM public.system_config WHERE key = 'SUPABASE_ANON_KEY';
  IF v_supabase_url IS NULL OR v_anon_key IS NULL THEN
    RETURN;
  END IF;

  FOR v_rec IN
    SELECT
      v.id AS verification_id,
      v.complaint_id,
      v.status,
      v.attempt_count,
      v.started_at,
      c.complaint_number,
      c.status::text AS complaint_status
    FROM public.complaint_ai_verification v
    JOIN public.complaints c ON c.id = v.complaint_id
    WHERE v.status IN ('pending', 'analyzing', 'error')
      AND c.status::text IN ('AI_CHECKING', 'AI_REVIEW_REQUIRED', 'AI_FAILED', 'EVIDENCE_REQUIRED')
      AND (
        (v.status = 'pending' AND v.started_at IS NULL AND v.created_at < v_now - interval '2 minutes')
        OR (v.status = 'analyzing' AND v.started_at IS NOT NULL AND v.started_at < v_now - interval '5 minutes')
        OR (v.status = 'error' AND v.attempt_count < 3 AND v.failed_at IS NOT NULL AND v.failed_at < v_now - interval '30 seconds')
      )
    LIMIT 10
  LOOP
    UPDATE public.complaint_ai_verification
    SET status = 'analyzing',
        started_at = v_now,
        attempt_count = COALESCE(attempt_count, 0) + 1
    WHERE id = v_rec.verification_id;

    PERFORM net.http_post(
      url => v_supabase_url || '/functions/v1/ai-evidence-verification',
      headers => jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon_key
      ),
      body => jsonb_build_object('complaintId', v_rec.complaint_id)
    );

    complaint_id := v_rec.complaint_id;
    complaint_number := v_rec.complaint_number;
    reason := v_rec.status;
    attempt := COALESCE(v_rec.attempt_count, 0) + 1;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.retry_stuck_ai_jobs() IS
  'Finds stuck AI verification jobs and re-invokes the edge function via pg_net.';

CREATE OR REPLACE FUNCTION public.get_ai_processing_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'queued', (SELECT count(*) FROM public.complaint_ai_verification WHERE status = 'pending'),
    'processing', (SELECT count(*) FROM public.complaint_ai_verification WHERE status = 'analyzing'),
    'completed_today', (
      SELECT count(*) FROM public.complaint_ai_verification
      WHERE status = 'completed' AND completed_at >= date_trunc('day', now())
    ),
    'failed', (SELECT count(*) FROM public.complaint_ai_verification WHERE status = 'error'),
    'avg_processing_ms', (
      SELECT coalesce(avg(extract(epoch FROM (completed_at - started_at)) * 1000)::bigint, 0)
      FROM public.complaint_ai_verification
      WHERE status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL
    ),
    'p95_processing_ms', (
      SELECT coalesce(percentile_cont(0.95) WITHIN GROUP (
        ORDER BY extract(epoch FROM (completed_at - started_at)) * 1000
      )::bigint, 0)
      FROM public.complaint_ai_verification
      WHERE status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL
    )
  );
$$;

COMMENT ON FUNCTION public.get_ai_processing_stats() IS
  'Returns AI processing statistics for the dashboard.';

UPDATE public.complaint_ai_verification
SET status = 'completed',
    ai_decision = 'REVIEW'::public.ai_decision,
    reason = 'AI analysis not completed before human review. Manually verified by an officer/admin.',
    completed_at = now(),
    last_error = 'Edge function did not complete before manual verification.'
WHERE status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.complaints c
    WHERE c.id = complaint_ai_verification.complaint_id
      AND c.status::text IN ('VERIFIED', 'REJECTED', 'RESOLVED', 'CLOSED')
  );

-- Schedule the retry job (run this separately if not already scheduled)
-- SELECT cron.schedule(
--   'retry-stuck-ai-jobs',
--   '*/2 * * * *',
--   $CRON$SELECT * FROM public.retry_stuck_ai_jobs();$CRON$
-- );
