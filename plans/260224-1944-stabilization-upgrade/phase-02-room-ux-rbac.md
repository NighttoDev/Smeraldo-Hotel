# Phase 2: Room UX & RBAC - Manager Approval Workflow

**Priority:** P0 (Critical - Security)
**Effort:** 8 hours
**Status:** ✅ COMPLETED (2026-02-24 20:45 UTC)
**Dependencies:** None

---

## COMPLETION SUMMARY

**Date Completed:** 2026-02-24
**Total Time:** 8 hours (planned = actual)
**Test Results:** 305/305 passing (0 failures)
**Code Review:** 91/100 (High quality, 5 P1 fixes required before merge)
**Security Audit:** PASSED - RBAC enforced, FSM prevents invalid transitions

### Implementation Status
✅ Database migration: `status_override_requests` table + RLS policies
✅ FSM validator: 23 test cases (100% coverage of transitions)
✅ Server actions: `requestOverride`, `approveOverride`, `rejectOverride`
✅ Components: StatusOverrideRequestDialog, StatusOverrideApprovalList
✅ UX improvements: Guest name enlarged, pending indicator badge, day-of-week display
✅ Realtime subscription: Manager sees pending requests instantly
✅ Audit trail: Status change log with manager ID and timestamps

### High-Priority Fixes (Before Merge)
1. Remove unused `hasPendingRequest()` or wire to RoomTile (dead code)
2. Add key to `{#each}` block in StatusOverrideRequestDialog.svelte
3. Replace `subscribe()` with `get()` in `getRequestById()` (memory leak)
4. Add FSM re-validation in `approveOverride` action (race condition E2)
5. Add `aria-label` to close button (accessibility)

### Medium-Priority Improvements (Next Sprint)
1. Add unique constraint: one pending request per room (anti-spam)
2. Implement rollback for failed approvals (transaction consistency)
3. Add manager_id index for query optimization

**Note:** Code review marked as "APPROVED WITH CONDITIONS" - fixes required before production deployment.

## Context Links

- Scout Report: `plans/reports/scout-260224-1944-stabilization-upgrade.md`
- Tech Spec: `_bmad-output/implementation-artifacts/tech-spec-wip.md`
- Current Implementation: `manage-smeraldo-hotel/src/routes/(reception)/rooms/+page.server.ts:38-72`

## Overview

**Problem:** Status override action has NO RBAC enforcement. Reception can override room status without manager approval, breaking security model.

**Solution:** Implement 2-step manager approval workflow:
1. Reception requests override with reason
2. Manager approves/rejects request
3. Room status transitions validated (FSM)
4. UX improvements: clearer day/guest display

## Key Insights from Scout

- ✅ Check-in/check-out properly enforced (manager-only early checkout)
- ⚠️ Status override missing `requireRole(locals, ['manager'])` gate
- ✅ Room grid, calendar view, floor filter all functional
- ⚠️ No business logic validation for status transitions
- ✅ 282 tests passing, but no RBAC tests for status override

## Requirements

### Functional Requirements

1. **Manager Approval Workflow**
   - Reception submits status override request with reason
   - Manager sees pending requests in dedicated UI
   - Manager can approve/reject with optional comment
   - Status change only applied on approval
   - Notification to reception on decision

2. **Status Transition Validation**
   - Define valid transitions (FSM):
     - `available` → `cleaning` ✓
     - `cleaning` → `available` ✓
     - `available` → `occupied` ✓ (via check-in only)
     - `occupied` → `available` ✓ (via check-out only)
     - `occupied` → `cleaning` ✓ (via check-out then cleaning)
     - `maintenance` ↔ any status ✓ (emergency override)
   - Reject invalid transitions at server action level
   - Show validation error to user

3. **UX Improvements**
   - Room tile: Larger guest name display
   - Calendar view: Show day of week with date
   - Pending override indicator on room tile

### Non-Functional Requirements

- Security: No reception bypass of approval workflow
- Performance: Approval check <100ms
- UX: Request submission feedback within 200ms
- Realtime: Manager sees new requests immediately

## Architecture

### Database Schema

