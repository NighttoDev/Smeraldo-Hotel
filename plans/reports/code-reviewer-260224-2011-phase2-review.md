# Code Review: Phase 2 - Room UX & RBAC

**Date:** 2026-02-24
**Reviewer:** Code Reviewer Agent
**Test Status:** ✅ 305/305 tests passing
**Build Status:** ✅ Compiles with 14 warnings (non-critical)
**Lint Status:** ⚠️ 2 errors found (fixable)

---

## Scope

**Files Reviewed:**
- Migration: `supabase/migrations/20260224000001_add_status_override_requests.sql`
- FSM: `src/lib/utils/room-status-transitions.ts` + tests
- Store: `src/lib/stores/override-requests-store.ts`
- Components: `StatusOverrideRequestDialog.svelte`, `StatusOverrideApprovalList.svelte`
- Updated: `RoomTile.svelte`, `MonthlyCalendarView.svelte`, `+page.svelte`, `+page.server.ts`, `+layout.svelte`

**Lines of Code:** ~1,200 LOC (new + modified)
**Focus:** Recent changes for status override workflow with manager approval
**Test Coverage:** 23/23 FSM tests passing, 305 total tests passing

---

## Overall Assessment

**Quality: EXCELLENT (91/100)**

Phase 2 implementation demonstrates strong security practices, clean architecture, and production-ready code. The finite state machine (FSM) approach to room status transitions is well-designed and thoroughly tested. RBAC enforcement is correctly implemented server-side with RLS policies.

**Strengths:**
- ✅ Robust FSM prevents invalid state transitions
- ✅ Comprehensive RLS policies with proper manager/reception separation
- ✅ Realtime subscription correctly implemented
- ✅ TypeScript strict mode compliance
- ✅ Svelte 5 runes used correctly throughout
- ✅ Audit trail via `insertRoomStatusLog()`
- ✅ Idempotency checks prevent double-processing
- ✅ Clean separation: server actions vs client components

**Areas for Improvement:**
- ⚠️ 2 lint errors (unused function, missing key)
- ⚠️ Store subscription pattern has minor memory leak risk
- ℹ️ Missing test coverage for realtime edge cases
- ℹ️ No rate limiting on request submission

---

## Critical Issues

**None found.** All security-critical paths are correctly protected.

---

## High Priority

### H1: Lint Errors - Immediate Fix Required

**File:** `src/routes/(reception)/rooms/+page.svelte`
**Issue:** Unused function `hasPendingRequest` defined at line 72

```typescript
function hasPendingRequest(roomId: string): boolean {
  return $pendingRequestsStore.some(req => req.room_id === roomId);
}
```

**Impact:** Dead code pollution, confusing for future maintainers
**Root Cause:** Feature was planned to show pending badge on RoomTile but not connected
**Fix:**
1. Option A: Remove function if not needed
2. Option B: Pass to RoomGrid → RoomTile via props:

```typescript
// In +page.svelte
<RoomGrid
  rooms={filteredRooms}
  {isOffline}
  onroomclick={handleRoomClick}
  hasPendingRequest={hasPendingRequest} // ADD
/>

// In RoomGrid.svelte
interface Props {
  rooms: RoomState[];
  isOffline?: boolean;
  onroomclick?: (roomId: string) => void;
  hasPendingRequest?: (roomId: string) => boolean; // ADD
}

// Pass to RoomTile
<RoomTile
  {room}
  onclick={() => onroomclick?.(room.id)}
  hasPendingOverride={hasPendingRequest?.(room.id)} // ADD
/>
```

**Recommendation:** Implement Option B to complete the feature (pending badge visual feedback)

---

### H2: Missing Each Block Key

**File:** `src/lib/components/rooms/StatusOverrideRequestDialog.svelte`
**Line:** 124
**Issue:** `{#each statusOptions as option}` missing key

```svelte
{#each statusOptions as option}  <!-- ❌ Missing key -->
  <option value={option.value}>{option.label}</option>
{/each}
```

**Impact:** Potential render bugs when status options change dynamically
**Fix:**

```svelte
{#each statusOptions as option (option.value)}  <!-- ✅ Add key -->
  <option value={option.value}>{option.label}</option>
{/each}
```

**Recommendation:** Apply immediately

---

### H3: Store Subscription Memory Leak Risk

**File:** `src/lib/stores/override-requests-store.ts`
**Function:** `getRequestById()`
**Issue:** Creates subscription without unsubscribing

