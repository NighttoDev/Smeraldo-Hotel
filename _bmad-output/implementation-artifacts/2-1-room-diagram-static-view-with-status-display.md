# Story 2.1: Room Diagram — Static View with Status Display

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a reception staff member,
I want to see a visual diagram of all 23 hotel rooms grouped by floor, each showing its current status and any assigned guest name,
So that I can immediately understand the state of the entire hotel at the start of every shift.

## Acceptance Criteria

1. **Given** a reception or manager user is logged in and navigates to the Rooms page **When** the room diagram loads **Then** all 23 sellable rooms are displayed in a grid grouped by floor (floors 3–9), each as a `RoomTile` component showing room number (Fira Code) and status badge (FR6, FR7) **And** the diagram renders fully in < 1 second (NFR-P3)

2. **Given** a room is in Occupied status **When** reception views the room diagram **Then** the guest name assigned to that room is displayed on the tile (FR8)

3. **Given** room status tiles are rendered **When** any status is displayed **Then** each tile uses both a color token (`room-available`, `room-occupied`, `room-checkout`, `room-cleaning`, `room-ready`) AND a text label — never color-only (NFR-A1, NFR-A2)

4. **Given** the page loads on desktop (1024px+) **When** the layout renders **Then** the top navbar is fixed (`h-12`, navy), all floors are visible without scrolling, and the stat strip shows inline counts (Có khách · Trống · Trả phòng · Đang dọn · Sẵn sàng)

5. **Given** the page loads on mobile (< 768px) **When** the layout renders **Then** the top navbar collapses to a bottom tab bar and the room grid becomes a vertically scrollable single-column list

## Tasks / Subtasks

