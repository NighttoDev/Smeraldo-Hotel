# Story 3.4: Booking Management — Edit & Cancel

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a reception staff member,
I want to edit the details of an existing booking or cancel it when needed,
so that I can correct errors and handle cancellations without creating data inconsistencies.

## Acceptance Criteria

1. **Given** a booking exists in the system **When** reception navigates to the booking detail at `(reception)/bookings/[bookingId]` **Then** they can edit guest name, check-in/out dates, booking source, and room assignment — all fields are pre-populated (FR21)

2. **Given** reception submits an edited booking **When** Form Action `?/submit` processes the update **Then** the `bookings` table is updated, nights are recalculated automatically, and the room diagram reflects any status changes

3. **Given** reception or manager clicks "Cancel Booking" **When** the cancellation confirmation dialog appears ("Cancel this booking for [Guest]?") **Then** the booking is marked cancelled in the database, the room status returns to "Available" when applicable, and the cancellation is logged (FR22)

4. **Given** a manager is logged in **When** they access any booking **Then** they can view, edit, and cancel any booking regardless of which staff member created it (FR24)

## Tasks / Subtasks

- [ ] **Task 1: Add booking detail/list/edit/cancel DB helpers** (AC: #1, #2, #3)
  - [ ] Add `getBookingDetailById(supabase, bookingId)` in `$lib/server/db/bookings.ts` — join `bookings` + `guests` + `rooms` and return a detail row for the edit page
  - [ ] Add `getBookingListItems(supabase)` in `$lib/server/db/bookings.ts` — join guest + room fields for `(reception)/bookings` list page (replaces Story 3.1 placeholder)
  - [ ] Add `updateBookingById(supabase, bookingId, updates)` in `$lib/server/db/bookings.ts` — updates editable booking fields (`room_id`, `check_in_date`, `check_out_date`, `booking_source`) only
  - [ ] Add `cancelBookingById(supabase, bookingId)` in `$lib/server/db/bookings.ts` — sets `status = 'cancelled'`
  - [ ] Add `updateGuestNameById(supabase, guestId, fullName)` in `$lib/server/db/guests.ts` (or equivalent helper) for booking edit flow

- [ ] **Task 2: Add form schemas for booking edit & cancellation** (AC: #1, #2, #3)
  - [ ] Add `UpdateBookingFormSchema` to `$lib/db/schema.ts` (pre-populated edit form) with `booking_id`, `guest_id`, `guest_name`, `room_id`, `check_in_date`, `check_out_date`, `booking_source`, `is_long_stay`, `duration_days`
  - [ ] Reuse the same long-stay validation behavior from Story 3.1 (`duration_days >= 30`, otherwise `check_out_date > check_in_date`)
  - [ ] Add `CancelBookingSchema` with `booking_id`, `room_id`, `guest_name` (for confirmation dialog + server tamper checks)
  - [ ] Export `UpdateBookingForm` and `CancelBooking` types

- [ ] **Task 3: Enhance bookings list page to show real bookings + detail links** (AC: #1, #4)
  - [ ] Update `src/routes/(reception)/bookings/+page.server.ts` load to fetch `getBookingListItems(locals.supabase)` instead of placeholder `[]`
  - [ ] Update `src/routes/(reception)/bookings/+page.svelte` to render a real list/table (guest, room, dates, source, status) with link/button to `/bookings/[bookingId]`
  - [ ] Keep the existing success banner (`?created=1`) from Story 3.1 intact
  - [ ] Ensure manager users (via `(reception)` route group) see the same list and can open any booking (FR24)

- [ ] **Task 4: Create booking detail route `(reception)/bookings/[bookingId]`** (AC: #1, #2, #3, #4)
  - [ ] Create `src/routes/(reception)/bookings/[bookingId]/+page.server.ts`
  - [ ] `load`: fetch booking detail + active rooms (`getActiveRoomsForBooking`) + initialize `UpdateBookingFormSchema` and `CancelBookingSchema` superforms with current values
  - [ ] Add Form Action `?/submit` to validate + update guest name + update booking fields + return Superforms `message()` success/error (no full page reload)
  - [ ] Add Form Action `?/cancel` with explicit confirmation schema validation, booking ownership/status validation, `status -> 'cancelled'`, and room status update/logging when needed
  - [ ] Return 404 when `bookingId` is not found

- [ ] **Task 5: Create booking detail UI + cancel confirmation dialog** (AC: #1, #2, #3)
  - [ ] Create `src/routes/(reception)/bookings/[bookingId]/+page.svelte` with pre-populated edit form UI (reuse booking form field patterns and Vietnamese labels)
  - [ ] Reuse `GuestInput.svelte` and source/date/room form patterns from `BookingForm.svelte` to avoid duplicate UX behavior
  - [ ] Add explicit cancel confirmation dialog with guest name in prompt: "Hủy đặt phòng của [Guest]?" and a labeled destructive button (not generic "OK")
  - [ ] Disable submit/cancel buttons while processing and show spinner/loading label
  - [ ] Show field-level validation errors on blur + server message banners using Superforms pattern

- [ ] **Task 6: Handle room status side effects safely on edit/cancel** (AC: #2, #3)
  - [ ] On edit: if room assignment/date changes affect an active occupied booking, validate and apply room updates carefully (or block invalid edits with clear error) so the room diagram never shows stale guest/room state
  - [ ] On cancel: if the booking currently occupies a room, call `updateRoomStatus(..., 'available')` and clear guest name, then write `insertRoomStatusLog(...)` with cancellation note (FR22, NFR-S4)
  - [ ] If the booking is not occupying a room, avoid unnecessary room status writes (room may already be `available`/`ready`) while still recording cancellation via booking status update

- [ ] **Task 7: Tests (all ACs)**
  - [ ] `src/lib/server/db/bookings.test.ts` — add tests for `getBookingDetailById`, `getBookingListItems`, `updateBookingById`, `cancelBookingById`
  - [ ] `src/lib/server/db/guests.test.ts` — add/update tests for guest name update helper
  - [ ] `src/lib/db/schema.test.ts` — add tests for `UpdateBookingFormSchema` and `CancelBookingSchema` (valid edit, invalid UUIDs, date validation, long-stay validation)
  - [ ] Route/server action tests (or focused action unit tests) for `(reception)/bookings/[bookingId]/+page.server.ts`: not found, validation failure, successful edit, successful cancel, manager access path

## Dev Notes

### Critical Architecture Constraints

- **Server/client boundary:** All DB writes/reads must stay in `$lib/server/db/*` and `+page.server.ts`. Do NOT import server DB modules into `.svelte` files.
- **`nights_count` is DB-generated:** Never write `nights_count` manually during edit. Updating `check_in_date` / `check_out_date` should let Postgres recalculate it automatically (FR20).
- **Booking status values are TEXT (not enum):** Use exact strings only — `'confirmed'`, `'checked_in'`, `'checked_out'`, `'cancelled'`.
- **Superforms + zod4 project standard:** Use `superValidate` / `message` / `fail` with `zod4` adapter (same pattern as room check-in/check-out stories).
- **RBAC is already inherited:** `(reception)/+layout.server.ts` allows `reception` and `manager`, so Story 3.4 detail route automatically supports manager access (FR24). No extra route group is needed.
- **Destructive confirmation must be explicit:** Cancel action must use a labeled confirmation button (e.g., `Có, hủy đặt phòng`) — not generic `OK` (UX dialog rule).
- **Room status side effects must be conservative:** A booking edit/cancel should not silently produce invalid room states. Validate current booking/room status first, then apply `updateRoomStatus()` + `insertRoomStatusLog()` only when a real room state transition is required.
- **No redirect required for edit/cancel detail form:** Prefer same-page Superforms success/error messaging (consistent with Stories 3.2 and 3.3). If cancellation returns to list page, use explicit redirect intentionally and keep UX feedback visible.

### Existing Code to Reuse (do NOT reinvent)

| Function/Component | Location | Usage |
|--------------------|----------|-------|
| `BookingForm.svelte` | `src/lib/components/bookings/BookingForm.svelte` | Reuse field layout/labels/long-stay UX patterns |
| `GuestInput.svelte` | `src/lib/components/bookings/GuestInput.svelte` | Reuse guest name field UI |
| `CreateBookingFormSchema` | `src/lib/db/schema.ts` | Reference for edit schema validation + long-stay logic |
| `createBooking()` / `getBookingById()` / `getAllBookings()` | `src/lib/server/db/bookings.ts` | Extend with detail/list/edit/cancel helpers |
| `createGuest()` / `getGuestById()` | `src/lib/server/db/guests.ts` | Add/update guest-name helper for edit action |
| `getActiveRoomsForBooking()` | `src/lib/server/db/rooms.ts` | Room selector options on edit page |
| `updateRoomStatus()` | `src/lib/server/db/rooms.ts` | Apply room status changes when cancellation affects room state |
| `insertRoomStatusLog()` | `src/lib/server/db/rooms.ts` | Audit trail logging for room state change on cancel |
| `CheckOutDialog.svelte` | `src/lib/components/bookings/CheckOutDialog.svelte` | Two-step destructive dialog pattern |
| `rooms/+page.server.ts` | `src/routes/(reception)/rooms/+page.server.ts` | Form action validation + ownership/idempotency guard patterns |

### Suggested Data Shapes (client-safe shared types)

If list/detail pages need joined fields not covered by `BookingWithGuest`, add a shared type in a client-safe module (e.g. `$lib/db/schema.ts` or `$lib/types/bookings.ts`) such as:

- `BookingListItem` — booking row + `guest.full_name` + `room.room_number`
- `BookingDetail` — booking row + guest info + room info used to prefill forms

Keep shared types out of `$lib/server/` so `.svelte` files can import them safely.

### Edit/Cancel Validation Guidance (prevent inconsistencies)

- **Tamper checks:** Validate `booking_id` and `room_id` hidden fields against DB row (`getBookingById`) before updating/canceling (same pattern as Story 3.3).
- **Status checks before edit:** Reject edits for terminal bookings (`cancelled`, `checked_out`) unless explicitly supported by product decision.
- **Active occupancy caution:** If a booking is already `checked_in`, changing `room_id` can desync the room diagram unless both room rows are updated atomically-ish. For MVP, either:
  - block room reassignment for `checked_in` bookings with a clear error, or
  - implement both room updates + audit logs carefully and document the compensating rollback strategy.
- **Cancellation + room cleanup:** If cancellation affects an occupied room, clear `current_guest_name` and transition room status with audit logging. If not occupied, avoid unnecessary room writes.

### Booking List Page (Story 3.1 follow-through)

Story 3.1 intentionally shipped a placeholder bookings page. Story 3.4 should replace it with a real list so staff can discover and open existing bookings for edit/cancel operations.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.4] — Story + acceptance criteria
- [Source: _bmad-output/implementation-artifacts/3-1-create-a-new-booking.md] — Booking form patterns, long-stay handling, route structure
- [Source: _bmad-output/implementation-artifacts/3-2-guest-check-in-flow.md] — Superforms action patterns, ownership checks, room/booking consistency notes
- [Source: _bmad-output/implementation-artifacts/3-3-guest-check-out-flow.md] — Destructive confirmation dialog pattern, room status + audit trail handling
- [Source: manage-smeraldo-hotel/src/routes/(reception)/bookings/+page.server.ts] — Placeholder list page to enhance in this story
- [Source: manage-smeraldo-hotel/src/routes/(reception)/bookings/+page.svelte] — Existing list shell + success banner
- [Source: manage-smeraldo-hotel/src/routes/(reception)/bookings/new/+page.server.ts] — `dateInVN()` and booking form action conventions
- [Source: manage-smeraldo-hotel/src/lib/components/bookings/BookingForm.svelte] — Reusable field UX patterns
- [Source: manage-smeraldo-hotel/src/lib/server/db/bookings.ts] — Existing booking query/update helpers
- [Source: manage-smeraldo-hotel/src/lib/server/db/rooms.ts] — `updateRoomStatus()`, `insertRoomStatusLog()` for cancellation side effects

## Dev Agent Record

### Agent Model Used

Amp

### Debug Log References

### Completion Notes List

### File List