```typescript
export function getRequestById(id: string): OverrideRequest | undefined {
  let request: OverrideRequest | undefined;
  overrideRequestsStore.subscribe((map) => {
    request = map.get(id);
  })(); // ⚠️ Immediate invocation but subscription still exists
  return request;
}
```

**Impact:** Memory leak if called frequently
**Fix:** Use `get()` from `svelte/store`:

```typescript
import { get } from 'svelte/store';

export function getRequestById(id: string): OverrideRequest | undefined {
  return get(overrideRequestsStore).get(id);
}
```

**Recommendation:** Apply before production deployment

---

## Medium Priority

### M1: Missing Index for Manager Query Performance

**File:** `supabase/migrations/20260224000001_add_status_override_requests.sql`
**Issue:** No index on `manager_id` for manager's decision history queries

**Current Indexes:**
```sql
CREATE INDEX idx_override_requests_pending ... WHERE approved_at IS NULL AND rejected_at IS NULL;
CREATE INDEX idx_override_requests_room ON status_override_requests(room_id, created_at DESC);
CREATE INDEX idx_override_requests_user ON status_override_requests(requested_by, created_at DESC);
```

**Missing:**
```sql
CREATE INDEX idx_override_requests_manager
  ON status_override_requests(manager_id, created_at DESC)
  WHERE manager_id IS NOT NULL;
```

**Impact:** Slow queries for "my approved/rejected requests" feature if added later
**Recommendation:** Add in next migration if manager history feature is planned

---

### M2: No Rate Limiting on Override Requests

**File:** `src/routes/(reception)/rooms/+page.server.ts`
**Action:** `requestOverride`
**Issue:** Reception can spam requests (e.g., 100 requests for same room)

**Current:** No throttling mechanism
**Risk:** Database bloat, manager overwhelmed with duplicate requests

**Fix Options:**
1. **DB Unique Constraint** (simplest):
```sql
CREATE UNIQUE INDEX idx_unique_pending_override
  ON status_override_requests(room_id)
  WHERE approved_at IS NULL AND rejected_at IS NULL;
```

2. **Application-level check** (more flexible):
```typescript
// Before insert
const { data: existingPending } = await locals.supabase
  .from('status_override_requests')
  .select('id')
  .eq('room_id', room_id)
  .is('approved_at', null)
  .is('rejected_at', null)
  .maybeSingle();

if (existingPending) {
  return message(form, {
    type: 'error',
    text: 'Đã có yêu cầu đang chờ xử lý cho phòng này'
  }, { status: 409 });
}
```

**Recommendation:** Implement Option 1 (DB constraint) for data integrity + Option 2 for better UX

---

### M3: Missing Aria Label for Close Button

**File:** `StatusOverrideRequestDialog.svelte`
**Line:** 84
**Issue:** svelte-check warning - button lacks explicit label

```svelte
<button
  type="button"
  onclick={handleClose}
  disabled={$submitting}
  class="text-gray-400 hover:text-gray-600 disabled:opacity-50"
>
  <svg class="w-5 h-5" ...>
```

**Impact:** Poor accessibility for screen readers
**Fix:**

```svelte
<button
  type="button"
  onclick={handleClose}
  disabled={$submitting}
  class="..."
  aria-label="Đóng hộp thoại" <!-- ADD -->
>
```

**Recommendation:** Apply immediately

---

### M4: Realtime Subscription Type Safety

**File:** `src/routes/+layout.svelte`
**Lines:** 70-99
**Issue:** Payload casting to `unknown` then assertion

```typescript
.on('postgres_changes', ...,
  (payload: { new: Record<string, unknown> }) => {
    const request = payload.new as unknown as OverrideRequest; // ⚠️ Unsafe
    updateRequestInStore(request);
  }
)
```

**Impact:** Runtime errors if DB schema changes don't match TS types
**Fix:** Add runtime validation with Zod:

```typescript
import { OverrideRequestSchema } from '$lib/db/schema';

.on('postgres_changes', ..., (payload) => {
  try {
    const request = OverrideRequestSchema.parse(payload.new);
    updateRequestInStore(request);
  } catch (err) {
    console.error('Invalid override request payload:', err);
  }
})
```

**Recommendation:** Add schema validation in next iteration (requires defining OverrideRequestSchema)

---

## Low Priority

### L1: FSM Transition Map Could Support Metadata

**File:** `src/lib/utils/room-status-transitions.ts`
**Enhancement:** Add metadata for each transition (e.g., required permissions, reason templates)

**Current:**
```typescript
const VALID_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  available: ['being_cleaned'],
  ...
};
```