- [x] **Task 1: Create Room Server DB Functions** (AC: #1)
  - [x] Create `src/lib/server/db/rooms.ts`
  - [x] Implement `getAllRooms(supabase)` — `SELECT id, room_number, floor, room_type, status, current_guest_name, created_at, updated_at FROM rooms ORDER BY floor ASC, room_number ASC`, returns typed `RoomRow[]`
  - [x] Implement `getRoomsByFloor(supabase, floor)` — filtered by floor
  - [x] Implement `getRoomById(supabase, id)` — returns single `RoomRow | null`
  - [x] Implement `calculateStatusCounts(rooms)` — pure function computing counts per status
  - [x] Define `RoomRow` and `RoomStatusCounts` interfaces

- [x] **Task 2: Create `roomStateStore` in `$lib/stores/`** (AC: #1)
  - [x] Create `src/lib/stores/roomState.ts`
  - [x] `roomStateStore = writable<Map<string, RoomState>>(new Map())` — keyed by room ID for O(1) lookup
  - [x] `roomListStore` — derived, sorted array by floor then room_number
  - [x] `roomStatusCountsStore` — derived counts per status
  - [x] `floorsStore` — derived unique floors sorted ascending
  - [x] `initRoomState(rooms)` — initializes store from server data
  - [x] `updateRoomInStore(room)` — updates a single room (for future Realtime use)

- [x] **Task 3: Create `StatusBadge.svelte` Component** (AC: #3)
  - [x] Create `src/lib/components/rooms/StatusBadge.svelte`
  - [x] Props: `status: RoomStatus`, `size?: 'sm' | 'md'`
  - [x] Uses custom Tailwind color tokens: `bg-room-available/10 text-room-available`, etc.
  - [x] Always renders colored dot + text label — never color-only (WCAG NFR-A1, NFR-A2)
  - [x] Vietnamese labels: Trống, Có khách, Trả phòng, Đang dọn, Sẵn sàng

- [x] **Task 4: Create `RoomTile.svelte` Component** (AC: #1, #2, #3)
  - [x] Create `src/lib/components/rooms/RoomTile.svelte`
  - [x] Props: `room: RoomState`, `onclick?: () => void`
  - [x] Renders as `<button>` (never `<div onClick>` per UX spec)
  - [x] Room number in `font-mono text-lg font-bold` (Fira Code), room type below
  - [x] `StatusBadge` for status display
  - [x] Guest name shown if `current_guest_name` is not null (FR8)
  - [x] Left border color per status using Tailwind tokens
  - [x] `min-h-[100px]`, `aria-label="Phòng {room_number} — {status}"`
  - [x] `motion-reduce:transition-none` on hover shadow transition

- [x] **Task 5: Create `RoomGrid.svelte` Component** (AC: #1, #4, #5)
  - [x] Create `src/lib/components/rooms/RoomGrid.svelte`
  - [x] Props: `rooms: RoomState[]`, `onroomclick?: (roomId: string) => void`
  - [x] Groups rooms by floor using `$derived` — `Record<number, RoomState[]>`
  - [x] Each floor section: `<h2>Tầng {floor}</h2>` + responsive grid
  - [x] Grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`
  - [x] Empty state: "Không có phòng nào."

- [x] **Task 6: Create `RoomStatusStrip.svelte` Component** (AC: #4)
  - [x] Create `src/lib/components/rooms/RoomStatusStrip.svelte`
  - [x] Props: `counts: StatusCounts`
  - [x] Inline flex layout with colored dots + count + Vietnamese label per status
  - [x] Order: Có khách, Trống, Trả phòng, Đang dọn, Sẵn sàng

- [x] **Task 7: Create Reception Layout** (AC: #4, #5)
  - [x] Create `src/routes/(reception)/+layout.svelte`
  - [x] Renders `TopNavbar` (desktop, `hidden md:block`) and `BottomTabBar` (mobile, `md:hidden`)
  - [x] `<main>` with `pb-16 pt-0 md:pb-0 md:pt-12` for nav clearance

- [x] **Task 8: Create `TopNavbar.svelte` Component** (AC: #4)
  - [x] Create `src/lib/components/layout/TopNavbar.svelte`
  - [x] Props: `role: StaffRole`, `fullName: string`
  - [x] Fixed top, `h-12`, `bg-primary` (navy), `z-30`
  - [x] Brand link "Smeraldo Hotel", role-specific nav links, user name, logout form
  - [x] Active link: `bg-white/20 text-white`; inactive: `text-white/70 hover:bg-white/10`
  - [x] Nav items: reception (Phòng, Đặt phòng, Chấm công, Kho), manager (Dashboard, Nhân viên, Báo cáo), housekeeping (Phòng của tôi)

- [x] **Task 9: Create Rooms Page** (AC: #1, #2, #4)
  - [x] Create `src/routes/(reception)/rooms/+page.server.ts` — `load` calls `getAllRooms(locals.supabase)`, returns `{ rooms }`
  - [x] Create `src/routes/(reception)/rooms/+page.svelte`
  - [x] Page title: "Sơ đồ phòng" with room count subtitle
  - [x] Status strip, room grid with all rooms
  - [x] Svelte head: `<title>Sơ đồ phòng — Smeraldo Hotel</title>`

## Dev Notes

### Critical Architecture Constraints

- **Server/client boundary** — All DB queries go through `src/lib/server/db/rooms.ts`. Components never import from `src/lib/server/`.
- **`<button>` for interactive tiles** — Per UX spec: "Skip link as first focusable element; `<button>` for all interactive tiles (never `<div onClick>`)."
- **Color + text for status** — Never color-only per NFR-A1, NFR-A2. `StatusBadge` always renders colored dot + text label.
- **Custom Tailwind tokens** — `room-available` (#10B981), `room-occupied` (#3B82F6), `room-checkout` (#F59E0B), `room-cleaning` (#8B5CF6), `room-ready` (#22C55E) defined in `tailwind.config.ts`.
- **Typography** — Room numbers use `font-mono` (Fira Code); labels use `font-sans` (Fira Sans).
- **`prefers-reduced-motion`** — Tile hover transitions use `motion-reduce:transition-none`.
- **Stores for shared state** — `roomStateStore` is a Svelte Store (writable Map), not a rune. Designed for future Realtime integration in Story 2.5.

### Existing Code From Previous Stories

- `src/routes/(reception)/+layout.server.ts` — `requireRole(['reception', 'manager'])` (Story 1.4)
- `src/hooks.server.ts` — auth gate + `locals.userRole` (Story 1.3/1.4)
- `src/lib/server/auth.ts` — `requireRole()` function (Story 1.4)
- `src/lib/db/types.ts` — Supabase generated types including `rooms` table (Story 1.2)

### Database Context

```sql
-- rooms table (from 00001_initial_schema.sql)
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number TEXT NOT NULL UNIQUE,
  floor INTEGER NOT NULL,
  room_type TEXT NOT NULL,
  status room_status DEFAULT 'available',
  current_guest_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 23 rooms seeded across floors 3-9 (from 00004_seed_rooms.sql)
```

### File Structure

Files created:
```
src/lib/server/db/rooms.ts                            # Room DB functions (7 exports)
src/lib/stores/roomState.ts                           # Room state store (Map + derived stores)
src/lib/components/rooms/StatusBadge.svelte            # Status color + text badge
src/lib/components/rooms/RoomTile.svelte               # Individual room tile (button)
src/lib/components/rooms/RoomGrid.svelte               # Grid grouped by floor
src/lib/components/rooms/RoomStatusStrip.svelte        # Inline status counts
src/lib/components/layout/TopNavbar.svelte             # Fixed top navbar
src/routes/(reception)/+layout.svelte                  # Reception layout
src/routes/(reception)/rooms/+page.svelte              # Room diagram page
src/routes/(reception)/rooms/+page.server.ts           # Room data loader
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — Acceptance criteria origin
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns] — Component placement, project tree
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Svelte Stores for cross-component state
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns] — roomStateStore pattern
- [Source: _bmad-output/project-context.md#Naming Conventions] — Component PascalCase, Store camelCase+Store
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Room status Tailwind tokens, typography, layout modes

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

None — implementation completed without blocking issues.

### Completion Notes List

- Story created retroactively after implementation was completed.
- `RoomGrid` uses `$derived` closure pattern for floor grouping — returns a function that must be invoked.
- `RoomTile` uses `<button>` element (not `<div>`) for accessibility per UX spec.
- All Vietnamese labels throughout: Sơ đồ phòng, Tầng, Trống, Có khách, etc.
- `roomStateStore` uses a `Map<string, RoomState>` for O(1) lookup — designed for Realtime updates in Story 2.5.

### File List

- `src/lib/server/db/rooms.ts` — CREATED
- `src/lib/stores/roomState.ts` — CREATED
- `src/lib/components/rooms/StatusBadge.svelte` — CREATED
- `src/lib/components/rooms/RoomTile.svelte` — CREATED
- `src/lib/components/rooms/RoomGrid.svelte` — CREATED
- `src/lib/components/rooms/RoomStatusStrip.svelte` — CREATED
- `src/lib/components/layout/TopNavbar.svelte` — CREATED
- `src/routes/(reception)/+layout.svelte` — CREATED
- `src/routes/(reception)/rooms/+page.svelte` — CREATED
- `src/routes/(reception)/rooms/+page.server.ts` — CREATED
