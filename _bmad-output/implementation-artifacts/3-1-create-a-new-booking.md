# Story 3.1: Create a New Booking

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a reception staff member,
I want to create a new booking with guest name, room, check-in/out dates, and booking source,
So that every arrival is recorded in the system before the guest shows up, replacing manual Excel entry.

## Acceptance Criteria

1. **Given** a reception user navigates to Bookings → New Booking **When** the booking form (`BookingForm.svelte`) loads **Then** it presents fields for: guest name (text input via `GuestInput.svelte`), room selection (dropdown of all available rooms), check-in date (defaults to today), check-out date (defaults to tomorrow), and booking source (Select: Agoda / Booking.com / Trip.com / Facebook / Walk-in) (FR17)

2. **Given** a reception user fills in the booking form and submits **When** Form Action `?/submit` processes the request **Then** a `guests` record is created first, then a `bookings` record is saved to the `bookings` table with `created_by` staff ID; `nights_count` is DB-generated automatically from `check_out_date - check_in_date` (FR20, FR25)

3. **Given** the booking source is OTA (Agoda, Booking.com, Trip.com) **When** OTA booking data is available **Then** the guest name field is pre-populated — in this MVP, the field is pre-filled but editable, reception confirms rather than types (FR26)

4. **Given** the booking source is Facebook or Walk-in **When** the form is displayed **Then** the guest name field is empty and required — reception manually enters it via `GuestInput.svelte` (FR27)

5. **Given** a form field fails validation (e.g., check-out before/equal to check-in, guest name empty, room not selected) **When** the field loses focus **Then** a specific error message appears below that field — full re-validation runs on submit; the form uses `sveltekit-superforms` + `zod4` adapter (Superforms validation pattern)

6. **Given** the booking is for an apartment-type room (room_type `LIKE '%apartment%'`) **When** the long-stay toggle "Long stay — 30+ dias" is enabled **Then** a `duration_days` numeric field appears inline and check_out_date is computed as `check_in_date + duration_days`; minimum duration is 30 days (FR23)

7. **Given** the booking is successfully created **When** the Form Action completes **Then** the user is redirected to `(reception)/bookings/` and a success toast is shown

## Tasks / Subtasks