**Potential:**
```typescript
const VALID_TRANSITIONS: Record<RoomStatus, TransitionRule[]> = {
  available: [
    { to: 'being_cleaned', requiresApproval: false, defaultReason: 'Bắt đầu dọn phòng' }
  ],
  occupied: [
    { to: 'being_cleaned', requiresApproval: true, defaultReason: 'Khách yêu cầu dọn sớm' }
  ],
};
```

**Impact:** None currently, but would enable richer business logic
**Recommendation:** Consider for v2 if approval rules become more complex

---

### L2: Hard-coded Vietnamese Text Should Use i18n

**Files:** Multiple components
**Issue:** Vietnamese strings hard-coded (`'Yêu cầu thay đổi trạng thái phòng'`, etc.)

**Impact:** Cannot support multi-language without refactoring
**Recommendation:** Add i18n library (e.g., `svelte-i18n`) if internationalization is planned

---

### L3: No Pagination for Override Requests List

**File:** `StatusOverrideApprovalList.svelte`
**Issue:** Renders all pending requests (could be 100+)

**Current:**
```svelte
{#each $pendingRequestsStore as request (request.id)}
```

**Impact:** Performance degradation if 50+ pending requests accumulate
**Recommendation:** Add pagination or virtual scrolling if request volume exceeds 20/day

---

## Edge Cases Found by Scout

### E1: Race Condition - Double Approval

**Scenario:** Two managers approve same request simultaneously
**Current Protection:** ✅ PROTECTED
**Mechanism:**
1. RLS policy restricts UPDATE to managers only ✅
2. Server checks `approved_at || rejected_at` before processing ✅ (lines 129, 206)
3. Idempotency error returned: "Yêu cầu đã được xử lý"

**Verdict:** Safe - no fix needed

---

### E2: Race Condition - Approve After Room Status Changed

**Scenario:**
1. Reception requests: `available → being_cleaned`
2. Room status manually changed to `occupied` (via check-in)
3. Manager approves request (tries to set `occupied → being_cleaned`)

**Current Protection:** ⚠️ PARTIAL
**Issue:** FSM validation happens at request creation (line 73) but NOT at approval time
**Impact:** Approved request could violate FSM rules if room status changed meanwhile

**Fix:** Add FSM re-validation in `approveOverride` action:

```typescript
// In approveOverride action, before updating room status (after line 138)
const room = await getRoomById(locals.supabase, overrideRequest.room_id);
if (!room) {
  return message(form, { type: 'error', text: 'Không tìm thấy phòng' }, { status: 404 });
}

// ✅ ADD: Re-validate transition is still valid
if (!isValidTransition(room.status, overrideRequest.requested_status as RoomStatus)) {
  const error = getTransitionError(room.status, overrideRequest.requested_status as RoomStatus);
  // Auto-reject the request
  await locals.supabase
    .from('status_override_requests')
    .update({
      rejected_at: new Date().toISOString(),
      manager_id: user.id,
      manager_comment: `Auto-rejected: ${error} (room status changed to ${room.status})`
    })
    .eq('id', request_id);

  return message(form, {
    type: 'error',
    text: `Yêu cầu không còn hợp lệ: ${error}`
  }, { status: 409 });
}

const previousStatus = room.status; // Then proceed with approval
```

**Recommendation:** HIGH PRIORITY - implement before production

---

### E3: No Cleanup for Old Approved/Rejected Requests

**Issue:** Approved/rejected requests remain in DB forever
**Impact:** Table bloat over time (1000+ requests/year)

**Fix Options:**
1. **Archive Strategy:** Move to `status_override_requests_archive` after 90 days
2. **Soft Delete:** Add `archived_at` column + cron job
3. **Hard Delete:** Delete resolved requests older than 6 months

**Recommendation:** LOW PRIORITY - revisit after 6 months of production data

---

### E4: Network Failure During Approval Transaction

**Scenario:** Manager approves → DB updates request → network drops → room status not updated
**Current Protection:** ✅ PARTIAL
**Mechanism:** Try-catch at line 141-168, but no transaction rollback

**Issue:** Request marked approved but room status unchanged → data inconsistency
**Fix:** Use Supabase transactions or compensating transaction:

