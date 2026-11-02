-- ===========================================================================
-- 13_enrich_dashboard_complaints_ai.sql
--
-- Enrich the `get_dashboard_complaints` RPC with full AI analysis data.
-- Previously only returned ai_decision, ai_reason, ai_category_match,
-- ai_evidence_quality. Now also returns:
--   ai_status          (pending/completed) — distinguishes "not analyzed" from "analyzing"
--   ai_image_count     (images analyzed)
--   ai_detected_category
--   ai_selected_category
--   ai_description_match
--   review_decision    (human override: VERIFIED/REJECTED/EVIDENCE_REQUIRED)
-- ===========================================================================

DROP FUNCTION IF EXISTS public.get_dashboard_complaints(text, text, uuid, uuid, text, timestamptz, timestamptz, integer);

CREATE OR REPLACE FUNCTION public.get_dashboard_complaints(
  p_status text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_department_id uuid DEFAULT NULL,
  p_ward text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 500
) RETURNS SETOF json
LANGUAGE sql
STABLE
AS $$
  SELECT
    json_build_object(
      'id', c.id,
      'complaint_number', c.complaint_number,
      'title', c.title,
      'status', c.status,
      'severity', c.severity,
      'lat', CASE WHEN c.location IS NOT NULL THEN ST_Y(c.location::geometry) ELSE NULL END,
      'lng', CASE WHEN c.location IS NOT NULL THEN ST_X(c.location::geometry) ELSE NULL END,
      'has_location', c.location IS NOT NULL,
      'category_id', c.category_id,
      'category_name', cat.name,
      'assigned_department_id', c.assigned_department_id,
      'ward', c.ward,
      'created_at', c.created_at,
      'sla_deadline', c.sla_deadline,
      'address', c.address,
      'ai_decision', v.ai_decision::text,
      'ai_status', v.status,
      'ai_reason', v.reason,
      'ai_category_match', v.category_match,
      'ai_evidence_quality', v.evidence_quality,
      'ai_image_count', v.image_count,
      'ai_detected_category', v.detected_category,
      'ai_selected_category', v.selected_category,
      'ai_description_match', v.description_match,
      'review_decision', v.review_decision
    )
  FROM public.complaints c
  LEFT JOIN public.categories cat ON cat.id = c.category_id
  LEFT JOIN LATERAL (
    SELECT * FROM public.complaint_ai_verification av
    WHERE av.complaint_id = c.id
    ORDER BY av.created_at DESC
    LIMIT 1
  ) v ON true
  WHERE
    (p_status IS NULL OR c.status::text = p_status)
    AND (p_severity IS NULL OR c.severity::text = p_severity)
    AND (p_category_id IS NULL OR c.category_id = p_category_id)
    AND (p_department_id IS NULL OR c.assigned_department_id = p_department_id)
    AND (p_ward IS NULL OR c.ward = p_ward)
    AND (p_date_from IS NULL OR c.created_at >= p_date_from)
    AND (p_date_to IS NULL OR c.created_at <= p_date_to)
  ORDER BY c.created_at DESC
  LIMIT p_limit;
$$;
