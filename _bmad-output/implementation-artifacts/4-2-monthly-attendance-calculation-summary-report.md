# Story 4.2: Monthly Attendance Calculation & Summary Report

Status: done

## Story

As a manager,
I want to view the automatically calculated total days worked per staff member for any month and navigate between months,
So that I have accurate attendance data for payroll and performance review without any manual calculation.

## Acceptance Criteria

1. **Given** attendance values have been logged for the current month **When** a manager navigates to the Attendance page and selects a month via `MonthPicker` **Then** the table displays all days in that month as columns, all active staff as rows, and each cell shows the logged shift value (FR31, FR32)

2. **Given** a month's attendance data is displayed **When** the table renders the summary column **Then** each staff member's total days worked is auto-calculated as the sum of all shift values for that month (e.g., 21 × 1 + 2 × 0.5 = 22.0 days) — displayed prominently at the end of each row (FR30, FR32)

3. **Given** a manager selects any past month **When** the `MonthPicker` changes the selected month **Then** the table reloads with that month's data — the switch completes in < 500ms via URL search params update (NFR-P4)

4. **Given** the attendance page loads **When** the `MonthPicker` renders **Then** it defaults to the current month and allows one-tap navigation to previous/next months, plus a dropdown for selecting any past month within the current year

5. **Given** a reception user views the attendance page **When** the page loads **Then** they also see the MonthPicker and can browse historical months (read-only for past dates — already enforced by Story 4.1 ShiftInput disable logic)

## Tasks / Subtasks

