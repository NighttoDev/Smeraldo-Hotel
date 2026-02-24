# Code Standards & Patterns — Smeraldo Hotel

**Last Updated:** 2026-02-24 | **Status:** Enforced in Phase 2

## File Organization

```
manage-smeraldo-hotel/
├── src/
│   ├── lib/
│   │   ├── components/          # Svelte 5 components (PascalCase.svelte)
│   │   │   ├── rooms/
│   │   │   │   ├── RoomTile.svelte
│   │   │   │   ├── StatusOverrideDialog.svelte
│   │   │   │   └── RoomGrid.svelte
│   │   │   ├── manager/
│   │   │   │   └── ApprovalRequestsList.svelte
│   │   │   └── ...
│   │   ├── server/              # Server-only utilities
│   │   │   ├── auth.ts          # User role checks, session validation
│   │   │   ├── db/              # Database functions
│   │   │   │   ├── rooms.ts
│   │   │   │   ├── bookings.ts
│   │   │   │   └── ...
│   │   │   └── ...
│   │   ├── stores/              # Svelte 5 runes (camelCaseStore)
│   │   │   ├── sessionStore.ts
│   │   │   ├── roomStateStore.ts
│   │   │   ├── realtimeStatus.ts
│   │   │   └── offlineQueue.ts
│   │   ├── utils/               # Shared utilities
│   │   │   ├── room-status-transitions.ts
│   │   │   ├── format-date-vi.ts
│   │   │   └── ...
│   │   ├── db/                  # Shared types & schemas
│   │   │   └── schema.ts        # Zod schemas, TypeScript interfaces
│   │   └── ...
│   ├── routes/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   ├── +page.svelte
│   │   │   │   └── +page.server.ts
│   │   │   └── logout/
│   │   ├── (reception)/
│   │   │   ├── rooms/
│   │   │   │   ├── +page.svelte
│   │   │   │   ├── +page.server.ts
│   │   │   │   └── +page.server.test.ts
│   │   │   ├── bookings/
│   │   │   └── ...
│   │   ├── (manager)/
│   │   │   ├── approvals/       # NEW: Manager approval workflow (Phase 2.3)
│   │   │   │   └── +page.svelte
│   │   │   ├── reports/
│   │   │   └── ...
│   │   └── ...
│   ├── app.html
│   ├── app.css
│   └── hooks.server.ts
├── supabase/
│   ├── migrations/              # Database migrations (YYYYMMDDNNNNNN_.sql)
│   │   ├── 00001_...sql
│   │   ├── ...
│   │   └── 20260224000001_add_status_override_requests.sql
│   └── config.toml
├── tests/
│   ├── unit/
│   │   ├── room-status-transitions.test.ts
│   │   └── ...
│   └── e2e/
├── vitest.config.ts
├── vite.config.ts
├── svelte.config.js
├── package.json
└── tsconfig.json
```

---

## TypeScript & Language Rules

### Strict Mode Required
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

### No `any` Type
```typescript
// ❌ WRONG
async function fetchData(id: any): any { ... }

// ✅ CORRECT
async function fetchData(id: string): Promise<RoomRow> { ... }
```

### Type Imports
```typescript
// ✅ CORRECT
import type { RoomRow, BookingRow } from '$lib/db/schema';

// ❌ WRONG
import { type RoomRow } from '$lib/db/schema';  // Inconsistent
```

---

## Svelte 5 Rules (Runes Only)

### Component Props
```svelte
<!-- ✅ CORRECT (Svelte 5) -->
<script lang="ts">
  interface Props {
    room: RoomState;
    onConfirm?: (roomId: string) => void;
  }

  const { room, onConfirm = () => {} } = $props();
</script>

<!-- ❌ WRONG (Svelte 4 or mixing patterns) -->
<script lang="ts">
  export let room: RoomState;
  export let onConfirm = () => {};
</script>
```

### State Management
```typescript
// ✅ CORRECT (Svelte 5 runes)
let count = $state(0);
let derived = $derived(count * 2);
$effect(() => {
  console.log('count changed:', count);
});

// ❌ WRONG (Svelte 4 reactive declarations)
let count = 0;
$: doubled = count * 2;
$: console.log('count:', count);
```

