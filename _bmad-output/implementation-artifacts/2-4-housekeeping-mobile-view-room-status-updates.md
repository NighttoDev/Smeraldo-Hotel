# Story 2.4: Housekeeping Mobile View & Room Status Updates

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a housekeeping staff member,
I want to see only the rooms assigned to me that need cleaning and update their status with a single tap from my phone,
So that I can work independently without making phone calls to reception.

## Acceptance Criteria

1. **Given** a housekeeping staff member is logged in on their phone **When** they open the app **Then** they see only rooms with status "Checking Out Today" or "Being Cleaned" — no financial data, inventory, attendance, or booking details are visible (FR13, NFR-S5)

2. **Given** a housekeeping staff member is viewing their assigned rooms **When** they tap "Đánh dấu sẵn sàng" on a completed room **Then** the room status updates to "Ready" immediately, saved via `?/markReady` Form Action, and the `room_status_logs` audit entry is written (FR14)

3. **Given** a housekeeping staff member is on mobile (< 768px) **When** they view their assigned rooms **Then** each room is displayed as a `HousekeepingRoomCard` with room number (Fira Code), floor, room type, status label, and a prominent "Đánh dấu sẵn sàng" button with minimum 48×48px touch target

4. **Given** no rooms need cleaning **When** housekeeping views their task list **Then** an empty state message is shown: "Không có phòng nào cần dọn. Tuyệt vời! 🎉"

## Tasks / Subtasks

