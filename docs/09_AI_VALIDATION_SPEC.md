# JanMitra — AI Complaint & Evidence Validation Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30

> **Implementation status:** The AI system is **specified but not confirmed fully
> implemented in the repository.** The mobile app fires an `ai-evidence-verification`
> edge function (fire-and-forget) after complaint creation, but that edge function
> is **NOT present** in `supabase/functions/` (only `send-push-notifications` is).
> The `complaint_ai_verification` table and `ai_decision` enum are **referenced** in
> migrations `12`–`14` but **never `CREATE`d** in version-controlled SQL. They
> almost certainly exist on the live Supabase project (the admin frontend reads
> them via `get_complaints_for_ai_review`, `get_ai_verification`, etc.). This
> document describes the **intended and referenced** design; wherever the repo
> cannot confirm an implementation detail, it is labeled **[S]**.

---

## 1. Purpose

Provide an AI-assisted, human-in-the-loop evidence validation layer that checks
whether uploaded images are consistent with the complaint's category, title, and
description, flags low-quality/duplicate/stock/manipulated images, and routes
uncertain cases to human review. The AI **never** makes a final rejection on its
own.

## 2. Inputs Evaluated

- Complaint category (`categories` + `category_ai_config` hints)
- Complaint title
- Complaint description
- Uploaded images (`complaint_images`)
- Location/context (where available)

## 3. Categories Covered

Per seed data (`05_seed_data.sql`): Damaged Public Infrastructure, Garbage/Sanitation, Other, Pothole, Public Safety, Road Damage, Stray Animals, Streetlight, Unauthorized Construction, Water/Drainage.

## 4. AI Evaluation Dimensions

| Dimension | Description |
|-----------|-------------|
| Evidence relevance | Does the image relate to the category? |
| Evidence quality | Is the image clear, well-lit, not blurry? |
| Category-image consistency | Does the image visually match expected characteristics of the category? |
| Duplicate image detection | Is the image reused/stock/already seen? |
| Potentially unrelated image | Image doesn't match the described issue |
| Low-quality image | Too dark/blurry/distant |
| Suspected stock/reused image | Matches known stock patterns [S] |
| Manipulation indicators | Edits/watermarks [S, if technically supported] |
| Description match | Does description align with image content? |

## 5. Outputs

| Output | Description |
|--------|-------------|
| `ai_decision` | `PASS` / `REVIEW` / `FAIL` (enum `ai_decision` [S]) |
| Confidence / category_match | `HIGH` / `MEDIUM` / `LOW` / `NONE` |
| evidence_quality | qualitative |
| image_count / detected_category / selected_category | metadata |
| reason | human-readable explanation |
| `status` | `pending` / `analyzing` / `completed` / `error` |

## 6. AI Recommendation → Status Mapping

| AI decision | Complaint status | Routing |
|-------------|-----------------|---------|
| PASS | AI_VERIFIED → VERIFIED | auto-advance (+100 pts) |
| REVIEW | AI_REVIEW_REQUIRED | AI Review Queue (human) |
| FAIL | AI_FAILED → EVIDENCE_REQUIRED | ask citizen for more evidence |
| error/timeout | (stuck) | `retry_stuck_ai_jobs()` via pg_cron every 2 min |

## 7. Human-in-the-Loop Workflow

1. AI writes `complaint_ai_verification` row.
2. If REVIEW/FAIL → complaint appears in admin **AI Review Queue** (`get_complaints_for_ai_review`).
3. Officer opens complaint detail → **AI Verification Panel** shows AI metrics + evidence images.
4. Officer chooses:
   - **Verify** (→ VERIFIED) with structured reason: `evidence_match`, `ai_support`, `sufficient_evidence`, `details_consistent`, `other`.
   - **Reject** (→ REJECTED) with structured reason: `evidence_mismatch`, `category_mismatch`, `insufficient_evidence`, `duplicate`, `other`.
   - **Request Evidence** (→ EVIDENCE_REQUIRED) with structured reason: `image_quality`, `missing_angles`, `not_visible`, `additional_required`, `other`.
5. `officer_review_complaint` RPC updates AI table + complaint status + `audit_logs` + notifications.

## 8. Failure Handling — AI Failure Is NEVER Silent Rejection

- AI edge function error → `complaint_ai_verification.status = error` → complaint stays in AI_CHECKING/AI_REVIEW_REQUIRED, **never** auto-rejected.
- Stuck jobs (pending >2min, analyzing >5min, error with attempts<3) are retried by `retry_stuck_ai_jobs()` (pg_cron `*/2 * * * *`), which re-invokes the edge function via `net.http_post`.
- Max 10 retries per run; `attempt_count` tracked; `last_error` stored.
- After max retries, the job remains in error state and surfaces in the AI Review Queue for manual handling.

## 9. False Positive / False Negative Handling

- **False positive** (AI PASS on a bad report): caught by community verification of resolution, or admin reopen.
- **False negative** (AI FAIL on a valid report): citizen can add more evidence (`add_evidence_to_complaint`) → re-queue AI; officer can override to VERIFIED.
- All overrides are audited.

## 10. Per-Category AI Configuration [S]

`category_ai_config` table (read by mobile `categoriesWithAiConfigProvider`, edited by admin `/settings/ai-verification`):
- `requires_images`, `min_images`, `max_images`, `requires_different_angles`
- `ai_enabled`, `auto_pass`, `auto_fail`
- `review_threshold` (`LOW`/`MEDIUM`/`HIGH`)
- `category_hints` (free text)

## 11. Audit Trail

- AI results stored in `complaint_ai_verification` (full analysis).
- Human overrides stored in `review_decision`, `reviewed_by`, `reviewed_at`, `review_reason`, `review_reason_type`.
- `officer_review_complaint` writes `audit_logs` (action `OFFICER_REVIEW`, entity_type `complaint`, after JSON).

## 12. Analytics

`get_ai_analytics` RPC [S]: total_analyzed, ai_verified, ai_failed, ai_review_required, ai_evidence_required, ai_success_rate, ai_analysis_pending, ai_analysis_error. `get_ai_processing_stats()`: queued, processing, completed_today, failed, avg_processing_ms, p95_processing_ms.

## 13. Accuracy Disclaimer

The AI **cannot guarantee truth or 100% accuracy**. It is a triage aid. All
consequential decisions (verification, rejection) are ultimately human. See
`37_AI_EVALUATION_PLAN.md` for the measurable evaluation framework.