### Derived State
```typescript
// ✅ CORRECT (immutable updates)
const room = $state<RoomState | null>(null);
const isPending = $derived(room?.isPending ?? false);

// ❌ WRONG (mutable reassignment with side effects)
let room = null;
$effect(() => {
  const isPending = room?.isPending;
  // Logic that shouldn't run on every re-render
});
```

---

## Database & Zod Schemas

### Schema Location
Place all schemas in `src/lib/db/schema.ts`:
```typescript
import { z } from 'zod';

export const RoomStatusSchema = z.enum([
  'trống',
  'có_khách',
  'trả_phòng',
  'đang_dọn',
  'sẵn_sàng'
]);

export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export const RequestOverrideSchema = z.object({
  room_id: z.string().uuid(),
  requested_status: RoomStatusSchema,
  reason: z.string().min(10, 'Lý do phải có ít nhất 10 ký tự')
});

// ERROR MESSAGES IN VIETNAMESE (always)
export const CheckInSchema = z.object({
  booking_id: z.string().uuid({ message: 'ID đặt phòng không hợp lệ' }),
  room_id: z.string().uuid({ message: 'ID phòng không hợp lệ' }),
  guest_name: z.string().min(1, 'Tên khách không được để trống')
});
```

### Form Action Pattern (Phase 2.3)
```typescript
// src/routes/(reception)/rooms/+page.server.ts

export const load: PageServerLoad = async ({ locals }) => {
  const form = await superValidate(zod4(RequestOverrideSchema));
  return { form };
};

export const actions: Actions = {
  requestOverride: async ({ locals, request }) => {
    const form = await superValidate(request, zod4(RequestOverrideSchema));

    // Step 1: Validate input
    if (!form.valid) {
      return fail(400, { form });
    }

    // Step 2: Authenticate
    const { user } = await locals.safeGetSession();
    if (!user) {
      return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });
    }

    // Step 3: Authorize & validate business logic
    const room = await getRoomById(locals.supabase, form.data.room_id);
    if (!room) {
      return message(form, { type: 'error', text: 'Không tìm thấy phòng' }, { status: 404 });
    }

    if (!isValidTransition(room.status, form.data.requested_status)) {
      const error = getTransitionError(room.status, form.data.requested_status);
      return message(form, { type: 'error', text: error }, { status: 400 });
    }

    // Step 4: Execute mutation
    try {
      const { error } = await locals.supabase
        .from('status_override_requests')
        .insert({
          room_id: form.data.room_id,
          requested_by: user.id,
          requested_status: form.data.requested_status,
          reason: form.data.reason
        });

      if (error) throw error;
    } catch (err) {
      console.error('Insert error:', err);
      return message(form, { type: 'error', text: 'Không thể tạo yêu cầu' }, { status: 500 });
    }

    // Step 5: Return success
    return message(form, { type: 'success', text: 'Đã gửi yêu cầu đến quản lý' });
  }
};
```

### Database Functions (src/lib/server/db/rooms.ts)
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RoomRow, RoomStatus } from '$lib/db/schema';

export async function getRoomById(
  supabase: SupabaseClient,
  roomId: string
): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error) {
    console.error(`Failed to fetch room ${roomId}:`, error);
    throw error;
  }

  return data;
}

export async function updateRoomStatus(
  supabase: SupabaseClient,
  roomId: string,
  newStatus: RoomStatus,
  guestName?: string | null
): Promise<RoomRow> {
  const updateData: Record<string, any> = { status: newStatus };

  // Clear guest name for certain statuses
  if (['trống', 'sẵn_sàng'].includes(newStatus)) {
    updateData.current_guest_name = null;
  } else if (guestName) {
    updateData.current_guest_name = guestName;
  }

  const { data, error } = await supabase
    .from('rooms')
    .update(updateData)
    .eq('id', roomId)
    .select()
    .single();

  if (error) {
    console.error(`Failed to update room ${roomId}:`, error);
    throw error;
  }

  return data;
}

