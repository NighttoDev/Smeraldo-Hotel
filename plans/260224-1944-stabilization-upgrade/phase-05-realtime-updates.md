# Phase 5: Realtime Updates - Bookings & Inventory

**Priority:** P2 (Medium)
**Effort:** 3 hours
**Status:** Not Started
**Dependencies:** Phase 2 (uses override requests subscription pattern)

## Context Links

- Scout Report: `plans/reports/scout-260224-1944-stabilization-upgrade.md`
- Existing Realtime: `manage-smeraldo-hotel/src/routes/+layout.svelte:51-66`
- Room Store: `manage-smeraldo-hotel/src/lib/stores/room-state-store.ts`

## Overview

Add Supabase Realtime subscriptions for bookings and inventory tables, following the existing rooms pattern. Users requested live updates so they don't need manual page reload.

## Key Insights from Scout

**Current Realtime:**
- ✅ Rooms: Subscribed in +layout.svelte
- ✅ Store pattern: Map<id, item> for O(1) lookup
- ✅ Realtime status tracking (connected, lastUpdate)
- ✅ Offline graceful fallback

**Not Subscribed:**
- ⚠️ Bookings (server-rendered only)
- ⚠️ Inventory (server-rendered only)
- ⚠️ Attendance (server-rendered only - OK, not requested)

**Note:** Scout suggested bookings/inventory don't need realtime, but user explicitly requested it.

## Requirements

### Functional Requirements

1. **Bookings Realtime**
   - Subscribe to `bookings` table changes (INSERT, UPDATE, DELETE)
   - Update booking list store on changes
   - Show live updates on bookings page
   - No manual refresh needed

2. **Inventory Realtime**
   - Subscribe to `inventory_items` table changes
   - Update inventory store on changes
   - Show live updates on inventory page
   - Stock level changes reflect immediately

3. **Subscription Management**
   - Create/destroy subscriptions in +layout.svelte
   - Handle reconnection on network restore
   - Track subscription health per table

### Non-Functional Requirements

- Performance: Update latency <500ms
- Reliability: Auto-reconnect on disconnect
- Memory: Efficient store updates (no duplicates)
- UX: Visual indicator for live updates

## Architecture

### Store Architecture

```
lib/stores/
├── room-state-store.ts (existing - reference pattern)
├── booking-state-store.ts (NEW)
└── inventory-state-store.ts (NEW)
```

Each store follows the pattern:
1. `Map<id, item>` for O(1) lookup
2. Derived sorted array for rendering
3. Update/remove helpers
4. Realtime activity marker

### Subscription Architecture

**+layout.svelte (expanded):**
```ts
// Existing rooms subscription
const roomsChannel = supabase.channel('rooms')...

// NEW: Bookings subscription
const bookingsChannel = supabase.channel('bookings')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'bookings' },
    payload => updateBookingInStore(payload.new)
  )
  .subscribe();

// NEW: Inventory subscription
const inventoryChannel = supabase.channel('inventory')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'inventory_items' },
    payload => updateInventoryInStore(payload.new)
  )
  .subscribe();
```

### Data Flow

**Booking Update Flow:**
1. Manager creates booking via form submission
2. Server inserts into `bookings` table
3. Supabase Realtime broadcasts INSERT event
4. +layout.svelte receives event
5. Calls `updateBookingInStore(payload.new)`
6. Store updates Map + derived array
7. Bookings page rerenders with new booking
8. Visual indicator: Brief highlight on new row

**Inventory Update Flow:**
1. Staff updates stock level
2. Server updates `inventory_items` table
3. Realtime broadcasts UPDATE event
4. Store updates item
5. Inventory page shows new stock level
6. Visual indicator: Stock level animates

## Related Code Files

### Files to Modify

- `manage-smeraldo-hotel/src/routes/+layout.svelte` - Add subscriptions
- `manage-smeraldo-hotel/src/routes/(reception)/bookings/+page.svelte` - Use booking store
- `manage-smeraldo-hotel/src/routes/(reception)/inventory/+page.svelte` - Use inventory store

### Files to Create

- `manage-smeraldo-hotel/src/lib/stores/booking-state-store.ts`
- `manage-smeraldo-hotel/src/lib/stores/inventory-state-store.ts`

## Implementation Steps

### Step 1: Booking State Store (1h)

1. Create `booking-state-store.ts`
2. Define `BookingState` interface (match DB schema + join data)
3. Create `bookingStateStore` (writable Map<id, booking>)
4. Create `bookingListStore` (derived sorted array - by check_in_date)
5. Implement helpers:
   ```ts
   export function updateBookingInStore(booking: BookingState) {
     bookingStateStore.update(map => map.set(booking.id, booking));
   }

   export function removeBookingFromStore(id: string) {
     bookingStateStore.update(map => {
       map.delete(id);
       return map;
     });
   }
   ```
6. Add unit tests

### Step 2: Inventory State Store (1h)

1. Create `inventory-state-store.ts`
2. Define `InventoryItemState` interface
3. Create `inventoryStateStore` (writable Map<id, item>)
4. Create `inventoryListStore` (derived sorted array - by item_name)
5. Implement helpers:
   ```ts
   export function updateInventoryInStore(item: InventoryItemState) {
     inventoryStateStore.update(map => map.set(item.id, item));
   }

   export function removeInventoryFromStore(id: string) {
     inventoryStateStore.update(map => {
       map.delete(id);
       return map;
     });
   }
   ```
6. Add unit tests

### Step 3: Add Subscriptions to +layout (30min)

