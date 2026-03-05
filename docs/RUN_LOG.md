# Run Log

## 2026-03-05 09:06 KST — Agent Chat cycle
- Delta: Added credential provider discovery API wiring to support OAuth/provider CRUD flows in UI forms.
  - Extended `CredentialRepository` with `list_providers(owner_agent_id?)` and SQL distinct/sorted implementation.
  - Added `CredentialService.list_providers(...)` pass-through for DI-safe access.
  - Added new endpoint `GET /credentials/providers` with optional `owner_agent_id` filter.
  - Added service test coverage for distinct/sorted provider results and owner-scoped filtering.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (15 passed)
- Commit: `dd0987b` (pushed to `main`)
- Next action: wire frontend credential create/edit forms to consume `/credentials/providers` for provider dropdown/autocomplete and reduce manual provider key entry errors.

## 2026-03-05 08:42 KST — Agent Chat cycle
- Delta: Added root-thread summary count wiring so unread reconciliation can use count-based logic for root messages too.
  - Backend `GET /channels/{channel_id}/threads` now returns a root summary row (`thread_id: null`) with root message count.
  - Updated thread summary schema to allow nullable `thread_id`.
  - Extended message service test double + assertions to include root summary output.
  - Frontend now reads root summary count, shows it in Root messages label, filters child thread list, and applies count reconciliation uniformly across root + child threads.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (14 passed)
- Commit: `98b2149` (pushed to `main`)
- Next action: tighten websocket unread precision by incrementing local seen/unseen counts from incoming events (without full thread reload) and add a focused frontend test for root badge state transitions.

## 2026-03-05 08:04 KST — Agent Chat cycle
- Delta: Reduced false positives in chat thread unread UX by persisting per-thread seen message counts and reconciling against thread summary `message_count` on reload.
  - Added versioned thread-seen localStorage payload (`lastSeenByThread` + `lastSeenCountByThread`) with backward compatibility for legacy marker-only data.
  - `loadMessages` now records seen count (`payload.length`) for the active thread when a thread is visited.
  - Added reconciliation effect that marks a thread as `• new` only when `message_count > lastSeenCount` and thread is not currently selected.
  - Keeps root-thread websocket indicator behavior intact while preventing stale `• new` badges after reconnect/reload.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (14 passed)
- Commit: pending
- Next action: extend unread precision to root-thread summary by exposing root message count from backend thread summary API and feeding it into the same count-based reconciliation.

## 2026-03-05 07:40 KST — Agent Chat cycle
- Delta: Added thread-level unread/new-message indicator UX in `frontend/src/main.tsx`.
  - Added per-channel thread state persistence via `localStorage` (`agent-chat:last-seen:{channelId}`).
  - Tracks `lastSeenByThread` in UI state and marks threads as seen on selection and message list load.
  - Tracks unseen websocket activity per thread (`unseenThreadKeys`) and clears indicators when viewed.
  - Added visible `• new` badges for root and child thread buttons in **Chat Thread Explorer**.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (14 passed)
- Commit: `0292e23` (pushed to `main`)
- Next action: strengthen unread precision by persisting per-thread last-seen timestamp/message marker and comparing against thread summary `message_count` deltas on reload (avoid false positives after reconnect).

## 2026-03-05 06:40 KST — Agent Chat cycle
- Delta: Added message timestamp support end-to-end for chat thread UX.
  - Backend: added `Message.created_at` ORM mapping with DB default and exposed `created_at` in `MessageRead` API schema.
  - Backend: made channel/thread message listing deterministic with `ORDER BY created_at, id`.
  - Frontend: updated chat message model and rendered localized per-message timestamps in **Chat Thread Explorer**.
  - Tests: added `backend/tests/test_message_schema.py` to verify `MessageRead.from_entity` includes `created_at`.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (12 passed)
- Commit: `3493e4e` (pushed to `main`)
- Next action: implement thread-level unread/new-message indicator badge logic (persist last-seen per thread in UI state and highlight threads with unseen websocket events).

## 2026-03-05 06:00 KST — Agent Chat cycle
- Delta: Improved chat thread UX by wiring an in-UI message composer in `frontend/src/main.tsx`.
  - Added sender/message compose controls directly in **Chat Thread Explorer**.
  - Added `submitMessage` flow posting to `POST /messages` with root/thread-aware `thread_id` handling.
  - Added client-side message id generation via `crypto.randomUUID()` fallback.
  - On successful send, clears composer body and refreshes thread + message lists for immediate feedback.
  - Added validation/loading/error handling for compose submission.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (11 passed)
- Commit: `88fa1d8` (pushed to `main`)
- Next action: add thread-level unread/new-message indicator and message timestamp support to make thread triage faster.

## 2026-03-05 05:40 KST — Agent Chat cycle
- Delta: Enriched credential audit trail rendering with metadata chips in `frontend/src/main.tsx`.
  - Added audit metadata parsing helpers for structured event details.
  - `credential.updated` now displays changed field chips (`changed:label`, `changed:token_expires_at`, etc.).
  - `credential.rotated` now displays key version transition chip (`key:v1→v2`).
  - Kept rendering resilient when metadata is absent or malformed.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (11 passed)
