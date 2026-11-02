# JanMitra — AI Model Evaluation Plan

> **Document version:** 1.0  
> **Generated:** 2026-09-30  
> **Note:** The AI validation edge function (`ai-evidence-verification`) is **NOT in
> the repository** — it's deployed separately on the live project. This document
> defines the measurable evaluation framework that SHOULD be applied to it. Never
> claim "maximum accuracy" as guaranteed.

---

## 1. Objective
Define a measurable, repeatable evaluation framework for the AI complaint/evidence
validation model, covering category-image consistency, evidence quality, duplicate
detection, and human-review routing accuracy.

## 2. Dataset Requirements

### 2.1 Category Coverage
All 10 seeded categories must be represented:
Damaged Public Infrastructure, Garbage/Sanitation, Other, Pothole, Public Safety, Road Damage, Stray Animals, Streetlight, Unauthorized Construction, Water/Drainage.

### 2.2 Example Types
| Type | Description | Count target |
|------|-------------|--------------|
| Positive (true match) | Image clearly depicts the category issue | ≥100/category |
| Negative (true mismatch) | Image unrelated to category | ≥50/category |
| Difficult (ambiguous) | Partially relevant, poor lighting, unusual angle | ≥30/category |
| Real-world | Actual citizen submissions (with consent/anonymized) | ongoing |
| Edge cases | occlusion, multiple issues, stock images, screenshots | ≥20/category |

### 2.3 Variations
- Lighting: day, night, overcast, harsh glare.
- Angles: straight, side, top, distant.
- Occlusion: partial view, objects blocking.
- Image quality: sharp, blurry, low-res, high-res.
- Manipulation: watermarks, edited, AI-generated (if supported).

## 3. Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Precision | TP / (TP + FP) — of PASS decisions, how many correct | ≥0.85 |
| Recall | TP / (TP + FN) — of true matches, how many caught | ≥0.80 |
| F1 score | harmonic mean of precision/recall | ≥0.82 |
| False positive rate | FP / (FP + TN) — bad reports auto-passed | ≤0.10 |
| False negative rate | FN / (FN + TP) — good reports failed | ≤0.15 |
| Review routing accuracy | of REVIEW decisions, % correctly routed to human | ≥0.90 |
| Latency | avg/p95 processing time | p95 < 10s |
| Throughput | complaints/min | ≥60 |

## 4. Confidence Thresholds
- `category_match` HIGH/MEDIUM/LOW/NONE.
- `review_threshold` per category (LOW/MEDIUM/HIGH) — configurable via `category_ai_config`.
- Below review_threshold → route to human (AI_REVIEW_REQUIRED).
- AI must NEVER auto-reject; FAIL → EVIDENCE_REQUIRED (request more, not reject).

## 5. Human Review Thresholds
- Any AI decision with confidence below threshold → human review.
- AI error/timeout → human review (never silent reject).
- Officer override rate tracked (high override rate → model re-evaluation).

## 6. Model Failure Handling
- Edge function error → `complaint_ai_verification.status = error` → stuck → `retry_stuck_ai_jobs()` (pg_cron every 2 min, max 10/run, attempt_count tracked).
- After max retries → remains in error → surfaces in AI Review Queue for manual handling.
- **Failure is NEVER rejection.**

## 7. Monitoring (Production)
- `get_ai_processing_stats()`: queued, processing, completed_today, failed, avg_processing_ms, p95_processing_ms.
- `get_ai_analytics`: total_analyzed, ai_verified, ai_failed, ai_review_required, ai_evidence_required, ai_success_rate, ai_analysis_pending, ai_analysis_error.
- Officer override rate (review_decision vs ai_decision).
- Alert on: error rate spike, latency spike, queue backlog, success rate drop.

## 8. Re-evaluation Triggers
- Monthly scheduled re-evaluation on held-out test set.
- On model version change.
- On category_ai_config change.
- On override rate exceeding threshold (>20% override → investigate).

## 9. Evaluation Procedure
1. Freeze a held-out test set (labeled by humans, not used in training).
2. Run model on test set; collect decisions + confidences.
3. Compute precision/recall/F1/FPR/FNR per category + overall.
4. Review misclassifications; categorize root causes.
5. Compare to previous version; require no regression before promotion.
6. Document results; sign off before deploy.

## 10. Accuracy Improvement
- Augment training data for weak categories.
- Tune per-category `review_threshold`.
- Improve `category_hints`.
- Address lighting/angle/occlusion gaps with augmentation.
- Human-in-the-loop: officer overrides feed back as labels.

## 11. Disclaimer
The AI **cannot guarantee truth or 100% accuracy**. It is a triage aid. All
consequential decisions (verification, rejection) are ultimately human. "Maximum
accuracy" is not a guaranteed outcome; it is a continuously-improved target measured
by this framework.