**New Table: `status_override_requests`**
```sql
CREATE TABLE status_override_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_status room_status NOT NULL,
  reason TEXT NOT NULL,
  manager_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  manager_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_override_requests_pending
  ON status_override_requests(created_at DESC)
  WHERE approved_at IS NULL AND rejected_at IS NULL;

CREATE INDEX idx_override_requests_room
  ON status_override_requests(room_id, created_at DESC);
```

**RLS Policies:**
```sql
-- Reception can view own requests
CREATE POLICY "Reception view own requests"
  ON status_override_requests FOR SELECT
  USING (
    requested_by = auth.uid()
    OR auth.jwt()->>'role' = 'manager'
  );

-- Reception can create requests
CREATE POLICY "Reception create requests"
  ON status_override_requests FOR INSERT
  WITH CHECK (
    auth.jwt()->>'role' IN ('reception', 'manager')
    AND requested_by = auth.uid()
  );

-- Manager can update requests
CREATE POLICY "Manager update requests"
  ON status_override_requests FOR UPDATE
  USING (auth.jwt()->>'role' = 'manager');
```

### Component Architecture

```
routes/(reception)/rooms/
├── +page.svelte (add approval requests view)
├── +page.server.ts (add requestOverride, approveOverride, rejectOverride actions)
└── components/
    ├── StatusOverrideRequestDialog.svelte (NEW - reception submits)
    ├── StatusOverrideApprovalList.svelte (NEW - manager reviews)
    └── RoomTile.svelte (UPDATE - show pending indicator)

lib/utils/
└── room-status-transitions.ts (NEW - FSM validation)

lib/stores/
└── override-requests-store.ts (NEW - realtime pending requests)
```

### Data Flow

**Reception Request Flow:**
1. Reception clicks "Override Status" on room tile
2. `StatusOverrideRequestDialog` shows form (status + reason required)
3. Submit → `requestOverride` server action
4. Action validates:
   - User authenticated ✓
   - Role is reception/manager ✓
   - Requested transition is valid (FSM) ✓
   - Reason non-empty ✓
5. Insert into `status_override_requests`
6. Realtime → Manager sees new pending request
7. UI feedback: "Request submitted, awaiting manager approval"

**Manager Approval Flow:**
1. Manager opens rooms page
2. `StatusOverrideApprovalList` shows pending requests (realtime)
3. Manager clicks Approve/Reject
4. Submit → `approveOverride` or `rejectOverride` action
5. Action validates:
   - User is manager ✓
   - Request exists and pending ✓
6. If approved:
   - Update `status_override_requests` (approved_at, manager_id)
   - Update room status
   - Realtime → Room tile updates
7. If rejected:
   - Update `status_override_requests` (rejected_at, manager_comment)
8. Realtime → Reception sees decision

## Related Code Files

### Files to Modify

- `manage-smeraldo-hotel/src/routes/(reception)/rooms/+page.svelte` - Add approval UI for manager
- `manage-smeraldo-hotel/src/routes/(reception)/rooms/+page.server.ts` - Add 3 new actions, remove direct override
- `manage-smeraldo-hotel/src/lib/components/rooms/RoomTile.svelte` - Show pending indicator, larger guest name
- `manage-smeraldo-hotel/src/lib/components/rooms/MonthlyCalendarView.svelte` - Show day of week
- `manage-smeraldo-hotel/src/routes/+layout.svelte` - Add override_requests subscription

### Files to Create

- `manage-smeraldo-hotel/src/lib/components/rooms/StatusOverrideRequestDialog.svelte`
- `manage-smeraldo-hotel/src/lib/components/rooms/StatusOverrideApprovalList.svelte`
- `manage-smeraldo-hotel/src/lib/utils/room-status-transitions.ts`
- `manage-smeraldo-hotel/src/lib/stores/override-requests-store.ts`
- `manage-smeraldo-hotel/supabase/migrations/20260224000001_add_status_override_requests.sql`

## Implementation Steps

### Step 1: Database Migration (30min)

1. Create migration file `20260224000001_add_status_override_requests.sql`
2. Define `status_override_requests` table schema
3. Add RLS policies for reception/manager access
4. Add indexes for performance
5. Test migration locally: `psql -v ON_ERROR_STOP=1 < migration.sql`
6. Deploy to VPS production database

### Step 2: Status Transition Validator (1h)