1. Open `routes/+layout.svelte`
2. Import new stores
3. Add bookings subscription:
   ```svelte
   <script lang="ts">
   import { updateBookingInStore, removeBookingFromStore } from '$lib/stores/booking-state-store';
   import { updateInventoryInStore, removeInventoryFromStore } from '$lib/stores/inventory-state-store';

   $effect(() => {
     // Existing rooms subscription...

     // NEW: Bookings subscription
     const bookingsChannel = supabase
       .channel('bookings')
       .on('postgres_changes',
         { event: 'INSERT', schema: 'public', table: 'bookings' },
         payload => {
           updateBookingInStore(payload.new as BookingState);
           markRealtimeActivity();
         }
       )
       .on('postgres_changes',
         { event: 'UPDATE', schema: 'public', table: 'bookings' },
         payload => {
           updateBookingInStore(payload.new as BookingState);
           markRealtimeActivity();
         }
       )
       .on('postgres_changes',
         { event: 'DELETE', schema: 'public', table: 'bookings' },
         payload => {
           removeBookingFromStore(payload.old.id);
           markRealtimeActivity();
         }
       )
       .subscribe();

     // NEW: Inventory subscription
     const inventoryChannel = supabase
       .channel('inventory')
       .on('postgres_changes',
         { event: 'INSERT', schema: 'public', table: 'inventory_items' },
         payload => {
           updateInventoryInStore(payload.new as InventoryItemState);
           markRealtimeActivity();
         }
       )
       .on('postgres_changes',
         { event: 'UPDATE', schema: 'public', table: 'inventory_items' },
         payload => {
           updateInventoryInStore(payload.new as InventoryItemState);
           markRealtimeActivity();
         }
       )
       .on('postgres_changes',
         { event: 'DELETE', schema: 'public', table: 'inventory_items' },
         payload => {
           removeInventoryFromStore(payload.old.id);
           markRealtimeActivity();
         }
       )
       .subscribe();

     return () => {
       supabase.removeChannel(bookingsChannel);
       supabase.removeChannel(inventoryChannel);
     };
   });
   </script>
   ```

### Step 4: Update Bookings Page (30min)

1. Open `(reception)/bookings/+page.svelte`
2. Import `bookingListStore`
3. Replace server data with store:
   ```svelte
   <script lang="ts">
   import { bookingListStore } from '$lib/stores/booking-state-store';

   // Initialize store from server data on mount
   onMount(() => {
     data.bookings.forEach(booking => updateBookingInStore(booking));
   });
   </script>

   <!-- Render from store -->
   {#each $bookingListStore as booking (booking.id)}
     <BookingRow {booking} />
   {/each}
   ```
4. Add highlight animation for new bookings:
   ```svelte
   <div class="booking-row" class:newly-added={isNew(booking)}>
     ...
   </div>

   <style>
   .newly-added {
     animation: highlight 2s ease-out;
   }

   @keyframes highlight {
     from { background-color: #fef3c7; }
     to { background-color: transparent; }
   }
   </style>
   ```

### Step 5: Update Inventory Page (30min)

1. Open `(reception)/inventory/+page.svelte`
2. Import `inventoryListStore`
3. Replace server data with store (same pattern as bookings)
4. Add stock level change animation:
   ```svelte
   <span class="stock-level" class:stock-updated={stockChanged}>
     {item.current_stock}
   </span>

   <style>
   .stock-updated {
     animation: pulse 1s ease-out;
   }

   @keyframes pulse {
     0%, 100% { transform: scale(1); }
     50% { transform: scale(1.2); color: #10b981; }
   }
   </style>
   ```

## Todo List

- [ ] Create booking state store
- [ ] Write unit tests for booking store
- [ ] Create inventory state store
- [ ] Write unit tests for inventory store
- [ ] Add bookings subscription to +layout.svelte
- [ ] Add inventory subscription to +layout.svelte
- [ ] Update bookings page to use store
- [ ] Add highlight animation for new bookings
- [ ] Update inventory page to use store
- [ ] Add stock level animation
- [ ] Test multi-session realtime (2 browsers)
- [ ] Test network disconnect/reconnect
- [ ] Test subscription cleanup on unmount
- [ ] Verify no memory leaks (long session)

## Success Criteria

- ✓ Bookings update in realtime (no refresh needed)
- ✓ Inventory stock levels update live
- ✓ Visual indicator for new/updated items
- ✓ Subscriptions reconnect on network restore
- ✓ No performance degradation (smooth updates)
- ✓ Multi-session testing: Changes visible across browsers
- ✓ All tests pass

## Risk Assessment

### Risks

1. **Database load (too many subscriptions)**
   - Mitigation: Supabase designed for realtime, should handle <100 concurrent users
   - Monitor: Check DB metrics after deploy

2. **Memory leak (store never cleaned)**
   - Mitigation: Cleanup on component unmount, limit store size to last 1000 items
   - Test: Long session (8h) without refresh

3. **Race condition (server data vs realtime)**
   - Mitigation: Use store as single source of truth, initialize from server data
   - Test: Create booking, verify only one row appears

4. **Subscription overhead (battery drain on mobile)**
   - Mitigation: Acceptable for web app, not a mobile native app concern
   - Monitor: User feedback on mobile performance

### Mitigation Strategies

- Limit store size (max 1000 items, LRU eviction)
- Add subscription health monitoring
- Test multi-session thoroughly
- Monitor DB connection count

## Security Considerations

- ✓ RLS policies already enforce row-level access
- ✓ Subscriptions respect RLS (user only sees authorized data)
- ✓ No new attack surface (Supabase handles auth)

## Next Steps

1. Complete Phase 2, 3, 4 first
2. Implement booking and inventory stores
3. Add subscriptions to +layout.svelte
4. Update pages to use stores
5. Test realtime updates thoroughly
6. Monitor performance after deploy
7. Complete all 5 phases, then proceed to testing and finalization
