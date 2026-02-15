# Story 2.5: Real-Time Room Status Sync Across All Sessions

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a hotel staff member,
I want to see room status changes made by any staff member reflected on my screen within 3 seconds without refreshing,
So that I always have an accurate live view of the hotel floor and can act on the latest information.

## Acceptance Criteria

1. **Given** two staff members have the room diagram open simultaneously **When** housekeeping marks a room as "Ready" **Then** reception sees the room tile update to green "Ready" within 3 seconds — no page refresh required (FR15, NFR-P5)

2. **Given** the root `+layout.svelte` initializes the Supabase Realtime subscription on the `rooms:all` channel **When** any room status changes via any path (Form Action, REST endpoint, override) **Then** the `roomStateStore` (Svelte Store) is updated and all components re-render reactively — no direct Realtime calls inside individual components

3. **Given** the `LiveStatusIndicator` is mounted in the top navbar **When** the Realtime connection is live **Then** it shows a green animated pulse dot + "Live · Updated just now" **And** when the connection drops it shows grey + "Offline — X changes queued"

4. **Given** two staff members submit a room status change simultaneously **When** the server processes both writes **Then** server-side conflict resolution (last-write-wins via Postgres transaction) is applied — no data is silently lost (NFR-R4)

## Tasks / Subtasks