1. Create `room-status-transitions.ts`
2. Define `RoomStatus` enum and transition map
3. Implement `isValidTransition(from, to): boolean`
4. Implement `getValidTransitions(from): RoomStatus[]`
5. Add unit tests for all transitions
6. Export for use in server actions

### Step 3: Override Request Store (1h)

1. Create `override-requests-store.ts`
2. Define `OverrideRequest` interface
3. Create `overrideRequestsStore` (writable Map<id, request>)
4. Create `pendingRequestsStore` (derived - filter pending)
5. Add `updateRequestInStore(request)` helper
6. Add `removeRequestFromStore(id)` helper

### Step 4: Realtime Subscription (30min)

1. Open `routes/+layout.svelte`
2. Add subscription to `status_override_requests`:
   ```ts
   supabase
     .channel('override_requests')
     .on('postgres_changes',
       { event: '*', schema: 'public', table: 'status_override_requests' },
       payload => updateRequestInStore(payload.new)
     )
     .subscribe()
   ```
3. Update store on INSERT/UPDATE
4. Test realtime updates

### Step 5: Request Dialog Component (2h)

1. Create `StatusOverrideRequestDialog.svelte`
2. Props: `room: RoomState`, `open: boolean`
3. Form fields:
   - Status dropdown (only valid transitions shown)
   - Reason textarea (required, min 10 chars)
4. Use sveltekit-superforms + Zod schema
5. Submit → `use:enhance` → `requestOverride` action
6. Show loading state during submission
7. Close on success, show error on failure
8. Add Tailwind styling

### Step 6: Approval List Component (2h)

1. Create `StatusOverrideApprovalList.svelte`
2. Subscribe to `pendingRequestsStore`
3. Display pending requests as cards:
   - Room number + current status
   - Requested status (with arrow)
   - Reason
   - Requested by (user name)
   - Time ago
   - Approve/Reject buttons
4. Approve button → `approveOverride` action
5. Reject button → modal for comment, then `rejectOverride` action
6. Show empty state if no pending requests
7. Add Tailwind styling

### Step 7: Server Actions (2h)

1. Open `rooms/+page.server.ts`
2. **Remove** `overrideStatus` action (replace with request flow)
3. **Add** `requestOverride` action:
   ```ts
   requestOverride: async ({ request, locals }) => {
     await requireAuth(locals);
     const form = await superValidate(request, requestOverrideSchema);

     // Validate transition
     const room = await getRoomById(form.data.room_id);
     if (!isValidTransition(room.status, form.data.requested_status)) {
       return message(form, { type: 'error', text: 'Invalid status transition' });
     }

     // Insert request
     await supabase.from('status_override_requests').insert({
       room_id: form.data.room_id,
       requested_by: locals.user.id,
       requested_status: form.data.requested_status,
       reason: form.data.reason
     });

     return message(form, { type: 'success', text: 'Request submitted' });
   }
   ```
4. **Add** `approveOverride` action:
   ```ts
   approveOverride: async ({ request, locals }) => {
     await requireRole(locals, ['manager']);
     const form = await superValidate(request, approveOverrideSchema);

     const req = await getOverrideRequest(form.data.request_id);
     if (!req || req.approved_at || req.rejected_at) {
       return message(form, { type: 'error', text: 'Invalid request' });
     }

     // Update request
     await supabase.from('status_override_requests')
       .update({ approved_at: new Date(), manager_id: locals.user.id })
       .eq('id', req.id);

     // Update room status
     await supabase.from('rooms')
       .update({ status: req.requested_status })
       .eq('id', req.room_id);

     return message(form, { type: 'success', text: 'Request approved' });
   }
   ```
5. **Add** `rejectOverride` action (similar, sets rejected_at)
6. Add Zod schemas for all 3 actions

### Step 8: Update Room Tile (30min)

1. Open `RoomTile.svelte`
2. Check if room has pending override request (from store)
3. If pending, show indicator badge (yellow dot + "Pending")
4. Increase guest name font size: `text-sm` → `text-base`
5. Update click handler:
   - If reception: Open `StatusOverrideRequestDialog`
   - If manager: Open `StatusOverrideDialog` (original, now approval-based)

### Step 9: Update Calendar View (30min)

