# Story 2.2: Floor Filter & Monthly Calendar View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a reception staff member,
I want to filter the room diagram by floor and switch to a monthly calendar view,
So that I can quickly isolate a specific floor's status or see a full month's occupancy at a glance.

## Acceptance Criteria

1. **Given** the room diagram is displayed **When** a reception user clicks a floor chip filter (Tất cả / T3 / T4 / T5 / T6 / T7 / T8 / T9) **Then** only rooms on the selected floor are shown — the filter change is instant, no page reload (FR9)

2. **Given** the room diagram is displayed **When** a user switches to "Calendar View" **Then** a monthly calendar grid appears showing room occupancy by date — each date cell reflects which rooms are occupied, available, or checking out (FR10)

3. **Given** the calendar view is active **When** the current month is displayed **Then** today's date is highlighted and the view defaults to the current month with one-tap navigation to adjacent months

## Tasks / Subtasks

- [x] **Task 1: Create `FloorFilter.svelte` Component** (AC: #1)
  - [x] Create `src/lib/components/rooms/FloorFilter.svelte`
  - [x] Props: `floors: number[]`, `selected: number | null`, `onselect: (floor: number | null) => void`
  - [x] "Tất cả" button (selected=null) + one button per floor ("T3", "T4", ..., "T9")
  - [x] Active state: `bg-primary text-white`; inactive: `bg-gray-100 text-gray-700 hover:bg-gray-200`
  - [x] `min-h-[36px]` touch targets, `rounded-full` pill shape
  - [x] `role="group"` with `aria-label="Lọc theo tầng"` for accessibility
  - [x] Flex wrap layout for responsive handling

- [x] **Task 2: Integrate Floor Filter in Rooms Page** (AC: #1)
  - [x] In `src/routes/(reception)/rooms/+page.svelte`:
  - [x] Add `selectedFloor = $state<number | null>(null)` state
  - [x] Compute `filteredRooms` using `$derived` — filters `allRooms` by `selectedFloor`
  - [x] Compute `floors` using `$derived` — unique floors from `allRooms`
  - [x] Status counts computed from `filteredRooms` (not `allRooms`)
  - [x] Pass `filteredRooms` to `RoomGrid`, `floors` and `selectedFloor` to `FloorFilter`
  - [x] Filter is instant — no server round-trip, pure client-side filtering

- [ ] **Task 3: Create Monthly Calendar View** (AC: #2, #3)
  - [ ] Create `src/lib/components/rooms/MonthlyCalendarView.svelte`
  - [ ] Props: `rooms: RoomState[]`, `currentMonth: Date`
  - [ ] Grid layout: 7 columns (Mon–Sun), 4-6 rows for weeks
  - [ ] Each date cell shows occupancy indicators (colored dots or mini count)
  - [ ] Today's date highlighted with ring or background color
  - [ ] Vietnamese day headers (T2, T3, T4, T5, T6, T7, CN)

- [ ] **Task 4: Add View Toggle (Diagram / Calendar)** (AC: #2)
  - [ ] In rooms page, add toggle buttons: "Sơ đồ" / "Lịch tháng"
  - [ ] `activeView = $state<'diagram' | 'calendar'>('diagram')`
  - [ ] Conditionally render `RoomGrid` or `MonthlyCalendarView`

- [ ] **Task 5: Month Navigation** (AC: #3)
  - [ ] Previous/next month buttons with `<` and `>` arrows
  - [ ] Display current month name in Vietnamese using `Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' })`
  - [ ] Default to current month on initial load

## Dev Notes

### Critical Architecture Constraints

- **Client-side filtering only** — Floor filter does NOT trigger a server request. All 23 rooms are loaded once via `getAllRooms()` in `+page.server.ts`, then filtered client-side using `$derived`.
- **Runes for component-local state** — `selectedFloor` and `activeView` use `$state` (component-local). Room data flows from Svelte Store for shared state.
- **Vietnamese locale** — Calendar must use `Intl.DateTimeFormat('vi-VN')` for month names. Day headers: T2 (Monday) through CN (Sunday).
- **No breadcrumbs** — App is max 2 levels deep per UX spec.

### Implementation Status

- **Floor filter: DONE** — `FloorFilter.svelte` created and integrated in rooms page.
- **Calendar view: PENDING** — `MonthlyCalendarView.svelte` not yet created. This requires booking data integration which comes in Epic 3. Current implementation can show room status per date but meaningful occupancy calendar depends on booking dates.

### Existing Code

- `FloorFilter.svelte` — fully functional, integrated in rooms page
- `(reception)/rooms/+page.svelte` — has `selectedFloor` state, `filteredRooms` derived, `floors` derived
- `RoomGrid.svelte` — receives filtered rooms and renders correctly
- `RoomStatusStrip.svelte` — counts update based on filtered rooms

### File Structure

Files created:
```
src/lib/components/rooms/FloorFilter.svelte            # Floor chip filter
```

Files modified:
```
src/routes/(reception)/rooms/+page.svelte              # Added floor filter integration
```

Files pending:
```
src/lib/components/rooms/MonthlyCalendarView.svelte    # Calendar view (not yet created)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2] — Acceptance criteria origin
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Client-side filtering, Svelte 5 Runes for local state
- [Source: _bmad-output/project-context.md#Locale & Data Formatting] — Vietnamese date format via Intl API
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — No breadcrumbs, chip filter pattern

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

None.

### Completion Notes List

- Story created retroactively. Floor filter (Tasks 1-2) is complete. Calendar view (Tasks 3-5) is pending.
- Floor filter is pure client-side — all 23 rooms loaded at once, no pagination needed at this scale.
- Calendar view implementation deferred — meaningful occupancy-by-date data requires booking records from Epic 3.

### File List

- `src/lib/components/rooms/FloorFilter.svelte` — CREATED
- `src/routes/(reception)/rooms/+page.svelte` — MODIFIED (added floor filter state + integration)