- [x] **Task 1: Create Housekeeping Route & Layout** (AC: #1)
  - [x] Verify `src/routes/(housekeeping)/+layout.server.ts` exists — calls `requireRole(locals, ['housekeeping', 'manager'])` and returns `{ role, fullName }`
  - [x] Create `src/routes/(housekeeping)/+layout.svelte` — renders `TopNavbar` (desktop) and `BottomTabBar` (mobile) with role/fullName props, `<main>` with `pb-16 md:pb-0 pt-0 md:pt-12` for bottom/top nav clearance

- [x] **Task 2: Create `BottomTabBar.svelte` Component** (AC: #3)
  - [x] Create `src/lib/components/layout/BottomTabBar.svelte`
  - [x] Props: `role: StaffRole`
  - [x] Mobile-only: `md:hidden`, fixed bottom, `z-30`, white bg, border-t
  - [x] Tab items per role: housekeeping gets single tab `{ href: '/my-rooms', label: 'Phòng', icon: '🏠' }`; reception gets 3 tabs; manager gets 3 tabs
  - [x] Active tab highlighted with `text-primary font-semibold`
  - [x] All touch targets: `min-h-[48px] min-w-[48px]` (WCAG compliance)
  - [x] `motion-reduce:transition-none` on hover transitions

- [x] **Task 3: Create Server DB Function for Cleaning-Needed Rooms** (AC: #1)
  - [x] Implement `getRoomsNeedingCleaning(supabase)` in `src/lib/server/db/rooms.ts`
  - [x] Query: `SELECT * FROM rooms WHERE status IN ('checking_out_today', 'being_cleaned') ORDER BY floor ASC, room_number ASC`
  - [x] Returns `RoomRow[]` typed array

- [x] **Task 4: Create Housekeeping Page Server** (AC: #1, #2)
  - [x] Create `src/routes/(housekeeping)/my-rooms/+page.server.ts`
  - [x] `load`: calls `getRoomsNeedingCleaning(locals.supabase)` + `superValidate(zod4(MarkReadySchema))`
  - [x] `MarkReadySchema`: `z.object({ room_id: z.string().uuid() })`
  - [x] `actions.markReady`: validates form, fetches room by ID, calls `updateRoomStatus(supabase, room_id, 'ready')`, writes audit log via `insertRoomStatusLog()`, returns success/error message via Superforms

- [x] **Task 5: Create `HousekeepingRoomCard.svelte` Component** (AC: #3)
  - [x] Create `src/lib/components/rooms/HousekeepingRoomCard.svelte`
  - [x] Props: `room: RoomState`, `onmarkready: (roomId: string) => void`, `loading?: boolean`
  - [x] Layout: white card with border, room number in `font-mono text-xl font-bold`, floor label, `StatusBadge` with `size="md"`
  - [x] Guest name shown if present
  - [x] "✓ Đánh dấu sẵn sàng" button: `min-h-[48px]`, full-width, `bg-room-ready` green, loading spinner when submitting
  - [x] Reuses existing `StatusBadge.svelte` for status display (color + text, WCAG compliant)

- [x] **Task 6: Create Housekeeping Page UI** (AC: #1, #3, #4)
  - [x] Create `src/routes/(housekeeping)/my-rooms/+page.svelte`
  - [x] Page title: "Phòng cần dọn" with room count subtitle
  - [x] Success/error alert banner from Superforms `$message`
  - [x] Empty state: centered card with "Không có phòng nào cần dọn." + "Tuyệt vời! 🎉"
  - [x] Room list: vertical `space-y-3` single-column layout with `HousekeepingRoomCard` components
  - [x] Hidden form technique: `<form id="mark-ready-form">` with `use:enhance` — `handleMarkReady()` sets `room_id` and calls `requestSubmit()`
  - [x] Loading state tracked per room via `loadingRoomId` state variable

## Dev Notes

### Critical Architecture Constraints

- **RBAC already enforced** — `(housekeeping)/+layout.server.ts` calls `requireRole(['housekeeping', 'manager'])`. Housekeeping users cannot access any route outside `(housekeeping)/` — enforced by layout server files in other route groups (FR2, NFR-S5).
- **Server/client boundary** — All DB queries go through `src/lib/server/db/rooms.ts`. Components never import from `src/lib/server/`.
- **Form Actions for mutations** — `?/markReady` Form Action handles the status update. Uses Superforms + Zod for validation.
- **Audit trail on every status change** — `insertRoomStatusLog()` called after every `updateRoomStatus()` — writes to immutable `room_status_logs` table (FR12, NFR-S4).
- **48×48px touch targets** — All interactive elements on mobile meet minimum touch target size per WCAG 2.1 and UX spec.
- **Bottom tab bar on mobile** — `BottomTabBar.svelte` replaces top navbar on screens < 768px (`md:hidden` on tab bar, `hidden md:block` on top navbar).

### Existing Code Reused

- `StatusBadge.svelte` — room status with color + text label (WCAG compliant, never color-only)
- `updateRoomStatus()` — from `src/lib/server/db/rooms.ts` (Story 2.1)
- `insertRoomStatusLog()` — from `src/lib/server/db/rooms.ts` (Story 2.3)
- `getRoomById()` — pre-check before status update
- `TopNavbar.svelte` — desktop navigation, shared across all role layouts

### Database Context

```sql
-- getRoomsNeedingCleaning query
SELECT * FROM rooms
WHERE status IN ('checking_out_today', 'being_cleaned')
ORDER BY floor ASC, room_number ASC;
```

RLS policies ensure housekeeping can only read rooms and write `status` updates — no access to `attendance_logs`, `stock_movements`, `bookings`, or `staff_members` (except own row).

### File Structure

Files created:
```
src/routes/(housekeeping)/+layout.svelte              # Housekeeping layout (TopNav + BottomTab)
src/routes/(housekeeping)/my-rooms/+page.svelte       # Housekeeping task list page
src/routes/(housekeeping)/my-rooms/+page.server.ts    # load + markReady action
src/lib/components/rooms/HousekeepingRoomCard.svelte  # Mobile room card with Mark Ready button
src/lib/components/layout/BottomTabBar.svelte         # Mobile bottom tab navigation
```

Files modified:
```
src/lib/server/db/rooms.ts                            # Added getRoomsNeedingCleaning()
```

### Project Structure Notes

- `(housekeeping)/my-rooms/` follows route group pattern — `my-rooms` avoids collision with `(reception)/rooms/`
- `BottomTabBar.svelte` in `src/lib/components/layout/` alongside `TopNavbar.svelte`
- `HousekeepingRoomCard.svelte` in `src/lib/components/rooms/` alongside other room components
- Max 3 tabs in mobile bottom bar per UX spec — housekeeping has only 1 tab

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4] — Acceptance criteria origin
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns] — Route groups, component placement
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture] — RBAC role matrix: housekeeping access
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns] — Form Action + Superforms pattern
- [Source: _bmad-output/project-context.md#SvelteKit Data Flow] — Form Actions for user-initiated mutations
- [Source: _bmad-output/project-context.md#Naming Conventions] — `?/markReady` camelCase action name
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Bottom tab bar (3 tabs max), 48×48px touch targets, mobile-first housekeeping layout

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

None — implementation completed without blocking issues.

### Completion Notes List

- Story created retroactively after implementation was completed.
- `HousekeepingRoomCard` uses hidden form + `requestSubmit()` pattern to trigger Superforms `?/markReady` action while keeping the "Mark Ready" button outside the `<form>` for layout flexibility.
- `BottomTabBar` supports all 3 roles with role-specific tab configuration, though only housekeeping uses it as primary navigation.
- Loading state tracked per-room via `loadingRoomId` to show spinner only on the tapped room's button.
- All text in Vietnamese (Phòng cần dọn, Đánh dấu sẵn sàng, Đang cập nhật, etc.).

### File List

- `src/routes/(housekeeping)/+layout.svelte` — CREATED
- `src/routes/(housekeeping)/my-rooms/+page.svelte` — CREATED
- `src/routes/(housekeeping)/my-rooms/+page.server.ts` — CREATED
- `src/lib/components/rooms/HousekeepingRoomCard.svelte` — CREATED
- `src/lib/components/layout/BottomTabBar.svelte` — CREATED
- `src/lib/server/db/rooms.ts` — MODIFIED (added getRoomsNeedingCleaning)