- Commit: `937e26e` (pushed to `main`)
- Next action: add RBAC/audit UX hardening by surfacing actor/context metadata and supporting server-side time-range filter for investigation workflows.

## 2026-03-05 05:02 KST — Agent Chat cycle
- Delta: Improved credential audit trail UX with investigation filters in `frontend/src/main.tsx`.
  - Added provider filter to scope credential dropdown by provider.
  - Added action filter wired to backend `event_type` query (`credential.updated` / `credential.rotated` / `credential.deleted`).
  - Updated audit fetch + auto-refresh effects to include selected action filter.
  - Added filtered credential selection fallback to keep audit panel stable when filters change.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (11 passed)
- Commit: `0f0024a` (pushed to `main`)
- Next action: enrich audit event rendering with key metadata diffs (changed fields/key version) and add quick chips in UI.

## 2026-03-05 01:42 KST — Agent Chat cycle
- Delta: Added frontend real-time chat thread wiring via channel WebSocket (`/api/v1/ws/channels/{channel_id}`) in `frontend/src/main.tsx`.
  - Added LIVE/OFFLINE connection badge.
  - Appends incoming message to currently selected thread view without full reload.
  - Refreshes thread summary counts when new messages arrive.
  - Refactored message/thread loaders into reusable callbacks.
- Quality gates:
  - `black backend` ✅ (no changes needed)
  - `pytest` ✅ (8 passed)
  - `pre-commit run --all-files` ❌ blocker: missing `.pre-commit-config.yaml` at repo root.
- Commit: none (quality gate policy prevents commit/push while pre-commit gate fails)
- Next action: add a baseline `.pre-commit-config.yaml` (black + basic hygiene hooks), install hooks, rerun gate trio, then commit this websocket UX increment.

## 2026-03-05 02:01 KST — Agent Chat cycle
- Delta: Unblocked quality gate by adding baseline pre-commit configuration at repo root (`.pre-commit-config.yaml`) and applying hook-driven hygiene fix in `.gitignore`.
  - Hooks enabled: `check-yaml`, `end-of-file-fixer`, `trailing-whitespace`, `check-merge-conflict`, `black` (Python 3.12, scoped to `backend/`).
  - This unlocks commit/push for the previously completed frontend WebSocket thread UX increment.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (8 passed)
- Next action: commit and push the WebSocket thread UI + pre-commit baseline, then move to OAuth/provider token lifecycle increment.

## 2026-03-05 02:40 KST — Agent Chat cycle
- Delta: Added provider token lifecycle filtering to credential listing API.
  - `GET /credentials` now supports `token_status` (`active` | `expired` | `expiring_soon`) and `expiring_within_hours` query params.
  - Implemented lifecycle filtering logic in `CredentialService` with timezone-safe expiry handling.
  - Added tests covering expired/expiring-soon/active credential selection.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (9 passed)
- Commit: `49fcea4` (pushed to `main`)
- Next action: expose token lifecycle badges/filters in frontend credentials view and add audit log event entries for credential rotate/update/delete.

## 2026-03-05 03:01 KST — Agent Chat cycle
- Delta: Wired credential token lifecycle UI in frontend control tower.
  - Added new **Credential Token Lifecycle** section in `frontend/src/main.tsx`.
  - Added status filter control (`all` | `active` | `expired` | `expiring_soon`) and configurable `expiring_within_hours` input.
  - Connected filter controls to backend `GET /credentials` query params.
  - Added per-credential lifecycle badge rendering (`active`, `expiring_soon`, `expired`) with color-coded status and expiry timestamp display.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (9 passed)
- Commit: pending
- Next action: add backend audit log event entries for credential update/delete/rotate actions and cover them with service-level tests.

## 2026-03-05 03:41 KST — Agent Chat cycle
- Delta: Added backend credential audit event wiring for token lifecycle operations.
  - Introduced `audit_service` with `AuditEvent` model, logger protocol, and DI-safe `NoOpAuditLogger`.
  - Wired `CredentialService` to emit structured audit events for `credential.updated`, `credential.rotated`, and `credential.deleted`.
  - Included changed-field metadata for update and key-version transition metadata for rotation.
  - Added service tests asserting audit emission and metadata correctness.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (10 passed)
- Commit: `e073018` (pushed to `main`)
- Next action: expose credential audit trail in API (`GET /audit-events` scoped to credential/entity) so frontend can display provider/token change history.

## 2026-03-05 04:42 KST — Agent Chat cycle
- Delta: Wired credential audit trail UX in frontend using existing audit API.
  - Added credential selector + manual refresh for audit history in `frontend/src/main.tsx`.
  - Added auto-load of latest 20 events from `GET /audit-events?entity_type=credential&entity_id=...`.
  - Rendered chronological audit event list (event type + timestamp) with loading/empty/error states.
- Quality gates:
  - `black backend` ✅
  - `pre-commit run --all-files` ✅
  - `pytest` ✅ (11 passed)
- Commit: pending
- Next action: add provider/label/action filters to audit trail endpoint/UI and include actor/context fields in event metadata for better investigation.
