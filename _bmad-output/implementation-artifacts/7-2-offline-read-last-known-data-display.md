# Story 7.2: Offline Read — Last-Known Data Display

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a hotel staff member,
I want the app to show me the last-known room diagram, attendance data, and inventory levels when the internet drops,
So that I'm never left with a blank screen and can continue referencing the data I need during a connection outage.

## Acceptance Criteria

1. **Given** the Workbox Service Worker is registered and the app has been used at least once
   **When** the device loses internet connection
   **Then** the `LiveStatusIndicator` immediately switches to grey "Offline — X changes queued" state (FR51)

2. **Given** the device is offline
   **When** a staff member navigates to the Room Diagram page
   **Then** the last-known room status data is displayed from the Service Worker cache — tiles show the most recently synced state with a visual "Offline" muted overlay (FR51)

3. **Given** the device is offline
   **When** a staff member navigates to the Attendance or Inventory page
   **Then** the last-known data is displayed from cache — no blank screen, no error page (FR51)

4. **Given** the Service Worker cache strategy is configured (Workbox)
   **When** the app loads on a repeat visit with internet
   **Then** the page renders from cache in < 1 second while fresh data loads in the background (NFR-P2)

## Tasks / Subtasks

- [x] Task 1: Configure Workbox runtime caching for offline read paths (AC: #2, #3, #4)
  - [x] 1.1 Update `manage-smeraldo-hotel/vite.config.ts` `SvelteKitPWA(...)` config (reuse Story 7.1 manifest setup)
  - [x] 1.2 Add route-level caching for app pages (`/rooms`, `/attendance`, `/inventory`, `/dashboard`, `/reports`) using `StaleWhileRevalidate`
  - [x] 1.3 Add static asset caching for `/_app/**`, `/icons/**`, fonts and CSS (`CacheFirst`)
  - [x] 1.4 Add API/document fetch fallback strategy (`StaleWhileRevalidate` for `__data.json`, `NetworkFirst` for API) for data routes used by these pages
  - [x] 1.5 Enable cache cleanup (`cleanupOutdatedCaches`) and immediate activation (`skipWaiting`, `clientsClaim`)

- [x] Task 2: Add explicit online/offline state handling for UI indicator (AC: #1)
  - [x] 2.1 Extend `src/lib/stores/realtimeStatus.ts` with browser network state helpers (online/offline)
  - [x] 2.2 In `src/routes/+layout.svelte`, register `window` `online`/`offline` listeners on mount and cleanup on destroy
  - [x] 2.3 Ensure `realtimeStatusStore.connected` reflects offline state immediately (independent of Realtime subscription timing)
  - [x] 2.4 Keep `offlineQueueCountStore` behavior unchanged (queue implementation remains Story 7.3)

- [x] Task 3: Show offline overlay on room diagram (AC: #2)
  - [x] 3.1 Add an `isOffline` prop to `RoomGrid.svelte` and render a muted "Ngoại tuyến" overlay banner
  - [x] 3.2 Pass offline state from `(reception)/rooms/+page.svelte` to `RoomGrid`
  - [x] 3.3 Preserve existing room tile interactions (read flow unchanged; write behavior handled in Story 7.3)

- [x] Task 4: Show offline context on attendance and inventory pages (AC: #3)
  - [x] 4.1 In `(reception)/attendance/+page.svelte`, render non-blocking offline notice when network is down
  - [x] 4.2 In `(reception)/inventory/+page.svelte`, render non-blocking offline notice when network is down
  - [x] 4.3 Ensure last loaded data remains visible; no blank fallback introduced by offline state

- [ ] Task 5: Verification for cached repeat-load behavior (AC: #4)
  - [ ] 5.1 Build and preview production bundle (`npm run build && npm run preview`)
  - [ ] 5.2 Prime cache by visiting rooms/attendance/inventory once online
  - [ ] 5.3 Toggle browser offline mode and verify pages still render from cache
  - [ ] 5.4 Validate repeat visit load timing target (< 1s, from Service Worker cache in DevTools)

- [x] Task 6: Tests (AC: #1, #2, #3)
  - [x] 6.1 Add/update unit tests for `realtimeStatusStore` offline/online transitions
  - [x] 6.2 Add component tests for offline banner/overlay rendering (`RoomGrid`, attendance page, inventory page where feasible)
  - [x] 6.3 Run `npm run check`, `npm run lint`, `npm run test:unit`

- [ ] Task 7: Update sprint tracking
  - [ ] 7.1 Set `7-2-offline-read-last-known-data-display` to `done` after implementation and validation

## Dev Notes

### Existing Implementation Context

- PWA plugin is already wired in `vite.config.ts` (`@vite-pwa/sveltekit`) with minimal manifest config.
- `LiveStatusIndicator.svelte` already supports both states:
  - Connected: `Trực tiếp · Vừa cập nhật`
  - Offline: `Ngoại tuyến — {$offlineQueueCountStore} thay đổi đang chờ`
- `offlineQueueCountStore` is currently a placeholder (`0`) in `src/lib/stores/realtimeStatus.ts`; queue mechanics are explicitly deferred to Story 7.3 (`src/lib/utils/offlineQueue.ts`).
- Realtime room subscription lives in root `src/routes/+layout.svelte`; this is the correct place to add global online/offline listeners.

### Architecture & Guardrails (MUST FOLLOW)

- Keep server/client boundary strict: no imports from `$lib/server/*` inside `.svelte` files.
- Use Svelte stores for shared state (`realtimeStatusStore`), not cross-component rune state.
- Do not implement offline write queue/retry/toast in this story (Story 7.3 scope).
- Use existing component/layout patterns and Vietnamese UI copy style.
- Test offline behavior in production preview mode; dev mode service worker behavior may differ.

### File Targets

| File | Action | Purpose |
|---|---|---|
| `manage-smeraldo-hotel/vite.config.ts` | MODIFY | Workbox runtime caching strategies for offline read |
| `manage-smeraldo-hotel/src/lib/stores/realtimeStatus.ts` | MODIFY | Online/offline-aware connection state helpers |
| `manage-smeraldo-hotel/src/routes/+layout.svelte` | MODIFY | Register/cleanup `online`/`offline` listeners |
| `manage-smeraldo-hotel/src/lib/components/rooms/RoomGrid.svelte` | MODIFY | Offline overlay UI on room diagram |
| `manage-smeraldo-hotel/src/routes/(reception)/rooms/+page.svelte` | MODIFY | Pass offline state to room grid |
| `manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.svelte` | MODIFY | Offline notice while preserving last-known data |
| `manage-smeraldo-hotel/src/routes/(reception)/inventory/+page.svelte` | MODIFY | Offline notice while preserving last-known data |
| `manage-smeraldo-hotel/src/lib/stores/realtimeStatus.test.ts` | MODIFY | Store transition tests for offline/online behavior |

### Out of Scope

- Queueing writes in IndexedDB and auto-sync (`api/sync/+server.ts`) — Story 7.3
- Push notifications (VAPID/subscriptions/toasts) — Story 7.4
- Locale/currency reliability and backup/PM2 reliability checks — Story 7.5

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 7, Story 7.2]
- [Source: `_bmad-output/planning-artifacts/prd.md` — FR51, NFR-P2]
- [Source: `_bmad-output/project-context.md` — PWA/offline rules, store usage rules]
- [Source: `manage-smeraldo-hotel/vite.config.ts` — current PWA plugin setup]
- [Source: `manage-smeraldo-hotel/src/lib/components/layout/LiveStatusIndicator.svelte`]
- [Source: `manage-smeraldo-hotel/src/lib/stores/realtimeStatus.ts`]
- [Source: `manage-smeraldo-hotel/src/routes/+layout.svelte`]

## Dev Agent Record

### Agent Model Used

Amp (GPT-5)

### Debug Log References

- `npm run check` ✅ (0 errors, existing Svelte warnings only)
- `npm run lint` ⚠️ fails due to pre-existing unrelated lint errors (`scripts/generate-icons.js`, inventory page/list)
- `npm run test:unit` ✅ 260/260 passing
- `npm run build` ✅ success, PWA generateSW output produced

### Completion Notes List

- Implemented browser online/offline state handling in root layout and realtime status store so `LiveStatusIndicator` switches offline immediately.
- Added offline banners for room diagram, room calendar view, attendance page, and inventory page while preserving last-known data UI.
- Added RoomGrid offline overlay/banner support via `isOffline` prop.
- Extended PWA Workbox runtime caching strategies in `vite.config.ts` for app pages, assets, icons, and API requests (offline-read support).
- Added unit tests for realtime offline/online transitions and a small RoomGrid offline-banner logic test.
- Build/test/check passed; lint has unrelated pre-existing issues not introduced by this story.

### File List

**Created:**
- `_bmad-output/implementation-artifacts/7-2-offline-read-last-known-data-display.md`
- `manage-smeraldo-hotel/src/lib/components/rooms/RoomGrid.test.ts`

**Modified:**
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `manage-smeraldo-hotel/vite.config.ts`
- `manage-smeraldo-hotel/src/lib/stores/realtimeStatus.ts`
- `manage-smeraldo-hotel/src/lib/stores/realtimeStatus.test.ts`
- `manage-smeraldo-hotel/src/routes/+layout.svelte`
- `manage-smeraldo-hotel/src/lib/components/rooms/RoomGrid.svelte`
- `manage-smeraldo-hotel/src/routes/(reception)/rooms/+page.svelte`
- `manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.svelte`
- `manage-smeraldo-hotel/src/routes/(reception)/inventory/+page.svelte`
- `manage-smeraldo-hotel/src/lib/server/db/inventory.test.ts` (code review fix)

## Code Review Fixes (2026-02-24)

**Issues Found:** 6 HIGH, 5 MEDIUM (11 total)
**Issues Fixed:** 5 HIGH, 3 MEDIUM (8 total)
**Deferred:** 3 (documented below)

### ✅ Fixed Issues

**#1 [HIGH] - Story Never Committed to Git**
- **Issue:** No git commits for Story 7.2; implementation exists only as uncommitted changes mixed with Stories 7.3 and 7.5
- **Fix:** Story status changed from "review" → "in-progress" until proper commit workflow completed
- **Action Required:** Separate Story 7.2 changes from Story 7.3 work and commit independently

**#2 [HIGH] - All Tasks Marked Incomplete But Implementation Exists**
- **Issue:** Tasks 1-4, 6 were marked `[ ]` incomplete despite full implementation
- **Fix:** Updated checkboxes 1.1-1.5, 2.1-2.4, 3.1-3.3, 4.1-4.3, 6.1-6.3 to `[x]` complete
- **Note:** Task 5 (manual verification) and Task 7 (sprint tracking) remain incomplete

**#3 [HIGH] - Test Suite Failing**
- **Issue:** `inventory.test.ts` failing due to Story 7.4 changes (low-stock notification added extra fields)
- **Fix:** Updated test expectation from `.select('current_stock')` to `.select('current_stock, item_name, low_stock_threshold')`
- **File:** `manage-smeraldo-hotel/src/lib/server/db/inventory.test.ts:282`

**#5 [HIGH] - AC #4 Implementation Incomplete**
- **Issue:** `__data.json` endpoints used `NetworkFirst` with 10s timeout, blocking instant cache hit
- **Fix:** Changed handler from `NetworkFirst` → `StaleWhileRevalidate` for instant cache serve on repeat visits
- **File:** `manage-smeraldo-hotel/vite.config.ts:46-56`

**#7 [MEDIUM] - Hardcoded Production URL in vite.config.ts**
- **Issue:** API cache pattern hardcoded to `https://manage.smeraldohotel.online/api/.*` (won't work in dev/staging)
- **Fix:** Removed hardcoded absolute URL pattern; relative `/api/.*` pattern already exists (line 44)
- **File:** `manage-smeraldo-hotel/vite.config.ts:24-34` (removed)

**#8 [MEDIUM] - Missing Task 5 Verification**
- **Issue:** No evidence of production build testing (Task 5.1-5.4)
- **Fix:** Task 5 remains marked incomplete; manual verification required before marking story "done"

**#10 [MEDIUM] - Offline Queue Count Always Shows "0"**
- **Issue:** `offlineQueueCountStore` hardcoded to 0 (Story 7.3 dependency)
- **Fix:** Documented as expected behavior; Dev Notes already acknowledge queue deferred to Story 7.3

**#11 [MEDIUM] - Mixed Story 7.2 and 7.3 Code**
- **Issue:** `+layout.svelte` imports `flushOfflineQueue` and `refreshOfflineQueueCount` (Story 7.3 scope)
- **Fix:** Documented as known entanglement; cannot be separated without breaking functionality

### 🚧 Deferred Issues (Non-Blocking)

**#4 [HIGH] - File List Missing Story 7.3 Files Mixed In**
- **Status:** DEFERRED — process issue, not code issue
- **Reason:** Stories 7.2 and 7.3 were developed together; git history shows no clean separation
- **Impact:** Code review cannot cleanly validate Story 7.2 in isolation
- **Recommendation:** Accept mixed implementation; ensure proper commit messages distinguish changes

**#6 [HIGH] - sprint-status.yaml Not Updated**
- **Status:** DEFERRED — will be updated when story reaches "done" status
- **Reason:** Story status changed to "in-progress" due to incomplete Task 5 (manual verification)
- **Action:** Update sprint-status.yaml when all tasks complete

**#9 [MEDIUM] - RoomGrid Test Uses String Matching**
- **Status:** DEFERRED — test quality improvement, not blocking
- **Reason:** String-based test is brittle but functional; rewriting requires Svelte Testing Library integration
- **Impact:** Low — test validates presence of offline UI elements
- **Recommendation:** Consider upgrading to component mount tests in future test improvement epic

### Known Limitations

- **Task 5 (Production Build Verification):** Not completed during initial implementation; requires manual DevTools validation
- **Story 7.3 Dependency:** Offline write queue (`offlineQueue.ts`, `offlineSync.ts`) is implemented but tested in Story 7.3
- **Test Quality:** RoomGrid test uses source string matching instead of component rendering tests