- [ ] **Task 1: Enable Supabase Realtime on `rooms` table** (AC: #1, #2)
  - [ ] Create a new Supabase CLI migration: `supabase migration new enable_rooms_realtime`
  - [ ] SQL: `ALTER PUBLICATION supabase_realtime ADD TABLE rooms;` — this enables Postgres Changes broadcast for the rooms table
  - [ ] Run `supabase db push` to apply the migration to the remote Supabase instance
  - [ ] Verify in Supabase Studio → Database → Replication that `rooms` table appears in the `supabase_realtime` publication

- [ ] **Task 2: Add Realtime subscription in root `+layout.svelte`** (AC: #1, #2)
  - [ ] In `src/routes/+layout.svelte`, inside the existing `onMount`, add a Supabase Realtime channel subscription
  - [ ] Channel name: `rooms:all` (per architecture convention)
  - [ ] Subscribe to `postgres_changes` event: `{ event: '*', schema: 'public', table: 'rooms' }`
  - [ ] On `INSERT` or `UPDATE` payload: call `updateRoomInStore()` from `$lib/stores/roomState.ts`, mapping the payload `new` record to `RoomState`
  - [ ] On `DELETE` payload: remove from `roomStateStore` (edge case — rooms are never deleted in practice)
  - [ ] Call `channel.unsubscribe()` in the cleanup function returned from `onMount` — prevents memory leaks and duplicate broadcasts
  - [ ] Export the channel status to a new `realtimeStatusStore` for `LiveStatusIndicator` consumption

- [ ] **Task 3: Create `realtimeStatusStore` in `$lib/stores/`** (AC: #3)
  - [ ] Create `src/lib/stores/realtimeStatus.ts`
  - [ ] Export `realtimeStatusStore = writable<{ connected: boolean; lastUpdate: string | null }>({ connected: false, lastUpdate: null })`
  - [ ] Export `offlineQueueCountStore = writable<number>(0)` — placeholder for future offline queue integration (Story 7.3)
  - [ ] Update store from channel status callbacks in `+layout.svelte`: `SUBSCRIBED` → connected=true, `CLOSED`/`CHANNEL_ERROR` → connected=false

- [ ] **Task 4: Create `LiveStatusIndicator.svelte` component** (AC: #3)
  - [ ] Create `src/lib/components/layout/LiveStatusIndicator.svelte`
  - [ ] Props: none (reads directly from `realtimeStatusStore` and `offlineQueueCountStore`)
  - [ ] Connected state: green pulse dot (`bg-green-500 animate-pulse`) + "Trực tiếp · Vừa cập nhật" (respects `prefers-reduced-motion` — no pulse animation)
  - [ ] Disconnected state: grey dot (`bg-gray-400`) + "Ngoại tuyến — X thay đổi đang chờ" (X from `offlineQueueCountStore`, show 0 for now)
  - [ ] Size: small inline element, fits in the top navbar without disrupting layout
  - [ ] Use `motion-reduce:animate-none` Tailwind class for accessibility

- [ ] **Task 5: Mount `LiveStatusIndicator` in `TopNavbar.svelte`** (AC: #3)
  - [ ] Import `LiveStatusIndicator` in `src/lib/components/layout/TopNavbar.svelte`
  - [ ] Place it in the right section of the navbar, before the user name — e.g., between nav links and user info
  - [ ] Also add to `BottomTabBar.svelte` for mobile housekeeping view — place as a small indicator in the bar

- [ ] **Task 6: Initialize `roomStateStore` from server data on page load** (AC: #1, #2)
  - [ ] In `src/routes/(reception)/rooms/+page.svelte`, call `initRoomState(data.rooms)` on mount (the function already exists in `roomState.ts`)
  - [ ] In `src/routes/(housekeeping)/my-rooms/+page.svelte`, call `initRoomState(data.rooms)` on mount
  - [ ] Ensure components read from `roomListStore` (derived store) instead of `data.rooms` prop for live updates
  - [ ] Verify `RoomGrid.svelte`, `RoomTile.svelte`, `HousekeepingRoomCard.svelte` consume from store

- [ ] **Task 7: Refactor room pages to read from store for live updates** (AC: #1, #2)
  - [ ] Update `(reception)/rooms/+page.svelte` to subscribe to `roomListStore` for rendering rooms instead of `data.rooms`
  - [ ] Update `(housekeeping)/my-rooms/+page.svelte` to subscribe to `roomListStore` (filtered to cleaning-needed statuses) for live updates
  - [ ] Update `RoomStatusStrip.svelte` to read from `roomStatusCountsStore` instead of computing from props
  - [ ] Ensure floor filter still works: filter `$roomListStore` by `selectedFloor` using `$derived`

- [ ] **Task 8: Server-side conflict resolution** (AC: #4)
  - [ ] Verify `updateRoomStatus()` in `src/lib/server/db/rooms.ts` uses `.update().eq('id', roomId).select().single()` — Postgres UPDATE is atomic; last-write-wins is the default behavior
  - [ ] Verify `insertRoomStatusLog()` always writes the audit entry regardless of concurrent writes — each write gets its own log entry
  - [ ] No additional code needed: Postgres transactions handle concurrency natively with row-level locks on UPDATE

- [ ] **Task 9: Unit Tests** (AC: all)
  - [ ] Create `src/lib/stores/realtimeStatus.test.ts`:
    - [ ] Test initial state is `{ connected: false, lastUpdate: null }`
    - [ ] Test setting connected=true and verifying store value
    - [ ] Test `offlineQueueCountStore` default is 0
  - [ ] Create `src/lib/stores/roomState.test.ts`:
    - [ ] Test `initRoomState()` populates store correctly
    - [ ] Test `updateRoomInStore()` updates a single room
    - [ ] Test `roomListStore` sorts by floor then room_number
    - [ ] Test `roomStatusCountsStore` counts correctly
    - [ ] Test `floorsStore` returns unique sorted floors
  - [ ] Run `npm run check` — zero TypeScript errors
  - [ ] Run `npm run lint` — clean
  - [ ] Run `npm run build` — success
  - [ ] Run `npm test` — all tests pass

## Dev Notes

### Critical Architecture Constraints

- **Realtime subscription ONLY in root `+layout.svelte`** — per architecture: "Root `+layout.svelte` initialises the Supabase Realtime subscription once. All consumers read from `roomStateStore` — never make direct Realtime calls inside components."
- **`channel.unsubscribe()` in cleanup** — MUST call in the return function of `onMount` to prevent memory leaks and duplicate broadcasts.
- **Stores for cross-component state, NOT runes** — per project-context.md: "Use Svelte Stores (`writable`, `readable`) for any state shared across component boundaries." The `roomStateStore`, `realtimeStatusStore` are Svelte Stores. Component-local state uses `$state`.
- **Never import `src/lib/server/` in `.svelte` files** — build will fail. All DB queries go through `+page.server.ts` load functions.
- **Supabase Realtime channel naming** — Use `rooms:all` per architecture convention at `architecture.md#Communication Patterns`.
- **`prefers-reduced-motion`** — `LiveStatusIndicator` pulse animation must use `motion-reduce:animate-none` Tailwind class.

### Supabase Realtime Subscription Pattern (Exact Code)

```typescript
// In +layout.svelte onMount — ADD to existing auth subscription
import { initRoomState, updateRoomInStore } from '$lib/stores/roomState';
import type { RoomState } from '$lib/stores/roomState';
import { realtimeStatusStore } from '$lib/stores/realtimeStatus';

const roomChannel = supabase
  .channel('rooms:all')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'rooms' },
    (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const room = payload.new as RoomState;
        updateRoomInStore(room);
      }
      realtimeStatusStore.set({
        connected: true,
        lastUpdate: new Date().toISOString()
      });
    }
  )
  .subscribe((status) => {
    realtimeStatusStore.set({
      connected: status === 'SUBSCRIBED',
      lastUpdate: status === 'SUBSCRIBED' ? new Date().toISOString() : null
    });
  });

// Cleanup — add to existing return function
return () => {
  subscription.unsubscribe(); // existing auth cleanup
  roomChannel.unsubscribe();  // NEW: Realtime cleanup
};
```

### Existing Codebase State (from Stories 2.1-2.4)

These files exist and are functional — verify before modifying:
- `src/lib/stores/roomState.ts` — `roomStateStore` (writable Map), `roomListStore` (derived sorted array), `roomStatusCountsStore` (derived counts), `floorsStore` (derived unique floors), `initRoomState()`, `updateRoomInStore()` — ALL READY for Realtime integration
- `src/lib/server/db/rooms.ts` — `getAllRooms()`, `getRoomsByFloor()`, `getRoomsNeedingCleaning()`, `updateRoomStatus()`, `getRoomById()`, `insertRoomStatusLog()`, `calculateStatusCounts()` — server-only DB functions
- `src/lib/components/rooms/RoomTile.svelte` — renders individual room tile with status badge
- `src/lib/components/rooms/RoomGrid.svelte` — renders grid of room tiles grouped by floor
- `src/lib/components/rooms/FloorFilter.svelte` — floor chip filter (All / F3-F9)
- `src/lib/components/rooms/RoomStatusStrip.svelte` — inline status counts strip
- `src/lib/components/rooms/StatusBadge.svelte` — color + text status badge (WCAG compliant)
- `src/lib/components/rooms/StatusOverrideDialog.svelte` — confirmation dialog for status override
- `src/lib/components/rooms/HousekeepingRoomCard.svelte` — mobile housekeeping room card with "Sẵn sàng" button
- `src/lib/components/layout/TopNavbar.svelte` — fixed top navbar with nav links, user info, logout
- `src/lib/components/layout/BottomTabBar.svelte` — mobile bottom tab bar for housekeeping
- `src/routes/(reception)/rooms/+page.svelte` — room diagram page
- `src/routes/(reception)/rooms/+page.server.ts` — loads rooms + overrideStatus Form Action
- `src/routes/(housekeeping)/my-rooms/+page.svelte` — housekeeping task list page
- `src/routes/(housekeeping)/my-rooms/+page.server.ts` — loads cleaning-needed rooms + markReady Form Action
- `src/routes/+layout.svelte` — root layout with auth state change listener (extend, don't replace)

### Key Integration Points

1. **`+layout.svelte` is the single Realtime entry point** — all channel subscriptions live here
2. **`roomStateStore` is already designed for Realtime** — `updateRoomInStore(room)` handles single-room updates from Realtime payloads
3. **Room pages currently use `data.rooms` from server** — must switch to reading from `roomListStore` for live updates after initial `initRoomState(data.rooms)` call
4. **`LiveStatusIndicator` must be visible on ALL role layouts** — add to both `TopNavbar` (desktop) and `BottomTabBar` (mobile)

### Supabase Realtime Migration Required

The `rooms` table must be added to the `supabase_realtime` publication. Without this migration, Supabase Realtime will NOT broadcast changes to the `rooms` table. This is a one-line SQL migration:

```sql
-- supabase/migrations/XXXXX_enable_rooms_realtime.sql
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
```

### File Structure

New files to create:
```
src/lib/stores/realtimeStatus.ts                    # Realtime connection status store
src/lib/components/layout/LiveStatusIndicator.svelte # Connection indicator component
src/lib/stores/realtimeStatus.test.ts               # Store unit tests
src/lib/stores/roomState.test.ts                    # Store unit tests
supabase/migrations/XXXXX_enable_rooms_realtime.sql # Enable Realtime on rooms table
```

Files to modify:
```
src/routes/+layout.svelte                            # Add Realtime channel subscription
src/lib/components/layout/TopNavbar.svelte           # Mount LiveStatusIndicator
src/lib/components/layout/BottomTabBar.svelte        # Mount LiveStatusIndicator (mobile)
src/routes/(reception)/rooms/+page.svelte            # Init store + read from store
src/routes/(housekeeping)/my-rooms/+page.svelte      # Init store + read from store
```

### Project Structure Notes

- `realtimeStatusStore` follows naming convention: `camelCase` + `Store` suffix
- `LiveStatusIndicator.svelte` follows `PascalCase.svelte` convention, placed in `src/lib/components/layout/` alongside `TopNavbar` and `BottomTabBar`
- Migration file follows Supabase CLI convention: sequential numbered SQL in `supabase/migrations/`
- No new `+server.ts` endpoints needed — Realtime is handled entirely client-side via Supabase JS SDK

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5] — Acceptance criteria origin
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns] — Realtime channel naming: `rooms:all`, `room:{roomId}`, `notifications:{staffId}`
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries] — "Root `+layout.svelte` initialises the Supabase Realtime subscription once"
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow] — End-to-end flow: User action → DB → Realtime broadcast → roomStateStore → component re-render
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Svelte Stores for cross-component state
- [Source: _bmad-output/project-context.md#Supabase Realtime] — Channel subscription rules, unsubscribe in onDestroy
- [Source: _bmad-output/project-context.md#Svelte 5 Runes vs Stores] — Stores for shared state, runes for component-local
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — LiveStatusIndicator: "Live · Updated just now" / "Offline — X changes queued"
- [Source: _bmad-output/implementation-artifacts/1-4-role-based-access-control-staff-account-management.md] — Previous story patterns: Superforms, Form Actions, test conventions

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
