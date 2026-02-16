# Story 4.1: Log Daily Attendance for All Staff

Status: done

## Story

As a reception staff member,
I want to log the daily attendance value for each staff member in a single session using a simple grid,
So that attendance is recorded accurately every day without maintaining separate spreadsheets.

## Acceptance Criteria

1. **Given** a reception user navigates to the Attendance page **When** the attendance table (`AttendanceTable.svelte`) loads **Then** it displays all active staff members as rows, with the current date's column highlighted and `ShiftInput` selectors for each staff/date cell (FR29, FR33)

2. **Given** a reception user opens the attendance table for today **When** they tap/click a `ShiftInput` cell for any staff member **Then** they can select one of four values: `0` (absent), `0.5` (half shift), `1` (full shift), `1.5` (overtime — max 18 hours) — the value is saved immediately via Form Action `?/logAttendance` (FR29)

3. **Given** multiple staff members need attendance logged in one session **When** reception enters values across multiple rows **Then** each cell auto-saves on selection — no "Save All" button required; reception moves across the grid without losing entries (FR33)

4. **Given** a `ShiftInput` value is submitted **When** Form Action `?/logAttendance` processes **Then** the entry is saved to `attendance_logs` with `staff_id`, `date`, `shift_value`, `logged_by` (staff ID), and `created_at` timestamp

5. **Given** the attendance table loads on mobile (< 768px) **When** the table renders **Then** it supports horizontal scroll — all staff columns remain accessible, rows are full-width

## Tasks / Subtasks