export async function insertRoomStatusLog(
  supabase: SupabaseClient,
  roomId: string,
  previousStatus: RoomStatus,
  newStatus: RoomStatus,
  changedBy: string,
  notes?: string | null
): Promise<void> {
  const { error } = await supabase
    .from('room_status_logs')
    .insert({
      room_id: roomId,
      previous_status: previousStatus,
      new_status: newStatus,
      changed_by: changedBy,
      notes: notes || null
    });

  if (error) {
    console.error(`Failed to insert audit log for room ${roomId}:`, error);
    throw error;
  }
}
```

---

## Authorization Patterns

### Role Check Template
```typescript
// ✅ CORRECT (server-side, always)
const { user } = await locals.safeGetSession();
if (!user) {
  return message(form, { type: 'error', text: '...' }, { status: 401 });
}

const userRole = await getUserRole(locals);
if (userRole !== 'manager') {
  return message(form, { type: 'error', text: 'Chỉ manager...' }, { status: 403 });
}

// ❌ WRONG (client-side or trusting session store)
if ($sessionStore.user?.role !== 'manager') { ... }  // Bypassable
```

### Route Protection
```typescript
// +layout.server.ts (automatic redirect)
export const load: LayoutServerLoad = async ({ locals, url }) => {
  const { user } = await locals.safeGetSession();

  if (!user) {
    throw redirect(303, '/login');
  }

  const role = await getUserRole(locals);

  // Redirect to role-specific home
  if (url.pathname === '/') {
    const homeRoutes = {
      reception: '/rooms',
      manager: '/reports',
      housekeeping: '/status-updates',
      admin: '/settings'
    };
    throw redirect(303, homeRoutes[role] || '/login');
  }

  return { user, role };
};
```

---

## Room Status FSM (Phase 2 Enforced)

### Validation Function
```typescript
// src/lib/utils/room-status-transitions.ts

export function isValidTransition(
  currentStatus: RoomStatus,
  targetStatus: RoomStatus
): boolean {
  // Prevent no-op transitions
  if (currentStatus === targetStatus) return false;

  const validTransitions: Record<RoomStatus, RoomStatus[]> = {
    trống: ['có_khách', 'sẵn_sàng'],
    có_khách: ['trả_phòng'],
    trả_phòng: ['đang_dọn'],
    đang_dọn: ['sẵn_sàng'],
    sẵn_sàng: ['có_khách', 'trống']
  };

  return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
}

export function getTransitionError(
  currentStatus: RoomStatus,
  targetStatus: RoomStatus
): string {
  if (currentStatus === targetStatus) {
    return 'Phòng đã ở trạng thái này';
  }

  return `Không thể chuyển từ ${currentStatus} sang ${targetStatus}`;
}
```

### Where to Apply FSM Check
1. **Form Action (reception override request)** ✅
2. **Manager approval (re-validate to prevent race)** ✅
3. **Check-in/Check-out flows** ✅
4. **Realtime listener (housekeeping updates)** ✅
5. **Never** client-side only (always server-side too)

---

## Components (Svelte 5)

### Status Badge Component
```svelte
<!-- src/lib/components/rooms/StatusBadge.svelte -->
<script lang="ts">
  import type { RoomStatus } from '$lib/db/schema';

  interface Props {
    status: RoomStatus;
    size?: 'sm' | 'md' | 'lg';
  }

  const { status, size = 'md' } = $props();

  const statusStyles: Record<RoomStatus, string> = {
    trống: 'bg-green-100 text-green-800',
    có_khách: 'bg-blue-100 text-blue-800',
    trả_phòng: 'bg-orange-100 text-orange-800',
    đang_dọn: 'bg-yellow-100 text-yellow-800',
    sẵn_sàng: 'bg-teal-100 text-teal-800'
  };

  const statusLabels: Record<RoomStatus, string> = {
    trống: 'Trống',
    có_khách: 'Có khách',
    trả_phòng: 'Trả phòng',
    đang_dọn: 'Đang dọn',
    sẵn_sàng: 'Sẵn sàng'
  };
</script>

<div class={`px-3 py-1 rounded ${statusStyles[status]} text-${size}`}>
  {statusLabels[status]}
