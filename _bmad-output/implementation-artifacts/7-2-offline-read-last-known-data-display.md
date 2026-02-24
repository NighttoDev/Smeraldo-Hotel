# Story 7.2: Offline Read — Last-Known Data Display

Status: review

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

- [ ] Task 1: Configure Workbox runtime caching for offline read paths (AC: #2, #3, #4)
  - [ ] 1.1 Update `manage-smeraldo-hotel/vite.config.ts` `SvelteKitPWA(...)` config (reuse Story 7.1 manifest setup)
  - [ ] 1.2 Add route-level caching for app pages (`/rooms`, `/attendance`, `/inventory`, `/dashboard`, `/reports`) using `StaleWhileRevalidate`
  - [ ] 1.3 Add static asset caching for `/_app/**`, `/icons/**`, fonts and CSS (`CacheFirst`)
  - [ ] 1.4 Add API/document fetch fallback strategy (`NetworkFirst` with timeout) for data routes used by these pages
  - [ ] 1.5 Enable cache cleanup (`cleanupOutdatedCaches`) and immediate activation (`skipWaiting`, `clientsClaim`)

- [ ] Task 2: Add explicit online/offline state handling for UI indicator (AC: #1)
  - [ ] 2.1 Extend `src/lib/stores/realtimeStatus.ts` with browser network state helpers (online/offline)
  - [ ] 2.2 In `src/routes/+layout.svelte`, register `window` `online`/`offline` listeners on mount and cleanup on destroy
  - [ ] 2.3 Ensure `realtimeStatusStore.connected` reflects offline state immediately (independent of Realtime subscription timing)
  - [ ] 2.4 Keep `offlineQueueCountStore` behavior unchanged (queue implementation remains Story 7.3)

- [ ] Task 3: Show offline overlay on room diagram (AC: #2)
  - [ ] 3.1 Add an `isOffline` prop to `RoomGrid.svelte` and render a muted "Ngoại tuyến" overlay banner
  - [ ] 3.2 Pass offline state from `(reception)/rooms/+page.svelte` to `RoomGrid`
  - [ ] 3.3 Preserve existing room tile interactions (read flow unchanged; write behavior handled in Story 7.3)

- [ ] Task 4: Show offline context on attendance and inventory pages (AC: #3)
  - [ ] 4.1 In `(reception)/attendance/+page.svelte`, render non-blocking offline notice when network is down
  - [ ] 4.2 In `(reception)/inventory/+page.svelte`, render non-blocking offline notice when network is down
  - [ ] 4.3 Ensure last loaded data remains visible; no blank fallback introduced by offline state

- [ ] Task 5: Verification for cached repeat-load behavior (AC: #4)
  - [ ] 5.1 Build and preview production bundle (`npm run build && npm run preview`)
  - [ ] 5.2 Prime cache by visiting rooms/attendance/inventory once online
  - [ ] 5.3 Toggle browser offline mode and verify pages still render from cache
  - [ ] 5.4 Validate repeat visit load timing target (< 1s, from Service Worker cache in DevTools)

- [ ] Task 6: Tests (AC: #1, #2, #3)
  - [ ] 6.1 Add/update unit tests for `realtimeStatusStore` offline/online transitions
  - [ ] 6.2 Add component tests for offline banner/overlay rendering (`RoomGrid`, attendance page, inventory page where feasible)
  - [ ] 6.3 Run `npm run check`, `npm run lint`, `npm run test:unit`

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
