# Story 7.3: Offline Write Queue & Auto-Sync on Reconnection

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a hotel staff member,
I want any changes I make while offline to be queued locally and automatically synced when the internet reconnects,
So that I never lose data during a WiFi drop and don't have to redo my work.

## Acceptance Criteria

1. **Given** a staff member is offline and submits a write action (room status update, attendance log, stock movement)
   **When** the Service Worker intercepts the request
   **Then** the action is stored in `offlineQueue.ts` (IndexedDB) as a `QueueItem` with: `id` (UUID), `action`, `payload`, `timestamp` (ISO 8601), `retries: 0` (FR52)
   **And** the UI shows an optimistic update — the change appears locally as if it succeeded

2. **Given** the device reconnects to the internet
   **When** the Service Worker detects the reconnection
   **Then** all queued `QueueItem` entries are flushed to `api/sync/+server.ts` in timestamp order — oldest first (FR52)
   **And** the `LiveStatusIndicator` transitions to "Live · Updated just now"

3. **Given** a queued item fails to sync after 3 retries
   **When** the retry limit is reached
   **Then** the user sees a persistent red Toast: "Sync failed for [action] — tap to retry" with a manual retry action (NFR-R2)

4. **Given** concurrent offline writes from multiple staff are synced simultaneously
   **When** `api/sync/+server.ts` processes the queue
   **Then** server-side timestamp-based conflict resolution is applied — no silent data loss (NFR-R4, FR54)

## Tasks / Subtasks