- [x] **Task 1: Implement `createGuest()` and `createBooking()` server DB functions** (AC: #2)
  - [x]Create `src/lib/server/db/guests.ts` — implement `createGuest(data: GuestInsert): Promise<Guest>` using Supabase client from `src/lib/server/supabase.ts`
  - [x]Implement `createBooking()` in `src/lib/server/db/bookings.ts` — signature: `createBooking(data: BookingInsert): Promise<Booking>` — do NOT insert `nights_count` (it is `GENERATED ALWAYS`)
  - [x]Add `getActiveRoomsForBooking()` to `src/lib/server/db/rooms.ts` — returns all rooms with status `available` or `ready` for the room selector (query `rooms` table, ordered by `floor`, `room_number`)

- [x] **Task 2: Add `CreateBookingFormSchema` to `src/lib/db/schema.ts`** (AC: #5, #6)
  - [x]Add form-specific Zod schema for Superforms validation (separate from DB `BookingSchema`):
    ```typescript
    export const CreateBookingFormSchema = z.object({
      guest_name: z.string().min(1, { error: 'Tên khách không được để trống' }),
      room_id: z.string().uuid({ error: 'Vui lòng chọn phòng' }),
      check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Ngày check-in không hợp lệ' }),
      check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Ngày check-out không hợp lệ' }),
      booking_source: BookingSourceSchema,
      is_long_stay: z.boolean().optional().default(false),
      duration_days: z.number().int().min(30).optional()
    }).refine(
      (data) => !data.is_long_stay
        ? data.check_out_date > data.check_in_date
        : (data.duration_days ?? 0) >= 30,
      { error: 'Ngày check-out phải sau ngày check-in (hoặc thời gian lưu trú phải ≥ 30 ngày)', path: ['check_out_date'] }
    );
    export type CreateBookingForm = z.infer<typeof CreateBookingFormSchema>;
    ```

- [x] **Task 3: Create booking routes** (AC: #1, #7)
  - [x]Create `src/routes/(reception)/bookings/+page.svelte` — minimal booking list page (placeholder — just a heading + "New Booking" button for this story; full list in Story 3.4)
  - [x]Create `src/routes/(reception)/bookings/+page.server.ts` — `load` returns empty bookings array for now (will be enhanced in 3.4); add to manager nav too
  - [x]Create `src/routes/(reception)/bookings/new/+page.svelte` — renders `<BookingForm {rooms} {form} />`; imports Superforms client helpers
  - [x]Create `src/routes/(reception)/bookings/new/+page.server.ts`:
    - `load`: calls `getActiveRoomsForBooking()`, creates Superforms initial state via `superValidate(zod4(CreateBookingFormSchema))`; sets `check_in_date` default to today, `check_out_date` default to tomorrow (ISO format)
    - Form Action `?/submit`: validate with `superValidate`, on error return `fail(400, { form })`; on success call `createGuest({ full_name: form.data.guest_name })` then `createBooking({ room_id, guest_id, check_in_date, check_out_date, booking_source, created_by })`, compute `check_out_date` from `check_in_date + duration_days` when `is_long_stay`; redirect to `(reception)/bookings/` on success

- [x] **Task 4: Create `BookingForm.svelte` component** (AC: #1, #3, #4, #5, #6)
  - [x]Create `src/lib/components/bookings/BookingForm.svelte`
  - [x]Props: `rooms: Array<{id, room_number, floor, room_type}>`, `form: SuperValidated<CreateBookingForm>`
  - [x]Uses Superforms: `const { form: formData, errors, enhance, submitting } = superForm(form, { validators: zod4(CreateBookingFormSchema) })`
  - [x]Field: `GuestInput` — text input bound to `$formData.guest_name`, error from `$errors.guest_name`
  - [x]Field: Room selector — `<select bind:value={$formData.room_id}>` listing all rooms as "F{floor} — {room_number} ({room_type})"; shows error from `$errors.room_id`
  - [x]Field: Check-in date — `<input type="date">`, defaults to today
  - [x]Field: Check-out date — hidden when `$formData.is_long_stay`, defaults to tomorrow
  - [x]Field: Booking source — `<select>` with options Agoda / Booking.com / Trip.com / Facebook / Walk-in (values: `agoda`, `booking_com`, `trip_com`, `facebook`, `walk_in`)
  - [x]Long-stay toggle: `<input type="checkbox" bind:checked={$formData.is_long_stay}>` — when checked, hides `check_out_date` and shows `duration_days` (number input, min=30); auto-disables for non-apartment rooms
  - [x]Submit button: disabled + spinner when `$submitting`; label "Tạo đặt phòng"
  - [x]Validation: all field errors shown below each field on blur via Superforms `blur` strategy

- [x] **Task 5: Create `GuestInput.svelte` component** (AC: #1, #3, #4)
  - [x]Create `src/lib/components/bookings/GuestInput.svelte`
  - [x]Props: `value: string` (bindable), `error?: string`, `placeholder?: string`
  - [x]Simple text input with label "Tên khách", error message slot below
  - [x]Minimum 48×48px touch target on mobile (Tailwind `h-12 py-3`)

- [x] **Task 6: Add Bookings nav link** (AC: #1)
  - [x]Add "Bookings" (`/bookings`) link to `TopNavbar.svelte` for reception and manager roles
  - [x]Add to `BottomTabBar.svelte` for mobile (reception only — housekeeping cannot access)

- [x] **Task 7: Unit tests** (AC: all)
  - [x]`src/lib/server/db/bookings.test.ts` — mock Supabase client; test `createBooking()`: success case, duplicate room check, invalid dates; do NOT hit real DB
  - [x]`src/lib/server/db/guests.test.ts` — mock Supabase client; test `createGuest()`: success case, empty name validation
  - [x]`src/lib/db/schema.test.ts` additions — test `CreateBookingFormSchema`: valid OTA booking, valid walk-in, check-out before check-in (error), long-stay < 30 days (error), long-stay ≥ 30 days (pass)

## Dev Notes

### Critical Architecture Constraints

- **`bookings.ts` and `guests.ts` are server-only** — in `src/lib/server/db/`. Do NOT import from `.svelte` files — SvelteKit build will fail. All queries go through `+page.server.ts` load/actions.
- **`nights_count` is GENERATED ALWAYS** in Postgres (`check_out_date - check_in_date` STORED). **NEVER include it in INSERT statements** — Postgres will throw `ERROR: column "nights_count" is a generated column`.
- **Booking source enum values** (from `00001_initial_schema.sql`): `'agoda'`, `'booking_com'`, `'trip_com'`, `'facebook'`, `'walk_in'` — match these exactly in Zod and UI labels.
- **`booking_source` is a Postgres ENUM** not a TEXT column — insert as a raw string matching the enum value exactly.
- **Two-step insertion**: Create `guests` record first → get `guest_id` → create `bookings` record with that `guest_id`. This is a single Form Action, not split across two requests.
- **No Realtime update at booking creation** — room status does NOT change at booking creation. Room → Occupied transition happens at check-in (Story 3.2). Do NOT call `updateRoomStatus()` or `insertRoomStatusLog()` in this story.
- **RBAC gate**: `(reception)/+layout.server.ts` already gates this route to reception and manager roles. No additional gate needed for the booking form.
- **Superforms + zod4**: Use `import { superValidate, fail } from 'sveltekit-superforms'` and `import { zod4 } from 'sveltekit-superforms/adapters'` (project uses superforms 2.29.1 + zod4 adapter, NOT the old `zod` adapter).

### Zod v4 Enum Pattern (CRITICAL)

```typescript
// CORRECT — zod v4 style
export const BookingSourceSchema = z.enum(['agoda', 'booking_com', 'trip_com', 'facebook', 'walk_in'], {
  error: 'Nguồn đặt phòng không hợp lệ'
});
// BookingSourceSchema already exists in schema.ts — import it, do NOT redefine
```

### Existing Code to Reuse (do NOT reinvent)

- `src/lib/db/schema.ts` — `BookingSourceSchema`, `BookingSchema`, `GuestSchema`, `CreateBookingFormSchema` (to be added)
- `src/lib/server/db/rooms.ts` — `getAllRooms()` exists; add `getActiveRoomsForBooking()` here (filter by `available` / `ready` status)
- `src/lib/server/db/bookings.ts` — stub file exists (`// Booking database queries — Story 3.x`); implement functions here
- `src/routes/(reception)/rooms/+page.server.ts` — reference pattern for `load()` + Form Action with Superforms
- `src/lib/components/layout/TopNavbar.svelte` — add bookings nav link here (pattern exists from Epic 2 work)

### Supabase Insert Pattern (from rooms.ts convention)

```typescript
// src/lib/server/db/guests.ts
import { createServerClient } from '$lib/server/supabase';
import type { RequestEvent } from '@sveltejs/kit';

export async function createGuest(
  event: RequestEvent,
  data: { full_name: string; phone?: string; email?: string; notes?: string }
) {
  const supabase = createServerClient(event);
  const { data: guest, error } = await supabase
    .from('guests')
    .insert({ full_name: data.full_name, phone: data.phone ?? null, email: data.email ?? null, notes: data.notes ?? null })
    .select()
    .single();
  if (error) throw new Error(`createGuest failed: ${error.message}`);
  return guest;
}
```

```typescript
// src/lib/server/db/bookings.ts
export async function createBooking(
  event: RequestEvent,
  data: {
    room_id: string;
    guest_id: string;
    check_in_date: string; // YYYY-MM-DD
    check_out_date: string; // YYYY-MM-DD
    booking_source: BookingSource;
    created_by: string;
  }
) {
  const supabase = createServerClient(event);
  // ⚠️ Do NOT include nights_count — it is GENERATED ALWAYS
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert({
      room_id: data.room_id,
      guest_id: data.guest_id,
      check_in_date: data.check_in_date,
      check_out_date: data.check_out_date,
      booking_source: data.booking_source,
      status: 'confirmed',
      created_by: data.created_by
    })
    .select()
    .single();
  if (error) throw new Error(`createBooking failed: ${error.message}`);
  return booking;
}
```

### Date Handling

- All dates in the DB are `DATE` columns — use `YYYY-MM-DD` string format (ISO 8601 date-only)
- Default check_in_date: `new Date().toISOString().split('T')[0]`
- Default check_out_date: `new Date(Date.now() + 86400000).toISOString().split('T')[0]`
- Long-stay check_out: add `duration_days * 86400000` ms to check_in date
- NEVER use `Intl.DateTimeFormat('vi-VN')` for DB/API dates — only use it for DISPLAY

### Booking Form Redirect After Success

```typescript
// In +page.server.ts Form Action after successful creation:
import { redirect } from '@sveltejs/kit';
throw redirect(303, '/(reception)/bookings');
```

### Long-Stay Logic

```typescript
// Compute check_out_date for long-stay in Form Action
let checkOutDate = form.data.check_out_date;
if (form.data.is_long_stay && form.data.duration_days) {
  const checkIn = new Date(form.data.check_in_date);
  checkIn.setDate(checkIn.getDate() + form.data.duration_days);
  checkOutDate = checkIn.toISOString().split('T')[0];
}
```

### File Structure

New files to create:
```
src/lib/server/db/guests.ts                          # createGuest()
src/lib/components/bookings/BookingForm.svelte       # Main booking form component
src/lib/components/bookings/GuestInput.svelte        # Guest name input component
src/routes/(reception)/bookings/+page.svelte         # Bookings list (minimal placeholder)
src/routes/(reception)/bookings/+page.server.ts      # Load (empty list for now)
src/routes/(reception)/bookings/new/+page.svelte     # New booking page
src/routes/(reception)/bookings/new/+page.server.ts  # Load rooms + ?/submit action
src/lib/server/db/bookings.test.ts                   # Unit tests
src/lib/server/db/guests.test.ts                     # Unit tests
```

Files to modify:
```
src/lib/server/db/bookings.ts          # Implement createBooking(), getBookingsByRoom()
src/lib/server/db/rooms.ts             # Add getActiveRoomsForBooking()
src/lib/db/schema.ts                   # Add CreateBookingFormSchema
src/lib/components/layout/TopNavbar.svelte   # Add Bookings nav link
src/lib/components/layout/BottomTabBar.svelte # Add Bookings tab (reception only)
```

### Project Structure Notes

- `CreateBookingFormSchema` is the Superforms validation schema (form input shape) — separate from the DB `BookingSchema` (DB row shape). Both live in `schema.ts`.
- `BookingForm.svelte` follows `PascalCase.svelte` convention in `src/lib/components/bookings/`
- `GuestInput.svelte` is scoped to bookings but will be reused in Stories 3.2 and 3.5 for check-in dialog
- Route `(reception)/bookings/new/` follows SvelteKit convention — no `[id]` param needed for creation
- Tests follow co-located pattern: `*.test.ts` next to source file

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.1] — Full acceptance criteria and FR mapping
- [Source: _bmad-output/planning-artifacts/architecture.md#Backend Architecture] — `(reception)/bookings/` route + `BookingForm.svelte` named explicitly
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Schema] — `bookings`, `guests` table structure and relationships
- [Source: _bmad-output/planning-artifacts/architecture.md#Form Actions] — Superforms + Zod for all mutations
- [Source: manage-smeraldo-hotel/supabase/migrations/00001_initial_schema.sql] — Exact column names, `nights_count GENERATED ALWAYS`, `booking_source` enum values
- [Source: manage-smeraldo-hotel/src/lib/db/schema.ts] — Existing `BookingSchema`, `GuestSchema`, `BookingSourceSchema` — import these, do not redefine
- [Source: manage-smeraldo-hotel/src/lib/server/db/rooms.ts] — Supabase query pattern to follow
- [Source: _bmad-output/implementation-artifacts/2-5-real-time-room-status-sync-across-all-sessions.md] — Superforms + Form Action pattern from previous story
- [Source: _bmad-output/project-context.md#Form Actions] — "Use Form Actions for all user-initiated mutations" and "Always pair with Superforms + Zod"
- [Source: _bmad-output/project-context.md#Tech Stack Rules] — `zod4` adapter from `sveltekit-superforms/adapters`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

### Completion Notes List

### File List
