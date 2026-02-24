/**
 * Override Requests Store
 *
 * Manages room status override requests requiring manager approval.
 * Updates in realtime via Supabase subscription in +layout.svelte.
 */

import { writable, derived } from 'svelte/store';
import type { RoomStatus } from './roomState';

export interface OverrideRequest {
  id: string;
  room_id: string;
  room_number?: string; // Joined from rooms table
  requested_by: string;
  requester_name?: string; // Joined from users table
  requested_status: RoomStatus;
  current_status?: RoomStatus; // Joined from rooms table
  reason: string;
  manager_id: string | null;
  manager_name?: string; // Joined from users table
  approved_at: string | null;
  rejected_at: string | null;
  manager_comment: string | null;
  created_at: string;
}

/**
 * Main store: Map of all override requests (O(1) lookup by ID)
 */
export const overrideRequestsStore = writable<Map<string, OverrideRequest>>(new Map());

/**
 * Derived store: List of all requests sorted by created_at (newest first)
 */
export const overrideRequestListStore = derived(overrideRequestsStore, ($map) => {
  return Array.from($map.values()).sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
});

/**
 * Derived store: Only pending requests (not yet approved or rejected)
 */
export const pendingRequestsStore = derived(overrideRequestsStore, ($map) => {
  return Array.from($map.values())
    .filter((req) => !req.approved_at && !req.rejected_at)
    .sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
});

/**
 * Derived store: Pending request count (for badge indicators)
 */
export const pendingRequestCountStore = derived(pendingRequestsStore, ($pending) => {
  return $pending.length;
});

/**
 * Update or insert a request in the store
 *
 * Called by realtime subscription on INSERT/UPDATE events
 */
export function updateRequestInStore(request: OverrideRequest): void {
  overrideRequestsStore.update((map) => {
    map.set(request.id, request);
    return map;
  });
}

/**
 * Remove a request from the store
 *
 * Called by realtime subscription on DELETE events
 */
export function removeRequestFromStore(id: string): void {
  overrideRequestsStore.update((map) => {
    map.delete(id);
    return map;
  });
}

/**
 * Clear all requests from the store
 *
 * Called on logout or when switching users
 */
export function clearOverrideRequests(): void {
  overrideRequestsStore.set(new Map());
}

/**
 * Initialize store with initial data
 *
 * Called on page load with server-fetched data
 */
export function initializeOverrideRequests(requests: OverrideRequest[]): void {
  const map = new Map<string, OverrideRequest>();
  requests.forEach((req) => map.set(req.id, req));
  overrideRequestsStore.set(map);
}

/**
 * Get a single request by ID
 */
export function getRequestById(id: string): OverrideRequest | undefined {
  let request: OverrideRequest | undefined;
  const unsubscribe = overrideRequestsStore.subscribe((map) => {
    request = map.get(id);
  });
  unsubscribe();
  return request;
}