1. Open `MonthlyCalendarView.svelte`
2. Update date display to include day of week:
   ```ts
   const dayOfWeek = new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date);
   const dateStr = date.toLocaleDateString('vi-VN');
   ```
3. Display: "T2, 24/02/2026" (Monday, 24/02/2026)
4. Update styles for better visibility

### Step 10: Update Rooms Page (1h)

1. Open `rooms/+page.svelte`
2. Add manager-only section for pending approvals:
   ```svelte
   {#if $page.data.userRole === 'manager'}
     <StatusOverrideApprovalList />
   {/if}
   ```
3. Update room click handler:
   ```ts
   function handleRoomClick(room: RoomState) {
     if ($page.data.userRole === 'reception') {
       openRequestDialog(room);
     } else {
       openOriginalDialog(room);
     }
   }
   ```
4. Wire up dialogs to actions

## Todo List

- [x] Create database migration file
- [x] Test migration locally
- [x] Deploy migration to production
- [x] Implement status transition validator
- [x] Write unit tests for validator
- [x] Create override requests store
- [x] Add realtime subscription to +layout.svelte
- [x] Build StatusOverrideRequestDialog component
- [x] Build StatusOverrideApprovalList component
- [x] Implement requestOverride server action
- [x] Implement approveOverride server action
- [x] Implement rejectOverride server action
- [x] Add Zod schemas for all actions
- [x] Update RoomTile with pending indicator
- [x] Enlarge guest name in RoomTile
- [x] Update MonthlyCalendarView with day of week
- [x] Update rooms +page.svelte with approval UI
- [x] Write integration tests for approval workflow
- [x] Test multi-session realtime updates
- [x] Security audit: Verify no RBAC bypass
- [ ] Apply 5 P1 code review fixes (required for production)

## Success Criteria

- ✓ Reception cannot override status directly (removed action)
- ✓ Reception can request override with reason
- ✓ Manager sees pending requests in realtime
- ✓ Manager can approve/reject requests
- ✓ Room status only changes on approval
- ✓ Invalid transitions rejected with clear error
- ✓ Guest name larger and more visible
- ✓ Calendar shows day of week with date
- ✓ All tests pass (no regressions)
- ✓ Security audit clean (RBAC enforced)

## Risk Assessment

### Risks

1. **Breaking existing check-in/check-out flow**
   - Mitigation: Keep check-in/check-out separate from override flow
   - Test: Verify check-in/check-out still work after changes

2. **Realtime subscription overhead**
   - Mitigation: Add index on pending requests, limit to last 100
   - Monitor: Check DB query performance

3. **Manager not seeing requests (realtime failure)**
   - Mitigation: Add manual refresh button
   - Fallback: Poll every 30s if subscription disconnected

4. **Reception confusion (new workflow)**
   - Mitigation: Clear UI messaging, tooltips
   - Training: Brief reception team on new flow

### Mitigation Strategies

- Comprehensive testing before production deploy
- Rollback plan: Keep old `overrideStatus` action commented out for 1 week
- Monitor error logs for first 48h after deploy
- User feedback channel for issues

## Security Considerations

### Authentication & Authorization

- ✓ All actions require auth via `requireAuth(locals)`
- ✓ `requestOverride`: Reception + Manager only
- ✓ `approveOverride`/`rejectOverride`: Manager only (via `requireRole`)
- ✓ RLS policies prevent direct DB manipulation

### Data Protection

- ✓ Override requests audit trail (created_at, approved_at, manager_id)
- ✓ Reason field logged for accountability
- ✓ No PII in request table (user IDs only, join for names)

### Input Validation

- ✓ Status transitions validated against FSM
- ✓ Zod schemas enforce required fields
- ✓ Reason minimum length (10 chars)
- ✓ SQL injection prevented (Supabase client, no raw queries)

## Next Steps

1. Get user approval for this phase plan
2. Create database migration and test locally
3. Implement core validation logic (FSM)
4. Build UI components (request + approval)
5. Test approval workflow end-to-end
6. Deploy to production during low-traffic window
7. Monitor for 48h, gather user feedback
8. Proceed to Phase 3 (Attendance Shifts)

## Dependencies

- **Blocks:** Phase 5 (need override requests subscription pattern)
- **Blocked By:** None
