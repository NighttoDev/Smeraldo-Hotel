# Story 2.3: Room Status Override & Audit Trail

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a reception staff member,
I want to manually override any room's status and have every change logged with my identity and timestamp,
So that I can correct stale or incorrect statuses and maintain a complete history for accountability.

## Acceptance Criteria

1. **Given** a reception user clicks on any room tile **When** the room detail opens **Then** an "Override Status" dialog is visible, allowing selection of any valid status (Trống, Có khách, Trả phòng, Đang dọn, Sẵn sàng) (FR11)

2. **Given** a manager is logged in **When** they view any room **Then** they have the same override capability as reception, with full override authority over any room status (FR16)

3. **Given** any room status change occurs (override, check-in, check-out, housekeeping update) **When** the change is committed to the database **Then** an entry is written to `room_status_logs` with: `room_id`, `previous_status` (`old_status`), `new_status`, `changed_by` (staff ID), `changed_at` (ISO 8601 timestamp) — this table is insert-only, entries cannot be edited or deleted (FR12, NFR-S4)

4. **Given** the override action is destructive **When** a user attempts the override **Then** a confirmation dialog appears ("Đổi trạng thái phòng {room_number}") with radio buttons for new status before the change is committed

## Tasks / Subtasks

- [x] **Task 1: Create Room Status Update DB Functions** (AC: #1, #3)
  - [x] Add `updateRoomStatus(supabase, roomId, newStatus, guestName?)` to `src/lib/server/db/rooms.ts`
  - [x] Clears `current_guest_name` when status is `available` or `ready`
  - [x] Returns updated `RoomRow`
  - [x] Add `insertRoomStatusLog(supabase, roomId, previousStatus, newStatus, changedBy, notes?)` — inserts into immutable `room_status_logs` table

- [x] **Task 2: Create Override Form Action** (AC: #1, #2, #3)
  - [x] In `src/routes/(reception)/rooms/+page.server.ts`:
  - [x] Add `OverrideStatusSchema = z.object({ room_id: z.string().uuid(), new_status: z.enum([...]) })`
  - [x] Add `actions.overrideStatus` — validates with Superforms, fetches current room, calls `updateRoomStatus()`, then `insertRoomStatusLog()` with staff ID from session
  - [x] Returns success/error message via Superforms `message()`
  - [x] `superValidate(zod4(OverrideStatusSchema))` included in `load` for initial form state

- [x] **Task 3: Create `StatusOverrideDialog.svelte` Component** (AC: #1, #4)
  - [x] Create `src/lib/components/rooms/StatusOverrideDialog.svelte`
  - [x] Props: `room: RoomState | null`, `onconfirm: (roomId, newStatus) => void`, `oncancel: () => void`
  - [x] Shows when `room !== null` — modal with backdrop
  - [x] Title: "Đổi trạng thái phòng {room_number}"
  - [x] Current status displayed as subtitle
  - [x] Radio buttons for all statuses except current — styled as selectable cards
  - [x] "Hủy" ghost button + "Xác nhận đổi" primary button (disabled until selection made)
  - [x] `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
  - [x] Backdrop click and Escape key close the dialog

- [x] **Task 4: Integrate Override in Rooms Page** (AC: #1, #2)
  - [x] In `src/routes/(reception)/rooms/+page.svelte`:
  - [x] Add `selectedRoom = $state<RoomState | null>(null)` state
  - [x] `handleRoomClick(roomId)` — sets `selectedRoom` to open dialog
  - [x] `handleOverrideConfirm(roomId, newStatus)` — sets hidden form values and calls `requestSubmit()`
  - [x] `handleOverrideCancel()` — sets `selectedRoom = null`
  - [x] Hidden form with `use:enhance` for `?/overrideStatus` action
  - [x] Success message closes dialog via `onUpdated` callback

## Dev Notes

### Critical Architecture Constraints

- **Form Actions for mutations** — Override uses `?/overrideStatus` Form Action (not REST endpoint). Per architecture: "Use Form Actions for all user-initiated mutations."
- **Audit trail is immutable** — `room_status_logs` has insert-only RLS policy. No UPDATE or DELETE allowed. Every status change creates a new log entry.
- **Confirmation dialog required** — Per UX spec: "only destructive actions get confirmation dialogs." Status override is destructive (changes room state).
- **RBAC: reception + manager** — Both roles can override via `(reception)/` route group which allows `['reception', 'manager']`.
- **Hidden form pattern** — Dialog triggers submission via hidden `<form>` with `use:enhance` to keep Superforms progressive enhancement working while dialog UI is separate.

### Existing Code Reused

- `StatusBadge.svelte` — status display in dialog current status
- `RoomTile.svelte` — `onclick` prop triggers dialog open
- `getRoomById()` — pre-check before status update
- Superforms + Zod validation pattern from Story 1.4

### Database Context

```sql
-- room_status_logs (from 00003_audit_trail.sql)
CREATE TABLE room_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  previous_status room_status,
  new_status room_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: insert-only policy — no UPDATE or DELETE
```

### File Structure

Files created:
```
src/lib/components/rooms/StatusOverrideDialog.svelte   # Override confirmation dialog
```

Files modified:
```
src/lib/server/db/rooms.ts                             # Added updateRoomStatus(), insertRoomStatusLog()
src/routes/(reception)/rooms/+page.server.ts           # Added OverrideStatusSchema + overrideStatus action
src/routes/(reception)/rooms/+page.svelte              # Added override dialog integration
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3] — Acceptance criteria origin
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security] — Immutable audit trail, insert-only RLS
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — Form Actions for mutations
- [Source: _bmad-output/project-context.md#Form Actions] — Superforms + Zod pattern
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Confirmation dialog for destructive actions, button hierarchy

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

None — implementation completed without blocking issues.

### Completion Notes List

- Story created retroactively after implementation was completed.
- `StatusOverrideDialog` is a custom modal (not shadcn-svelte Dialog) since it has a radio-button status selector rather than a simple confirm/cancel pattern.
- Hidden form + `requestSubmit()` pattern used to bridge the dialog UI with Superforms progressive enhancement.
- `$effect` resets `selectedStatus` when dialog opens with a new room.
- Both reception and manager can access override via the `(reception)/` route group which allows both roles.

### File List

- `src/lib/components/rooms/StatusOverrideDialog.svelte` — CREATED
- `src/lib/server/db/rooms.ts` — MODIFIED (added updateRoomStatus, insertRoomStatusLog)
- `src/routes/(reception)/rooms/+page.server.ts` — MODIFIED (added OverrideStatusSchema + overrideStatus action)
- `src/routes/(reception)/rooms/+page.svelte` — MODIFIED (added override dialog integration)
