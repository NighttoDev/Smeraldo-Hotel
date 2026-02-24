# Smeraldo Hotel Stabilization & Operations Upgrade

**Created:** 2026-02-24
**Status:** Phase 3/5 Complete (60% overall)
**Tech Spec:** `_bmad-output/implementation-artifacts/tech-spec-wip.md`
**Scout Report:** `plans/reports/scout-260224-1944-stabilization-upgrade.md`

## Overview

5-phase upgrade addressing production gaps in build, room RBAC, attendance workflow, manager navigation, and realtime updates.

## User Decisions

- ✓ Phase 2: Manager approval workflow (2-step) for status override
- ✓ Phase 4: Add rooms/bookings to manager navbar
- ✓ Phase 2: Add room status transition validation
- ✓ Phase 5: Add realtime subscriptions for bookings/inventory

## Phases

### Phase 1: Build Cleanup (Validation Only)
**Status:** Not Started
**File:** [phase-01-build-cleanup.md](./phase-01-build-cleanup.md)
**Effort:** Low (0.5h)
**Priority:** P3 (Nice to have)
**Goal:** Verify single build output, no duplicates

### Phase 2: Room UX & RBAC
**Status:** ✅ Completed (2026-02-24)
**File:** [phase-02-room-ux-rbac.md](./phase-02-room-ux-rbac.md)
**Effort:** High (8h) - Actual: 8h
**Priority:** P0 (Critical - Security)
**Goal:** Manager approval workflow + transition validation + UX improvements
**Blockers:** None
**Tests:** 305/305 passing | Code Review: 91/100 | 5 P1 fixes identified

### Phase 3: Attendance Shifts
**Status:** ✅ Completed (2026-02-24)
**File:** [phase-03-attendance-shifts.md](./phase-03-attendance-shifts.md)
**Effort:** Medium (4h) - Actual: 4h
**Priority:** P1 (High)
**Goal:** Check-in/end-shift flow + auto-logout at 12h
**Blockers:** None
**Tests:** 305/305 passing | Code Review: 8.3/10 | 3 critical fixes applied

### Phase 4: Manager Navigation
**Status:** Not Started
**File:** [phase-04-manager-navigation.md](./phase-04-manager-navigation.md)
**Effort:** Low (1h)
**Priority:** P2 (Medium)
**Goal:** Add /rooms and /bookings to manager navbar
**Blockers:** None

### Phase 5: Realtime Updates
**Status:** Not Started
**File:** [phase-05-realtime-updates.md](./phase-05-realtime-updates.md)
**Effort:** Medium (3h)
**Priority:** P2 (Medium)
**Goal:** Add bookings/inventory realtime subscriptions
**Blockers:** None

## Execution Order

1. **Phase 2** (Critical security fix)
2. **Phase 3** (High priority UX)
3. **Phase 4** (Quick nav fix)
4. **Phase 5** (Realtime polish)
5. **Phase 1** (Optional validation)

## Dependencies

- Supabase schema: `status_override_requests` table (new)
- Existing auth/RBAC system
- Existing realtime subscription pattern (rooms)

## Success Criteria

- ✓ Reception cannot bypass manager approval for status override
- ✓ Room status transitions validated (FSM)
- ✓ Attendance shift flow with auto-logout
- ✓ Manager navbar includes rooms/bookings
- ✓ Bookings/inventory update in realtime
- ✓ All 282 tests pass (no regressions)
- ✓ Security audit clean (no RBAC gaps)

## Test Strategy

- Unit tests: Status override approval workflow
- Integration tests: Realtime subscription flow
- Manual testing: Multi-session realtime verification
- Security testing: RBAC enforcement across all roles