</div>
```

### Override Dialog Component (Phase 2.3)
```svelte
<!-- src/lib/components/rooms/StatusOverrideDialog.svelte -->
<script lang="ts">
  import type { RoomState } from '$lib/stores/roomState';
  import type { RoomStatus } from '$lib/db/schema';

  interface Props {
    room: RoomState | null;
    onConfirm?: (roomId: string, newStatus: RoomStatus) => void;
    onCancel?: () => void;
  }

  const { room, onConfirm, onCancel } = $props();
  let selectedStatus = $state<RoomStatus | null>(null);

  $effect(() => {
    if (room) {
      selectedStatus = null; // Reset on new room
    }
  });

  function handleConfirm() {
    if (room && selectedStatus && onConfirm) {
      onConfirm(room.id, selectedStatus);
    }
  }
</script>

{#if room}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
    <div class="bg-white rounded-lg p-6 max-w-sm">
      <h2 class="text-lg font-bold mb-2">Đổi trạng thái phòng {room.room_number}</h2>
      <p class="text-sm text-gray-600 mb-4">Trạng thái hiện tại: {room.status}</p>

      <!-- Radio buttons for status selection -->
      <div class="space-y-2 mb-6">
        {#each ['trống', 'có_khách', 'trả_phòng', 'đang_dọn', 'sẵn_sàng'] as status}
          {#if status !== room.status}
            <label class="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50">
              <input type="radio" name="status" value={status} bind:group={selectedStatus} />
              <span class="ml-2">{status}</span>
            </label>
          {/if}
        {/each}
      </div>

      <div class="flex gap-3">
        <button class="flex-1 px-4 py-2 text-gray-700 border rounded hover:bg-gray-50" on:click={() => onCancel?.()}>
          Hủy
        </button>
        <button
          class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={!selectedStatus}
          on:click={handleConfirm}
        >
          Xác nhận đổi
        </button>
      </div>
    </div>
  </div>
{/if}
```

---

## Testing Standards

### Test File Location & Naming
```
src/lib/components/rooms/RoomTile.test.ts
src/lib/utils/room-status-transitions.test.ts
src/routes/(reception)/rooms/+page.server.test.ts
```

### Test Structure
```typescript
import { describe, it, expect } from 'vitest';
import { isValidTransition } from '$lib/utils/room-status-transitions';

describe('Room Status FSM', () => {
  it('should allow trống → có_khách', () => {
    expect(isValidTransition('trống', 'có_khách')).toBe(true);
  });

  it('should prevent có_khách → trống', () => {
    expect(isValidTransition('có_khách', 'trống')).toBe(false);
  });

  it('should prevent no-op transition', () => {
    expect(isValidTransition('trống', 'trống')).toBe(false);
  });
});
```

### Test Coverage Requirements
- Unit tests for FSM, auth, date formatting: ≥ 90%
- Integration tests for form actions: all CRUD paths
- E2E tests for approval workflow: happy path + edge cases

---

## Error Handling

### Form Action Errors (Consistent Pattern)
```typescript
// Success path
return message(form, { type: 'success', text: 'Action completed' });

// Validation error
if (!form.valid) return fail(400, { form });

// Authentication error (no session)
return message(form, { type: 'error', text: 'Phiên đăng nhập hết hạn' }, { status: 401 });

// Authorization error (wrong role)
return message(form, { type: 'error', text: 'Không có quyền' }, { status: 403 });

// Not found error
return message(form, { type: 'error', text: 'Không tìm thấy' }, { status: 404 });

// Business logic error (FSM violation)
return message(form, { type: 'error', text: 'Chuyển trạng thái không hợp lệ' }, { status: 400 });

// Database error
return message(form, { type: 'error', text: 'Lỗi hệ thống' }, { status: 500 });
```

### Try-Catch for Database Operations
```typescript
try {
  const { error } = await supabase.from('...').insert(...);
  if (error) throw error;
  // Success path
} catch (err) {
  console.error('Operation failed:', err);
  return message(form, { type: 'error', text: 'Lỗi hệ thống' }, { status: 500 });
}
```

---

## Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase.svelte | `StatusBadge.svelte`, `RoomTile.svelte` |
| Stores | camelCase (rune exports) | `roomStateStore`, `sessionStore` |
| DB functions | camelCase | `getRoomById()`, `updateRoomStatus()` |
| Zod schemas | PascalCase | `RequestOverrideSchema`, `CheckInSchema` |
| TypeScript types | PascalCase | `RoomStatus`, `RoomRow`, `Props` |
| Constants | UPPER_SNAKE_CASE | `ROOM_STATUSES`, `MAX_OVERRIDE_REASON_LENGTH` |
| Directories | kebab-case | `room-status-transitions.ts`, `format-date-vi.ts` |
| Routes | kebab-case groups | `(reception)`, `(manager)` |
| Environment variables | UPPER_SNAKE_CASE, PUBLIC_ prefix | `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |

---

## Vietnamese Locale & Formatting

### Always Use Vietnamese Error Messages
```typescript
// ✅ CORRECT
return message(form, { type: 'error', text: 'Không tìm thấy phòng' });

// ❌ WRONG
return message(form, { type: 'error', text: 'Room not found' });
```

### Date Formatting
```typescript
// src/lib/utils/format-date-vi.ts
export function formatDateVN(date: Date | string): string {
  // Returns: 'T4, 24/02/2026' (day of week, DD/MM/YYYY)
}

export function formatTimeVN(date: Date | string): string {
  // Returns: '14:30' (24-hour format)
}
```

### Currency (VND, no decimals)
```typescript
export function formatVND(amount: number): string {
  // Returns: '1.234.567 đ' (space before ₫)
}
```

---

## Database Migrations

### Migration Naming
```
supabase/migrations/YYYYMMDDNNNNNN_description.sql
                    20260224000001_add_status_override_requests.sql
```

### Migration Template
```sql
-- Migration: Add status_override_requests table
-- Created: 2026-02-24
-- Purpose: Manager approval workflow for reception override requests

CREATE TABLE IF NOT EXISTS status_override_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_status room_status NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
  manager_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_override_requests_pending
  ON status_override_requests(created_at DESC)
  WHERE approved_at IS NULL AND rejected_at IS NULL;

-- Enable RLS
ALTER TABLE status_override_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view own requests, managers see all
CREATE POLICY "Users can view own requests and managers view all"
  ON status_override_requests FOR SELECT
  USING (
    requested_by = auth.uid()
    OR (SELECT role FROM auth.users WHERE id = auth.uid()) = 'manager'
  );

-- Comments for documentation
COMMENT ON TABLE status_override_requests IS 'Tracks room status override requests requiring manager approval';
COMMENT ON COLUMN status_override_requests.reason IS 'Explanation for override (min 10 chars)';
```

---

## Code Quality Checklist

Before committing:
- [ ] No `any` types (use `unknown` or define interface)
- [ ] All form actions have `try-catch`
- [ ] All DB queries have error handling
- [ ] Authorization checked server-side (never client-side only)
- [ ] FSM validation applied for room transitions
- [ ] Error messages in Vietnamese
- [ ] Tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] No secrets in code (use `.env` for Supabase keys)
- [ ] Commit message follows conventional commits

---

## Phase 2 Additions (2026-02-24)

**New Patterns Introduced:**
1. **Manager Approval Workflow** — `requestOverride` + `approveOverride` + `rejectOverride` form actions
2. **FSM Validation** — Applied at request submission + manager approval to prevent race conditions
3. **Audit Trail Enhancement** — `changed_by` includes manager ID when manager approves
4. **Pending Indicator** — UI shows pending override requests on room tiles
5. **Realtime Broadcast** — Manager approval triggers instant UI update across all clients

**Key Files Modified:**
- `src/routes/(reception)/rooms/+page.server.ts` — Added 3 new form actions
- `src/routes/(reception)/rooms/+page.svelte` — Added override dialog integration
- `src/lib/components/rooms/StatusOverrideDialog.svelte` — NEW component
- `supabase/migrations/20260224000001_add_status_override_requests.sql` — NEW table + RLS

---

## References

- **Svelte 5 Docs:** https://svelte.dev/docs
- **SvelteKit Docs:** https://kit.svelte.dev
- **Zod Docs:** https://zod.dev
- **Supabase RLS:** https://supabase.com/docs/guides/database/postgres/row-level-security
- **Room FSM:** `src/lib/utils/room-status-transitions.ts`
