# JanMitra — Evidence Management Specification

> **Document version:** 1.0  
> **Generated:** 2026-09-30

---

## 1. Evidence Types

| Type | Table | Bucket | Uploaded by | When |
|------|-------|--------|-------------|------|
| Original complaint evidence | `complaint_images` | `complaint_images` (private) | Citizen | At complaint creation (round 1) |
| Additional evidence | `complaint_images` | `complaint_images` | Citizen | When EVIDENCE_REQUIRED/AI_FAILED (round 2+) |
| Resolution evidence | `resolution_evidence` | `complaint_images` | Officer/Admin | At resolution submission |

## 2. Storage

- **Bucket `complaint_images`** (private, `public=false`): signed-URL access only.
  - `allowed_mime_types`: image/jpeg, image/png, image/webp.
  - `file_size_limit`: 10 MB.
  - Path convention: `<auth_uid>/<timestamp>_<random>.<ext>`.
  - RLS: owner can read/upload/delete own; admin can read/delete all.
- **Bucket `avatars`** (public, `public=true`): profile photos.
  - `file_size_limit`: 5 MB. Owner-scoped.

## 3. Upload Flow (Citizen)

1. `image_picker` (camera quality 70, max 1920×1080; or gallery).
2. Validate: extension jpg/jpeg/png/webp; size ≤10MB; count ≤5.
3. Upload to `complaint_images` bucket via `storage_repository.uploadImage`.
4. Per-photo lifecycle: `pending` → `uploading` → `uploaded` / `failed` / `rejected`.
5. Auto-upload on add; retry on failure; delete removes storage object.
6. On submit, `image_urls[]` + `image_paths[]` passed to `create_complaint`/`join_similar_complaint`/`add_evidence_to_complaint`.

## 4. "More Evidence Needed" Flow

1. Officer requests evidence → `evidence_request_message` set on complaint + status EVIDENCE_REQUIRED.
2. Citizen sees AI status banner on complaint detail with "Upload New Photos".
3. Citizen picks multi-image → uploads → `add_evidence_to_complaint` RPC (ownership enforced server-side; arrays validated equal length).
4. Images appended as a **new round** (round 2+); status re-queues to AI_CHECKING.
5. Evidence gallery shows round 1 (original) vs rounds 2+ (additional) separately.

## 5. Evidence Metadata

| Field | Source |
|-------|--------|
| `id` | gen_random_uuid |
| `complaint_id` | FK |
| `storage_path` | bucket path |
| `image_url` | signed URL (3600s expiry, per-path failure tolerated) |
| `created_at` | now() |
| (resolution_evidence) `uploaded_by` | auth uid |
| (resolution_evidence) `caption` | officer caption |

> **Note:** Evidence does NOT currently store per-image EXIF/timestamp/caption for
> citizen evidence (only resolution evidence has `caption`). This is a gap — see
> `40_GAP_ANALYSIS.md`.

## 6. Evidence Validation

- Client-side: type + size + count validation.
- Server-side: ownership enforced in `add_evidence_to_complaint`; RLS enforces owner-only on `complaint_images` INSERT.
- AI validation: images passed to `ai-evidence-verification` edge function for category/title/description consistency.

## 7. Evidence Review (Admin)

- Admin complaint detail → **EvidenceGallery** (signed URLs) shows original + additional rounds.
- **ResolutionEvidencePanel** shows before/after with upload.
- **AiVerificationPanel** shows AI-analyzed evidence images.

## 8. Evidence History

- `complaint_images` ordered by `created_at` → rounds inferred by upload time.
- `resolution_evidence` separate table for resolution proof.
- `complaint_status_history` records evidence-request events.

## 9. Deletion Rules

- Citizen can delete a complaint (and its images) only in pre-verification statuses; storage objects deleted first, then row (FK CASCADE).
- Admin bulk delete via `bulk_delete_complaints` RPC (requires reason).
- Admin can delete complaint images (storage policy `is_admin()`).
- Avatar delete removes orphan on profile update.

## 10. Permissions

| Actor | Read | Upload | Delete |
|-------|------|--------|--------|
| Owner citizen | own (signed URL) | own | own (pre-verify) |
| Other citizen | nearby (privacy-safe projection only — no raw images) | — | — |
| Officer/Admin | all (signed URL via admin) | resolution_evidence | all |
| AI/System | via service_role | — | — |

## 11. File Size / Type Validation

- Max 5 photos per complaint (`maxComplaintPhotos=5`).
- Min 3 photos (plus category AI config min if higher).
- jpg/jpeg/png/webp only; ≤10MB each.

## 12. Duplicate Detection

- `find_similar_complaints` (pg_trgm title similarity + PostGIS distance) detects *similar complaints*, not duplicate images.
- Per-image duplicate/stock detection is **[S]** (specified in AI spec; not confirmed in repo).

## 13. Audit Trail

- `complaint_images` rows are append-only (no UPDATE policy; DELETE by owner/admin only).
- `resolution_evidence` INSERT by authenticated; DELETE by admin (`is_admin()`).
- Status history records evidence-request transitions.
- `officer_review_complaint` writes `audit_logs` for evidence-related decisions.
