# Story 5.1: View Current Stock Levels

Status: done

## Story

As a reception staff member,
I want to see the current stock level for every product at a glance,
So that I know what's available for restocking and can identify items running low before they run out.

## Acceptance Criteria

1. **Given** a reception or manager user navigates to the Inventory page **When** `InventoryList.svelte` loads **Then** all tracked products (beverages and supplies) are displayed with their current stock level, unit, and low-stock threshold (FR34)

2. **Given** a product's current stock is at or below its defined threshold **When** the inventory list renders **Then** that product row is visually highlighted with an amber "Low Stock" badge — color + text label, never color-only (FR38, NFR-A2)

3. **Given** a housekeeping-role user attempts to access the Inventory page **When** the `(reception)/+layout.server.ts` evaluates the request **Then** they receive a 403 Forbidden — housekeeping staff cannot access inventory data (NFR-S5)

4. **Given** the inventory list is displayed on mobile **When** the page renders at < 768px **Then** the list is a single-column card layout with large readable text for stock levels

## Tasks / Subtasks

- [x] Task 1: Create shared inventory types (AC: #1)
  - [x] 1.1 Create `$lib/types/inventory.ts` with `InventoryItemRow` type matching `inventory_items` DB table columns (id, name, category, current_stock, low_stock_threshold, unit, created_at, updated_at)

- [x] Task 2: Create inventory DB query functions (AC: #1)
  - [x] 2.1 Implement `getAllInventoryItems(supabase)` in `$lib/server/db/inventory.ts` — returns all `inventory_items` ordered by `category ASC, name ASC`
  - [x] 2.2 Export `InventoryItemRow` type from `$lib/types/inventory.ts` (re-export from DB module for convenience)

- [x] Task 3: Create `+page.server.ts` for `(reception)/inventory/` (AC: #1, #3)
  - [x] 3.1 `load` function: fetch all inventory items via `getAllInventoryItems(locals.supabase)`, return items + `role: locals.userRole`
  - [x] 3.2 RBAC: `(reception)/+layout.server.ts` already enforces `['reception', 'manager']` — verify this covers inventory route (no separate layout needed)

- [x] Task 4: Create `InventoryList.svelte` component (AC: #1, #2, #4)
  - [x] 4.1 Render a table/card layout showing each product: name, category, current stock (bold, Fira Code), unit, threshold
  - [x] 4.2 Group products by category with section headers (e.g., "Đồ uống" for beverages, "Vật tư" for supplies)
  - [x] 4.3 Low-stock detection: if `current_stock <= low_stock_threshold`, show amber "Sắp hết" (Low Stock) badge with both color (`bg-amber-100 text-amber-800`) AND text label — never color-only (NFR-A2)
  - [x] 4.4 Desktop (1024px+): table layout with columns: Sản phẩm, Danh mục, Tồn kho, Đơn vị, Ngưỡng, Trạng thái
  - [x] 4.5 Mobile (< 768px): single-column card layout — each product as a card with large readable stock level (font-mono text-2xl), product name, category tag, unit, and low-stock badge if applicable
  - [x] 4.6 Touch targets ≥ 48px on mobile interactive elements; `prefers-reduced-motion` supported

- [x] Task 5: Create `+page.svelte` for `(reception)/inventory/` (AC: #1, #4)
  - [x] 5.1 Import and render `InventoryList` with data from load function
  - [x] 5.2 Page title: "Kho hàng — Smeraldo Hotel" (Inventory)
  - [x] 5.3 Header: "Kho hàng" (h1), product count subtitle, low-stock count badge if any
  - [x] 5.4 Empty state: "Chưa có sản phẩm nào." (No products yet) with `animate-pulse` skeleton during load

- [x] Task 6: Create seed migration for inventory items (AC: #1)
  - [x] 6.1 Create `supabase/migrations/00005_seed_inventory.sql` — seed initial inventory items for Smeraldo Hotel (common hotel beverages and supplies with reasonable stock levels and thresholds)

- [x] Task 7: Write tests (all ACs)
  - [x] 7.1 Unit test for `getAllInventoryItems` — mock Supabase, verify query params (table, order, select)
  - [x] 7.2 Unit test for `getAllInventoryItems` — error handling (throws on DB error)
  - [x] 7.3 Unit test for low-stock detection logic — items at/below threshold flagged, items above threshold not flagged
  - [x] 7.4 Verify all existing tests still pass (no regressions)

## Dev Notes

### Architecture & Patterns (MUST FOLLOW)

- **Server/client boundary:** All DB queries go through `$lib/server/db/inventory.ts` — never call Supabase directly in `.svelte` files
- **Supabase client:** Use `locals.supabase` (user-scoped, RLS-enforced) — never admin client
- **RBAC:** `(reception)/+layout.server.ts` already enforces `['reception', 'manager']` — inventory route inherits this. Housekeeping is blocked at the layout level (AC #3 is satisfied by existing infrastructure)
- **API response envelope:** If adding any `+server.ts` endpoints, return `{ data, error }` envelope. For this story, only `+page.server.ts` load is needed.
- **Types:** Shared types go in `$lib/types/inventory.ts` (client-safe). Server-only DB functions go in `$lib/server/db/inventory.ts`.

### Database Schema (already migrated)

```sql
-- inventory_items
CREATE TABLE inventory_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT UNIQUE NOT NULL,
  category            TEXT NOT NULL,
  current_stock       INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  unit                TEXT NOT NULL DEFAULT 'units',
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- RLS: SELECT for manager + reception; UPDATE for manager only
-- Housekeeping cannot access inventory_items at all (NFR-S5)
```

### Existing Code to Reuse

- `$lib/server/db/inventory.ts` — exists as placeholder (`// Inventory database queries — Story 5.x`), implement here
- `$lib/components/inventory/` — directory exists (`.gitkeep`), place `InventoryList.svelte` here
- `$lib/db/schema.ts` — `InventoryItemSchema` and `StockMovementSchema` already defined with Zod validation
- `$lib/db/types.ts` — Supabase CLI-generated types include `inventory_items` table type (Row, Insert, Update)
- `(reception)/+layout.server.ts` — already requires `['reception', 'manager']` role
- Pattern reference: `$lib/server/db/rooms.ts` — follow the same query function structure (named export, SupabaseClient param, typed return, error handling)
- Pattern reference: `$lib/types/attendance.ts` — follow same shared types pattern

### What Needs to Be Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `$lib/types/inventory.ts` | **CREATE** | Shared InventoryItemRow type |
| `$lib/server/db/inventory.ts` | **MODIFY** | Add getAllInventoryItems query |
| `src/routes/(reception)/inventory/+page.server.ts` | **CREATE** | Load function for inventory page |
| `src/routes/(reception)/inventory/+page.svelte` | **CREATE** | Inventory page UI |
| `$lib/components/inventory/InventoryList.svelte` | **CREATE** | Product list/card component |
| `$lib/components/inventory/.gitkeep` | **DELETE** | Replace with real component |
| `supabase/migrations/00005_seed_inventory.sql` | **CREATE** | Seed initial inventory items |
| `$lib/server/db/inventory.test.ts` | **CREATE** | DB function tests |

### Naming Conventions

- Components: `InventoryList.svelte` → `$lib/components/inventory/`
- DB module: `$lib/server/db/inventory.ts`
- Route: `src/routes/(reception)/inventory/+page.server.ts`, `+page.svelte`
- Types: `$lib/types/inventory.ts`
- Tests: co-located `*.test.ts` next to source
- Vietnamese labels: "Kho hàng" (Inventory), "Sản phẩm" (Product), "Tồn kho" (Stock), "Đơn vị" (Unit), "Ngưỡng" (Threshold), "Sắp hết" (Low Stock), "Đồ uống" (Beverages), "Vật tư" (Supplies)

### UX Requirements

- **Desktop (1024px+):** Table layout with sortable columns
- **Mobile (< 768px):** Single-column card layout, large stock numbers (Fira Code, text-2xl), easy scanning
- **Low-stock badge:** Amber background + text label "Sắp hết" — dual encoding (color + text) per NFR-A2
- **Empty state:** "Chưa có sản phẩm nào." with rounded border card
- **Skeleton loading:** `animate-pulse` placeholders during initial load
- **Touch targets:** ≥ 48px on all interactive elements
- **`prefers-reduced-motion`:** Suppress animations

### Svelte 5 Rules

- Use `$state`, `$derived` for component-local reactivity only
- Do NOT use runes for cross-component shared state — use Svelte Stores if needed
- Use `$props()` for component inputs
- `$derived.by()` for function-form derived values

### Previous Epic Learnings (APPLY THESE)

- FormData sends strings — use `z.coerce` for numeric fields in Zod schemas
- Always pass `userRole` from load function — never default to a role in components
- Use `invalidateAll()` after form submissions to refresh page data
- Use `Intl.DateTimeFormat` with `en-CA` format + `Asia/Ho_Chi_Minh` timezone for YYYY-MM-DD server dates
- Use `$derived.by()` for complex derived computations
- Co-locate tests next to source files
- Use keyed `{#each}` blocks in Svelte templates
- Use `scope="col"` and `scope="row"` on table `<th>` elements

### Seed Data Notes

- No inventory seed data currently exists (only rooms were seeded in 00004)
- Create migration `00005_seed_inventory.sql` with typical hotel products:
  - Beverages: Nước suối (Water), Coca-Cola, Pepsi, Bia Saigon, Nước cam (Orange juice), etc.
  - Supplies: Khăn tắm (Towels), Xà phòng (Soap), Dầu gội (Shampoo), Giấy vệ sinh (Toilet paper), etc.
- Set reasonable initial stock and thresholds for each item
- Use Vietnamese product names

### Project Structure Notes

- App code lives in `manage-smeraldo-hotel/` subfolder within the repo
- All imports use `$lib/` alias — never relative `../../` from `src/`
- Named exports only (no `export default`) except `.svelte` files and config files

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md]
- [Source: _bmad-output/project-context.md]
- [Source: manage-smeraldo-hotel/supabase/migrations/00001_initial_schema.sql#L88-110 — inventory_items + stock_movements tables]
- [Source: manage-smeraldo-hotel/supabase/migrations/00002_rls_policies.sql#L131-152 — inventory RLS policies]
- [Source: manage-smeraldo-hotel/src/lib/db/schema.ts#L89-109 — InventoryItemSchema, StockMovementSchema]
- [Source: manage-smeraldo-hotel/src/lib/db/types.ts#L154-186 — inventory_items type]
- [Source: manage-smeraldo-hotel/src/lib/server/db/inventory.ts — placeholder file]
- [Source: manage-smeraldo-hotel/src/lib/server/db/rooms.ts — pattern reference for query functions]
- [Source: manage-smeraldo-hotel/src/lib/types/attendance.ts — pattern reference for shared types]
- [Source: _bmad-output/implementation-artifacts/4-1-log-daily-attendance-for-all-staff.md — Epic 4 learnings]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Amp)

### Debug Log References

- Fixed SvelteKit `+` prefix conflict: renamed `+page.server.test.ts` → `page.server.test.ts` (from Story 4.3) to allow `svelte-kit sync`

### Code Review Findings (2026-02-24)

**Implementation Pattern Discovered:**
Epic 5 stories (5.1–5.4) were implemented together in shared files rather than sequentially. This resulted in:
- `inventory.ts` contains functions for all 4 stories (5.1: `getAllInventoryItems`, 5.2: `logStockIn/Out`, 5.3: `updateLowStockThreshold`, 5.4: `getStockMovementHistory`, `getInventorySummaryReport`)
- `inventory.test.ts` contains 31 tests covering all 4 stories
- `types/inventory.ts` contains 3 interfaces across 3 stories
- `+page.server.ts` contains Form Actions across 3 stories

**Fixes Applied:**
- ✅ Added keyboard support (Enter/Space) to clickable inventory rows (desktop + mobile) for accessibility
- ✅ Updated File List to accurately document all changed files with cross-story annotations
- ✅ Corrected test count claims (31 inventory tests, 234 total — not "10 new, 152 total")
- ✅ Documented 7 unrelated files from Epics 2 and 3 that were modified during this story for unknown reasons

### Completion Notes List

- ✅ Created `$lib/types/inventory.ts` — `InventoryItemRow` interface matching DB schema (NOTE: File also contains types for Stories 5.2 and 5.4 — `StockMovementWithStaff`, `InventorySummaryRow`)
- ✅ Implemented `getAllInventoryItems()` in `$lib/server/db/inventory.ts` — ordered by category ASC, name ASC (NOTE: File also contains functions for Stories 5.2, 5.3, 5.4)
- ✅ Created `+page.server.ts` — load function fetching items + role; RBAC inherited from `(reception)/+layout.server.ts` (NOTE: File also contains Form Actions for Stories 5.2 and 5.3)
- ✅ Created `InventoryList.svelte` — dual layout: desktop table (6 columns) + mobile card grid (grouped by category, large stock numbers in Fira Code text-2xl) (NOTE: Modified for Story 5.4 to add modal functionality)
- ✅ Low-stock detection with amber "Sắp hết" badge (color + text, never color-only per NFR-A2), green "Đủ hàng" for sufficient stock
- ✅ Created `+page.svelte` — Vietnamese title, product count, low-stock count badge, empty state (NOTE: Modified for Story 5.4 to add Inventory Report button for managers)
- ✅ Created seed migration `00005_seed_inventory.sql` — 17 products (8 beverages + 9 supplies) with Vietnamese names, units, and thresholds
- ✅ 31 inventory tests total in `inventory.test.ts` (covering Stories 5.1–5.4), 234/234 total tests passing
- ✅ 0 new type errors
- ✅ Fixed accessibility: Added keyboard support (Enter/Space) for clickable inventory rows (desktop table and mobile cards)

### Change Log

- 2026-02-16: Story 5.1 implemented — all 7 tasks complete

### File List

**Story 5.1 Core Files:**
- `manage-smeraldo-hotel/src/lib/types/inventory.ts` (new — contains `InventoryItemRow` + types for Stories 5.2, 5.4)
- `manage-smeraldo-hotel/src/lib/server/db/inventory.ts` (modified — added `getAllInventoryItems()` + functions for Stories 5.2, 5.3, 5.4)
- `manage-smeraldo-hotel/src/lib/server/db/inventory.test.ts` (new — 31 tests covering Stories 5.1–5.4)
- `manage-smeraldo-hotel/src/routes/(reception)/inventory/+page.server.ts` (new — load function + Form Actions for Stories 5.2, 5.3)
- `manage-smeraldo-hotel/src/routes/(reception)/inventory/+page.svelte` (new — modified for Story 5.4 to add Inventory Report button)
- `manage-smeraldo-hotel/src/lib/components/inventory/InventoryList.svelte` (new — modified for Story 5.4 to add modal + accessibility fix)
- `manage-smeraldo-hotel/src/lib/components/inventory/.gitkeep` (deleted)
- `manage-smeraldo-hotel/supabase/migrations/00005_seed_inventory.sql` (new)
- `manage-smeraldo-hotel/src/routes/(reception)/attendance/page.server.test.ts` (renamed from +page.server.test.ts)

**Cross-Story Files Modified (documented in respective stories):**
- `manage-smeraldo-hotel/src/lib/db/schema.ts` (modified — added Zod schemas for inventory, documented in Story 5.2)
- `manage-smeraldo-hotel/src/lib/db/schema.test.ts` (modified — added schema tests, documented in Story 5.2)

**Unrelated Files Modified (outside Epic 5 scope):**
- `manage-smeraldo-hotel/src/lib/server/db/bookings.ts` (Epic 3 — reason unknown)
- `manage-smeraldo-hotel/src/lib/server/db/bookings.test.ts` (Epic 3 — reason unknown)
- `manage-smeraldo-hotel/src/lib/server/db/guests.ts` (Epic 3 — reason unknown)
- `manage-smeraldo-hotel/src/lib/server/db/guests.test.ts` (Epic 3 — reason unknown)
- `manage-smeraldo-hotel/src/routes/(reception)/bookings/+page.server.ts` (Epic 3 — reason unknown)
- `manage-smeraldo-hotel/src/routes/(reception)/bookings/+page.svelte` (Epic 3 — reason unknown)
- `manage-smeraldo-hotel/src/lib/components/rooms/RoomTile.svelte` (Epic 2 — reason unknown)
- `.claude/settings.local.json` (IDE config)
