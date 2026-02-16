# Story 4.3: Manager Attendance Edit

Status: done

## Story

As a manager,
I want to edit any staff member's attendance record for any date,
So that I can correct errors made by reception without data inconsistencies.

## Acceptance Criteria

1. **Given** a manager is viewing the attendance table **When** they click any `ShiftInput` cell (including past dates) **Then** the cell becomes editable and they can change the value to any of the four valid options: `0`, `0.5`, `1`, `1.5` (FR31)

2. **Given** a manager updates an attendance value **When** the change is submitted via Form Action `?/logAttendance` **Then** the `attendance_logs` record is updated with the new value and the `logged_by` manager's staff ID is recorded

3. **Given** a reception-role user views the attendance table **When** they attempt to edit a past date's attendance value **Then** past date cells are read-only for reception — only managers can edit historical attendance (FR31)

4. **Given** any attendance edit request reaches the server **When** the `+page.server.ts` validates the request **Then** RBAC is enforced — reception can only write today's date; managers can write any date (NFR-S3)

## Tasks / Subtasks

- [x] Task 1: Verify existing manager edit functionality works end-to-end (AC: #1, #2, #4)
  - [x] 1.1 Verify `ShiftInput.svelte` already enables all dates when `disabled={false}` (manager path via `isDisabled()` in `AttendanceTable.svelte`)
  - [x] 1.2 Verify `?/logAttendance` Form Action already enforces date RBAC: reception blocked on non-today dates, manager allowed for any date
  - [x] 1.3 Verify `upsertAttendanceLog` in `$lib/server/db/attendance.ts` already uses full `upsert` with `onConflict: 'staff_id,log_date'` for manager (updates existing records)
  - [x] 1.4 Verify `logged_by` is recorded correctly as the manager's user ID on updates

- [x] Task 2: Verify reception past-date restriction works correctly (AC: #3)
  - [x] 2.1 Verify `isDisabled(date)` in `AttendanceTable.svelte` returns `true` for past dates when `userRole !== 'manager'`
  - [x] 2.2 Verify `ShiftInput.svelte` disables all interactions when `disabled={true}` — buttons show `cursor-not-allowed opacity-50`

- [x] Task 3: Add visual feedback for manager edit capability (AC: #1)
  - [x] 3.1 Add a subtle visual indicator on the attendance page when the user is a manager — e.g., a help text below the title: "Bạn có thể chỉnh sửa chấm công mọi ngày" (You can edit attendance for any day)
  - [x] 3.2 Ensure `ShiftInput` hover state is clearly visible for enabled (manager) cells on past dates — verify existing hover styles (`hover:bg-gray-200`) apply correctly

- [x] Task 4: Write tests for manager attendance edit scenarios (all ACs)
  - [x] 4.1 Unit test: `AttendanceTable` `isDisabled()` logic — manager returns `false` for any date; reception returns `true` for past dates, `false` for today
  - [x] 4.2 Unit test: `upsertAttendanceLog` manager path — verify upsert with `onConflict` is called (test already exists, verify coverage)
  - [x] 4.3 Unit test: `+page.server.ts` `?/logAttendance` — manager can submit for past date; reception blocked for past date (server-side RBAC test)
  - [x] 4.4 Verify all existing tests still pass (no regressions)

## Dev Notes

### Architecture & Patterns (MUST FOLLOW)

- **Server/client boundary:** All DB queries go through `$lib/server/db/attendance.ts` — never call Supabase directly in `.svelte` files
- **Form Actions pattern:** Use existing `?/logAttendance` Form Action — DO NOT create a separate action for manager edits
- **Supabase client:** Use `locals.supabase` (user-scoped, RLS-enforced) — never admin client
- **RBAC:** `(reception)/+layout.server.ts` already enforces `['reception', 'manager']` — no extra route-level role gate needed
- **Date RBAC in Form Action:** Already implemented — reception can only write `log_date === getTodayVN()`; manager can write any date

### What Already Exists (DO NOT RECREATE)

- **`ShiftInput.svelte`** — already accepts `disabled` prop; auto-submits via `?/logAttendance` Form Action with `use:enhance`
- **`AttendanceTable.svelte`** — `isDisabled(date)` already returns `false` for manager (all dates editable), `true` for reception past dates
- **`+page.server.ts` load function** — already passes `role: locals.userRole` to page data
- **`+page.server.ts` `?/logAttendance` action** — already enforces reception date restriction (only today in Vietnam TZ); managers bypass this check
- **`upsertAttendanceLog()`** — already uses full `upsert` with `onConflict` for managers; insert-first with update fallback for reception
- **`+page.svelte`** — already passes `userRole={data.role ?? ''}` to `AttendanceTable`
- **RLS policies** — `attendance_logs`: SELECT/INSERT for manager+reception; UPDATE for manager only

### Key Insight

**Most of Story 4.3 is already implemented as part of Stories 4.1 and 4.2.** The `ShiftInput` component, `isDisabled()` logic, `?/logAttendance` RBAC enforcement, and `upsertAttendanceLog` manager path were all built to handle the manager edit use case from the start. This story primarily needs:
1. **Verification** that the existing code correctly satisfies all acceptance criteria
2. **Minor UI polish** — help text for manager users indicating edit capability
3. **Targeted tests** confirming the manager-specific behavior paths

### What Needs to Be Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `src/routes/(reception)/attendance/+page.svelte` | **MODIFY** | Add manager help text |
| `src/lib/components/attendance/AttendanceTable.test.ts` | **CREATE** | Test `isDisabled()` logic for manager vs reception |
| `src/routes/(reception)/attendance/+page.server.test.ts` | **CREATE** | Test RBAC enforcement in Form Action |

### Naming Conventions

- Tests: co-located `*.test.ts` next to source file
- No new components needed — reuse existing ShiftInput, AttendanceTable

### UX Requirements

- Manager help text in Vietnamese: "Bạn có thể chỉnh sửa chấm công mọi ngày"
- Help text should only appear for manager role — not reception
- No additional UI changes needed — existing ShiftInput UI is sufficient

### Svelte 5 Rules

- Use `$state`, `$derived` for component-local reactivity only
- Do NOT use runes for cross-component shared state — use Svelte Stores if needed
- Use `$props()` for component inputs
- `$derived.by()` for function-form derived values

### Story 4.1 & 4.2 Learnings (APPLY THESE)

- FormData sends strings — use `z.coerce` for numeric fields in Zod schemas
- RLS: reception has INSERT but not UPDATE on `attendance_logs` — insert-first pattern
- Always pass `userRole` from load function — never default to a role in components
- Use `invalidateAll()` after form submissions to refresh page data
- Use `Intl.DateTimeFormat` with `en-CA` format + `Asia/Ho_Chi_Minh` timezone for YYYY-MM-DD server dates
- Use `$derived.by()` for complex derived computations

### Project Structure Notes

- App code lives in `manage-smeraldo-hotel/` subfolder within the repo
- All imports use `$lib/` alias — never relative `../../` from `src/`
- Named exports only (no `export default`) except `.svelte` files and config files

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.3]
- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: _bmad-output/project-context.md]
- [Source: manage-smeraldo-hotel/src/lib/components/attendance/ShiftInput.svelte — existing auto-submit with disabled prop]
- [Source: manage-smeraldo-hotel/src/lib/components/attendance/AttendanceTable.svelte — existing isDisabled() logic]
- [Source: manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.server.ts — existing RBAC in ?/logAttendance]
- [Source: manage-smeraldo-hotel/src/lib/server/db/attendance.ts — existing upsertAttendanceLog with manager upsert path]
- [Source: _bmad-output/implementation-artifacts/4-1-log-daily-attendance-for-all-staff.md — Story 4.1 learnings]
- [Source: _bmad-output/implementation-artifacts/4-2-monthly-attendance-calculation-summary-report.md — Story 4.2 learnings]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Amp)