- [x] Task 1: Create `MonthPicker.svelte` component (AC: #3, #4)
  - [x] 1.1 Create `$lib/components/attendance/MonthPicker.svelte` — prev/next chevron buttons + month/year label in Vietnamese ("Tháng 2, 2026")
  - [x] 1.2 On month change: update URL search params (`?year=YYYY&month=MM`) via `goto()` with `invalidateAll` — triggers `+page.server.ts` reload
  - [x] 1.3 Disable "next" button if already on current month (can't browse future)
  - [x] 1.4 Touch targets ≥ 48×48px; `prefers-reduced-motion` respected; mobile-friendly layout

- [x] Task 2: Integrate `MonthPicker` into `+page.svelte` (AC: #1, #3, #4, #5)
  - [x] 2.1 Add `MonthPicker` to the page header, passing `year` and `month` from `data`
  - [x] 2.2 Update the subtitle text to reflect selected month from MonthPicker
  - [x] 2.3 Ensure skeleton loading state shows while data reloads on month change

- [x] Task 3: Enhance `AttendanceTable.svelte` summary column (AC: #2)
  - [x] 3.1 Verify `getTotal()` already sums `shift_value` for each staff — it does (from Story 4.1), ensure display is prominent: bold, larger font, right-aligned in sticky column
  - [x] 3.2 Add a footer row showing total attendance across all staff for each day column (optional summary insight)

- [x] Task 4: Write tests (all ACs)
  - [x] 4.1 Unit test for MonthPicker: verify month navigation produces correct `?year=&month=` URL params
  - [x] 4.2 Unit test for MonthPicker: verify "next" button disabled when on current month
  - [x] 4.3 Integration test: verify `+page.server.ts` load function returns correct data for different year/month params (already partially tested in Story 4.1)

## Dev Notes

### Architecture & Patterns (MUST FOLLOW)

- **Server/client boundary:** All DB queries go through `$lib/server/db/attendance.ts` — never call Supabase directly in `.svelte` files
- **URL-based month navigation:** Use SvelteKit `goto()` with `replaceState` to update `?year=YYYY&month=MM` search params — triggers `+page.server.ts` reload automatically via `invalidateAll()`
- **Supabase client:** Use `locals.supabase` (user-scoped, RLS-enforced) — never admin client
- **RBAC:** `(reception)/+layout.server.ts` already enforces `['reception', 'manager']` — no extra role gate needed for this story

### What Already Exists (DO NOT RECREATE)

- **`getAttendanceByMonth(supabase, year, month)`** in `$lib/server/db/attendance.ts` — already fetches attendance for any month, already used by `+page.server.ts`
- **`+page.server.ts` load function** — already reads `year` and `month` from `url.searchParams` and passes to `getAttendanceByMonth()`
- **`AttendanceTable.svelte`** — already renders full-month grid with `getTotal()` summing shift values per staff in a sticky "Tổng" column
- **`ShiftInput.svelte`** — already handles disabled state for non-today dates (reception) and enabled for all dates (manager)
- **`+page.svelte`** — already shows month/year subtitle, staff count, and renders `AttendanceTable`
- **`$lib/types/attendance.ts`** — shared types for `AttendanceLogRow`, `AttendanceWithStaff`, `ActiveStaffMember`

### What Needs to Be Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `$lib/components/attendance/MonthPicker.svelte` | **CREATE** | Month navigation UI |
| `src/routes/(reception)/attendance/+page.svelte` | **MODIFY** | Integrate MonthPicker |
| `$lib/components/attendance/AttendanceTable.svelte` | **MODIFY** | Enhance summary display (minor) |
| `$lib/components/attendance/MonthPicker.test.ts` | **CREATE** | MonthPicker unit tests |

### Naming Conventions

- Components: `MonthPicker.svelte` → `$lib/components/attendance/`
- Tests: `MonthPicker.test.ts` co-located next to component
- URL params: `year` (number), `month` (number, 1-indexed)

### UX Requirements

- Vietnamese month labels: "Tháng 1", "Tháng 2", ... "Tháng 12"
- Prev/next arrows with `aria-label="Tháng trước"` / `aria-label="Tháng sau"`
- Touch targets ≥ 48px for prev/next buttons
- `prefers-reduced-motion` support on any transitions
- No spinner on month switch — the URL param change triggers SvelteKit navigation which shows the existing skeleton/loading state

### Svelte 5 Rules

- Use `$state`, `$derived` for component-local reactivity only
- Do NOT use runes for cross-component shared state — use Svelte Stores if needed
- Use `$props()` for component inputs
- `$derived.by()` for function-form derived values

### Story 4.1 Learnings (APPLY THESE)

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

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: _bmad-output/project-context.md]
- [Source: manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.server.ts — existing load with year/month params]
- [Source: manage-smeraldo-hotel/src/lib/components/attendance/AttendanceTable.svelte — existing getTotal()]
- [Source: manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.svelte — existing page]
- [Source: manage-smeraldo-hotel/src/lib/server/db/attendance.ts — existing DB functions]
- [Source: _bmad-output/implementation-artifacts/4-1-log-daily-attendance-for-all-staff.md — Story 4.1 learnings]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Amp)

### Debug Log References

### Completion Notes List

- ✅ Created `MonthPicker.svelte` — prev/next chevrons + Vietnamese month label, goto() with invalidateAll, next disabled on current month, 48px touch targets, motion-reduce support
- ✅ Integrated MonthPicker into `+page.svelte` — header layout with flex-wrap, removed hardcoded monthNames array
- ✅ Enhanced AttendanceTable summary column — `bg-blue-50` highlight on Tổng column for visual prominence
- ✅ 10 new unit tests for MonthPicker navigation logic, URL params, current month detection — all passing
- ✅ 107/107 total tests passing, 0 type errors

### Change Log

- 2026-02-16: Story 4.2 implemented — all 4 tasks complete

### File List

- `manage-smeraldo-hotel/src/lib/components/attendance/MonthPicker.svelte` (new)
- `manage-smeraldo-hotel/src/lib/components/attendance/MonthPicker.test.ts` (new)
- `manage-smeraldo-hotel/src/routes/(reception)/attendance/+page.svelte` (modified)
- `manage-smeraldo-hotel/src/lib/components/attendance/AttendanceTable.svelte` (modified)