- [ ] Task 1: Implement IndexedDB offline queue utility (AC: #1, #3)
  - [ ] 1.1 Replace placeholder `manage-smeraldo-hotel/src/lib/utils/offlineQueue.ts` with typed queue API and `QueueItem` model
  - [ ] 1.2 Add enqueue/read/remove/update-retry helpers (preserve FIFO ordering by `timestamp`)
  - [ ] 1.3 Enforce max retry count (3) metadata support without deleting failed items automatically
  - [ ] 1.4 Add unit tests for queue operations and ordering

- [ ] Task 2: Add sync flush API endpoint (AC: #2, #4)
  - [ ] 2.1 Create `manage-smeraldo-hotel/src/routes/api/sync/+server.ts` returning `{ data, error }` envelope
  - [ ] 2.2 Validate incoming queued operations with Zod / typed action schema (room status, attendance, inventory movement)
  - [ ] 2.3 Process queue items in timestamp order and return per-item sync results
  - [ ] 2.4 Implement conflict handling/result signaling (timestamp-aware, no silent overwrite)
  - [ ] 2.5 Add server tests for success/failure/conflict paths

- [ ] Task 3: Wire client offline write capture + optimistic UI hooks (AC: #1)
  - [ ] 3.1 Identify current write entry points using Form Actions (`?/overrideStatus`, attendance submit, stock in/out) and define a minimal interception strategy
  - [ ] 3.2 Queue writes when browser offline instead of hard-failing requests
  - [ ] 3.3 Apply optimistic UI updates for supported offline actions (room status, attendance, inventory counts/movements as feasible)
  - [ ] 3.4 Keep server/client boundary strict (no `$lib/server/*` imports in `.svelte`)

- [ ] Task 4: Auto-sync on reconnection + status integration (AC: #2)
  - [ ] 4.1 Trigger queue flush on `online` event from root `src/routes/+layout.svelte` (or shared client sync coordinator)
  - [ ] 4.2 Update `offlineQueueCountStore` to reflect actual queue length in real time
  - [ ] 4.3 Ensure `LiveStatusIndicator` shows queued count while offline and returns to live state after successful flush
  - [ ] 4.4 Prevent duplicate concurrent flushes (single in-flight sync guard)

- [ ] Task 5: Sync failure UX (AC: #3)
  - [ ] 5.1 Add persistent error toast/banner pattern for failed queue items after 3 retries
  - [ ] 5.2 Provide manual retry action that re-attempts failed item(s) without page reload
  - [ ] 5.3 Use Vietnamese UI copy consistent with existing app style

- [ ] Task 6: Service Worker / Workbox integration for offline writes (AC: #1, #2)
  - [ ] 6.1 Extend PWA/Workbox configuration in `manage-smeraldo-hotel/vite.config.ts` for offline write queue flow
  - [ ] 6.2 Ensure write requests needed for queueing/sync are not blocked by current caching rules
  - [ ] 6.3 Verify production preview behavior (dev SW caveats still apply)

- [ ] Task 7: Verification & tests (AC: #1, #2, #3, #4)
  - [ ] 7.1 Offline test: perform room/attendance/inventory writes while offline and confirm queue entries created
  - [ ] 7.2 Reconnect test: confirm FIFO flush to `api/sync/+server.ts` and UI state recovery
  - [ ] 7.3 Failure test: simulate repeated sync failure → persistent toast + manual retry
  - [ ] 7.4 Run `npm run check`, `npm run lint`, `npm run test:unit`, `npm run build`

- [ ] Task 8: Update sprint tracking
  - [ ] 8.1 Set `7-3-offline-write-queue-auto-sync-on-reconnection` to `in-progress` when development starts, then `review`/`done` per workflow

## Dev Notes

### Existing Implementation Context

- Story 7.2 already implemented offline-read behavior and immediate browser online/offline detection via `src/routes/+layout.svelte` + `src/lib/stores/realtimeStatus.ts`.
- `LiveStatusIndicator.svelte` already renders offline queue text using `offlineQueueCountStore`; Story 7.3 should replace the placeholder count with real queue length.
- `src/lib/utils/offlineQueue.ts` currently exists as a placeholder and is explicitly reserved for this story.
- Current architecture guidance says offline queue item shape is `{ id, action, payload, timestamp, retries }` and `api/sync/+server.ts` must process queued operations idempotently.
- Form Actions are the primary mutation path; architecture notes recommend `+server.ts` for offline sync queue flush.

### Architecture & Guardrails (MUST FOLLOW)

- Keep server/client boundary strict: no imports from `$lib/server/*` inside `.svelte` files.
- Use Svelte stores for shared status/queue state (`realtimeStatusStore`, `offlineQueueCountStore`).
- All `+server.ts` endpoints must return `{ data, error }` envelope; never expose raw errors.
- Max retry count is 3 before surfacing persistent failure UI (NFR-R2).
- `api/sync/+server.ts` processing must be idempotent and conflict-aware (NFR-R4, FR54).
- Follow existing Vietnamese UI copy style and existing layout/component patterns.
- Validate behavior in production preview mode for service worker-related flows.

### Suggested File Targets

| File | Action | Purpose |
|---|---|---|
| `manage-smeraldo-hotel/src/lib/utils/offlineQueue.ts` | MODIFY | IndexedDB queue implementation for offline writes |
| `manage-smeraldo-hotel/src/lib/utils/offlineQueue.test.ts` | CREATE | Unit tests for queue FIFO/retry behavior |
| `manage-smeraldo-hotel/src/routes/api/sync/+server.ts` | CREATE | Queue flush endpoint for reconnection sync |
| `manage-smeraldo-hotel/src/routes/+layout.svelte` | MODIFY | Trigger auto-flush on reconnect / sync coordinator hook |
| `manage-smeraldo-hotel/src/lib/stores/realtimeStatus.ts` | MODIFY | Replace placeholder queue count updates with real queue count integration |
| `manage-smeraldo-hotel/src/lib/components/layout/LiveStatusIndicator.svelte` | MODIFY? | Only if additional sync/failure state text is needed |
| `manage-smeraldo-hotel/src/routes/(reception)/rooms/+page.svelte` | MODIFY | Offline room write queue + optimistic update hook |
| `manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.svelte` | MODIFY | Offline attendance queue + optimistic update hook |
| `manage-smeraldo-hotel/src/routes/(reception)/inventory/+page.svelte` | MODIFY | Offline inventory queue + optimistic update hook |
| `manage-smeraldo-hotel/vite.config.ts` | MODIFY | Workbox/service worker support for offline write queue flow |

### Out of Scope

- Push notifications / VAPID subscriptions / delivery (Story 7.4)
- Locale/currency production reliability and backup/PM2 tasks (Story 7.5)
- Reworking offline-read caching UX from Story 7.2 except as needed to support queue syncing

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 7, Story 7.3]
- [Source: `_bmad-output/project-context.md` — offline queue structure, API envelope, PWA/offline rules]
- [Source: `manage-smeraldo-hotel/src/lib/utils/offlineQueue.ts` — placeholder for Story 7.3]
- [Source: `manage-smeraldo-hotel/src/lib/stores/realtimeStatus.ts` — queue count store placeholder]
- [Source: `manage-smeraldo-hotel/src/routes/+layout.svelte` — browser online/offline lifecycle integration]

## Dev Agent Record

### Agent Model Used

Amp (GPT-5)

### Debug Log References

- (to be filled during implementation)

### Completion Notes List

- (to be filled during implementation)

### File List

**Created:**
- `_bmad-output/implementation-artifacts/7-3-offline-write-queue-auto-sync-on-reconnection.md`

**Modified:**
- (to be filled during implementation)