### Debug Log References

### Completion Notes List

- ✅ Verified existing manager edit functionality: ShiftInput enables all dates for managers, Form Action RBAC allows any date for managers, upsertAttendanceLog uses full upsert with onConflict for managers, logged_by captures manager user ID
- ✅ Verified reception past-date restriction: isDisabled() returns true for non-today dates, ShiftInput shows cursor-not-allowed opacity-50 when disabled
- ✅ Added manager help text "Bạn có thể chỉnh sửa chấm công mọi ngày" on attendance page (only visible to managers)
- ✅ Created 7 unit tests for isDisabled() logic (manager vs reception vs other roles)
- ✅ Created 8 unit tests for RBAC date enforcement (deterministic with fixed dates)
- ✅ Code review fixes: removed unused `vi` import, fixed misleading test description for non-manager roles, made tests deterministic (fixed dates instead of real clock), added clarifying JSDoc comments
- ✅ 127/127 total tests passing, 0 type errors

### Change Log

- 2026-02-16: Story 4.3 implemented — all 4 tasks complete. Most functionality already built in Stories 4.1/4.2; added manager help text + 15 new tests.
- 2026-02-16: Code review fixes — deterministic tests, accurate descriptions, removed unused imports.

### File List

- `manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.svelte` (modified — added manager help text)
- `manage-smeraldo-hotel/src/lib/components/attendance/AttendanceTable.test.ts` (new — 7 isDisabled tests)
- `manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.server.test.ts` (new — 9 RBAC tests)