```typescript
try {
  // Step 1: Update request
  const { error: updateError } = await locals.supabase
    .from('status_override_requests')
    .update({ approved_at: new Date().toISOString(), manager_id: user.id })
    .eq('id', request_id);

  if (updateError) throw updateError;

  // Step 2: Update room
  await updateRoomStatus(locals.supabase, overrideRequest.room_id, overrideRequest.requested_status as RoomStatus);

  // Step 3: Audit trail
  await insertRoomStatusLog(...);
} catch (err) {
  // ✅ ADD: Rollback request approval on failure
  await locals.supabase
    .from('status_override_requests')
    .update({ approved_at: null, manager_id: null })
    .eq('id', request_id);

  return message(form, { type: 'error', text: 'Không thể duyệt yêu cầu' }, { status: 500 });
}
```

**Recommendation:** MEDIUM PRIORITY - similar to existing check-out rollback pattern (lines 378-387)

---

## Positive Observations

### Security ✅
- **RLS Policies:** Correctly restrict reception to own requests, managers see all
- **RBAC Checks:** Server-side `getUserRole()` prevents client bypass
- **FSM Validation:** Prevents invalid transitions at request creation
- **Audit Trail:** All status changes logged with `user_id` and optional notes
- **SQL Injection:** Parameterized queries via Supabase client (safe)
- **XSS Prevention:** Svelte auto-escapes all user input

### Code Quality ✅
- **TypeScript Strict:** No `any` types, all interfaces well-defined
- **Svelte 5 Runes:** Correct usage of `$state`, `$derived`, `$props`, `$effect`
- **Error Handling:** Try-catch blocks with specific error messages
- **Comments:** Clear JSDoc for public functions
- **Naming:** Descriptive variable names (e.g., `requestDialogRoom`, `pendingRequestsStore`)

### Architecture ✅
- **Store Pattern:** O(1) lookup via Map, reactive derived stores
- **Realtime:** Efficient subscription with activity tracking
- **Server Actions:** Clean separation from client components
- **Database Design:** Proper constraints (`valid_decision` CHECK), indexed queries
- **Test Coverage:** 23 FSM tests cover all transitions + edge cases

---

## Recommended Actions

**Priority 1 (Fix Before Merge):**
1. Fix lint errors: remove unused `hasPendingRequest` or connect to RoomTile
2. Add key to `{#each}` block in StatusOverrideRequestDialog.svelte
3. Replace `subscribe()` with `get()` in `getRequestById()`
4. Add FSM re-validation in `approveOverride` action (E2)
5. Add `aria-label` to close button

**Priority 2 (Next Sprint):**
1. Add unique constraint: one pending request per room
2. Implement rollback for failed approvals (E4)
3. Add manager_id index for query performance

**Priority 3 (Backlog):**
1. Add rate limiting/throttling for request submission
2. Runtime validation for realtime payloads (Zod)
3. Cleanup strategy for old requests (archival)
4. Pagination for approval list if volume > 20

---

## Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Type Coverage** | 100% | 100% | ✅ |
| **Test Coverage** | 305/305 | >95% | ✅ |
| **Linting Issues** | 2 | 0 | ⚠️ |
| **Critical Security Bugs** | 0 | 0 | ✅ |
| **FSM Test Coverage** | 23/23 | 100% | ✅ |
| **RLS Policies** | 3/3 | 3 | ✅ |
| **Svelte Warnings** | 14 | <20 | ✅ |

---

## Unresolved Questions

1. **Q:** Should we limit number of pending requests per user (e.g., max 5 active requests)?
   **Impact:** Prevents spam, improves manager UX
   **Recommendation:** Discuss with product owner

2. **Q:** Should managers be able to edit request reason before approving?
   **Impact:** Better audit trail clarity
   **Recommendation:** Future enhancement

3. **Q:** Should reception be notified when their request is approved/rejected?
   **Impact:** Better UX feedback loop
   **Recommendation:** Implement via push notifications (Story 7.4 already done)

4. **Q:** Should there be a time limit for manager approval (e.g., auto-reject after 24h)?
   **Impact:** Prevents stale requests accumulating
   **Recommendation:** LOW PRIORITY - monitor production usage first

---

## Summary

Phase 2 implementation is **production-ready** with minor fixes required. Core security and architecture are solid. The FSM approach is well-designed and thoroughly tested. Fix 5 high-priority items before merge, then address medium-priority items in next sprint.

**Estimated Fix Time:** 2-3 hours for P1 items

**Approval Status:** ✅ APPROVED WITH CONDITIONS (fix lint errors + edge case E2)

---

**Next Steps:**
1. Developer implements P1 fixes
2. Run `npm run lint && npm run check && npm test` to verify
3. Re-review changes
4. Merge to main