- [x] Task 1: Create attendance DB query functions (AC: #4)
  - [x] 1.1 Implement `getAttendanceByMonth(supabase, year, month)` in `$lib/server/db/attendance.ts` — returns all `attendance_logs` rows for the given month joined with `staff_members.full_name`
  - [x] 1.2 Implement `upsertAttendanceLog(supabase, staff_id, log_date, shift_value, logged_by)` — uses Supabase `upsert` with `onConflict: 'staff_id,log_date'` (UNIQUE constraint) to insert or update
  - [x] 1.3 Implement `getActiveStaff(supabase)` — returns active staff ordered by `full_name`; reuse `getAllStaff` from `$lib/server/db/staff.ts` filtered by `is_active = true`

- [x] Task 2: Create `+page.server.ts` for `(reception)/attendance/` (AC: #1, #2, #3, #4)
  - [x] 2.1 `load` function: fetch active staff list + current month's attendance logs; return both + supervalidated form for `?/logAttendance`
  - [x] 2.2 Form Action `?/logAttendance`: validate with Zod (`AttendanceLogSchema` fields: `staff_id`, `log_date`, `shift_value`), get `logged_by` from session user ID, call `upsertAttendanceLog`, return success/error message
  - [x] 2.3 RBAC: reception can only write today's date; managers can write any date (enforce in action, not just RLS)

- [x] Task 3: Create `AttendanceTable.svelte` component (AC: #1, #3, #5)
  - [x] 3.1 Render a grid: rows = active staff members, columns = days of current week (Mon–Sun visible, scrollable to full month)
  - [x] 3.2 Highlight today's column with a distinct background
  - [x] 3.3 Each cell renders `ShiftInput.svelte` with current value pre-filled from loaded attendance data
  - [x] 3.4 Mobile: table wrapper has `overflow-x-auto` for horizontal scrolling

- [x] Task 4: Create `ShiftInput.svelte` component (AC: #2, #3)
  - [x] 4.1 Dropdown/select with 4 options: `0`, `0.5`, `1`, `1.5` — labelled "Nghỉ", "Nửa ca", "Cả ca", "Tăng ca"
  - [x] 4.2 On value change: auto-submit via enhanced form action `?/logAttendance` — no save button
  - [x] 4.3 Show brief loading indicator during submission; on success update cell optimistically
  - [x] 4.4 Use `<button>` elements for touch targets ≥ 48×48px on mobile

- [x] Task 5: Create `+page.svelte` for `(reception)/attendance/` (AC: #1, #5)
  - [x] 5.1 Import and render `AttendanceTable` with data from `load` function
  - [x] 5.2 Page title: "Chấm công" (Attendance)
  - [x] 5.3 Skeleton loading state using `animate-pulse` placeholders

- [x] Task 6: Write tests (all ACs)
  - [x] 6.1 Unit test for `upsertAttendanceLog` — mock Supabase, verify upsert params including `onConflict`
  - [x] 6.2 Unit test for `getAttendanceByMonth` — mock Supabase, verify date range filter
  - [x] 6.3 Unit test for Zod validation — valid values (0, 0.5, 1, 1.5) pass; invalid values (2, -1, 0.3) fail

## Dev Notes

### Architecture & Patterns (MUST FOLLOW)

- **Server/client boundary:** All DB queries go through `$lib/server/db/attendance.ts` — never call Supabase directly in `.svelte` files
- **Form Actions pattern:** Follow the exact pattern in `(reception)/rooms/+page.server.ts` — use Superforms + Zod adapter (`zod4`), `fail(400)` for validation errors, `message()` for success/error feedback
- **Supabase client:** Use `locals.supabase` (user-scoped, RLS-enforced) for all queries — never use the admin client for attendance
- **Session user ID:** Get via `const { user } = await locals.safeGetSession()` — the `user.id` is the `logged_by` value
- **RBAC for date restriction:** Reception can only write `log_date = today`; manager can write any date. Enforce this in the Form Action before calling the DB — RLS only gates by role, not by date

### Database Schema (already migrated)

- Table: `attendance_logs` — columns: `id` (UUID PK), `staff_id` (FK → staff_members), `log_date` (DATE), `shift_value` (NUMERIC(2,1) CHECK 0/0.5/1/1.5), `logged_by` (FK → staff_members), `created_at`, `updated_at`
- **UNIQUE constraint:** `(staff_id, log_date)` — use `upsert` with `onConflict` to handle re-entries
- RLS policies: SELECT/INSERT for manager+reception; UPDATE for manager only
- Indexes: `idx_attendance_logs_staff_id`, `idx_attendance_logs_log_date`

### Existing Code to Reuse

- `$lib/server/db/staff.ts` → `getAllStaff()` for fetching staff list (filter `is_active: true`)
- `$lib/server/auth.ts` → `requireRole(locals, ['reception', 'manager'])` already used by `(reception)/+layout.server.ts`
- `$lib/db/schema.ts` → `AttendanceLogSchema` already defined with Zod validation
- `$lib/components/attendance/` directory exists (empty `.gitkeep`) — place components here
- `(reception)/attendance/` route directory exists (empty) — place page files here

### Naming Conventions

- Components: `AttendanceTable.svelte`, `ShiftInput.svelte` → `$lib/components/attendance/`
- DB module: `$lib/server/db/attendance.ts` (file exists with placeholder comment)
- Route: `src/routes/(reception)/attendance/+page.server.ts`, `+page.svelte`
- Zod schema: use existing `AttendanceLogSchema` from `$lib/db/schema.ts`
- Form action: `?/logAttendance`

### UX Requirements

- Vietnamese labels: shift options labelled in Vietnamese ("Nghỉ", "Nửa ca", "Cả ca", "Tăng ca")
- Dates: use `Intl.DateTimeFormat('vi-VN')` for all date displays — DD/MM/YYYY format
- Touch targets: ≥ 48×48px on mobile
- Skeleton screens with `animate-pulse` for initial load — no spinners for page load
- Today's column visually highlighted (e.g., `bg-blue-50` or `ring-2 ring-blue-400`)

### Svelte 5 Rules

- Use `$state`, `$derived` for component-local reactivity only
- Do NOT use runes for cross-component shared state — use Svelte Stores if needed
- Superforms handles form state via its own reactive primitives — follow its API

### Project Structure Notes

- App code lives in `manage-smeraldo-hotel/` subfolder within the repo
- All imports use `$lib/` alias — never relative `../../` from `src/`
- Named exports only (no `export default`) except `.svelte` files and config files

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.1]
- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: _bmad-output/project-context.md]
- [Source: manage-smeraldo-hotel/supabase/migrations/00001_initial_schema.sql#L75-86]
- [Source: manage-smeraldo-hotel/supabase/migrations/00002_rls_policies.sql#L116-129]
- [Source: manage-smeraldo-hotel/src/lib/db/schema.ts#L75-87 — AttendanceLogSchema]
- [Source: manage-smeraldo-hotel/src/lib/db/types.ts#L15-59 — attendance_logs type]
- [Source: manage-smeraldo-hotel/src/routes/(reception)/rooms/+page.server.ts — pattern reference]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Amp)

### Debug Log References

### Completion Notes List

- ✅ Implemented `getAttendanceByMonth`, `upsertAttendanceLog`, `getActiveStaff` in `$lib/server/db/attendance.ts`
- ✅ Created `+page.server.ts` with `load` (staff + monthly logs) and `?/logAttendance` Form Action with RBAC date enforcement
- ✅ Created `AttendanceTable.svelte` — full-month grid, today highlighted, sticky columns, horizontal scroll
- ✅ Created `ShiftInput.svelte` — 4-button selector, auto-submit, optimistic updates, 48px touch targets
- ✅ Created `+page.svelte` — Vietnamese title "Chấm công", empty state handling
- ✅ 9 DB unit tests + 4 Zod validation tests, all 97/97 tests passing
- ✅ Code review fixes: z.coerce.number for FormData, RLS-safe insert/update split for reception, Vietnam timezone for date enforcement, explicit role gate, role passed from load, shared types module, $derived.by(), invalidateAll after save

### Change Log

- 2026-02-16: Story 4.1 implemented — all 6 tasks complete
- 2026-02-16: Code review — fixed 9 issues (2 critical, 3 high, 3 medium, 1 low), 97/97 tests pass

### File List

- `manage-smeraldo-hotel/src/lib/types/attendance.ts` (new — shared types)
- `manage-smeraldo-hotel/src/lib/server/db/attendance.ts` (modified)
- `manage-smeraldo-hotel/src/lib/server/db/attendance.test.ts` (new)
- `manage-smeraldo-hotel/src/lib/db/schema.test.ts` (modified)
- `manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.server.ts` (new)
- `manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.svelte` (new)
- `manage-smeraldo-hotel/src/lib/components/attendance/AttendanceTable.svelte` (new)
- `manage-smeraldo-hotel/src/lib/components/attendance/ShiftInput.svelte` (new)
- `manage-smeraldo-hotel/src/lib/components/attendance/.gitkeep` (deleted)
