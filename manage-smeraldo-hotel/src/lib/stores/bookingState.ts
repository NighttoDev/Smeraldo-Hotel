// Live booking map from Supabase Realtime — subscribe in +layout.svelte only
import { writable, derived } from 'svelte/store';

export type BookingStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
export type BookingSource = 'agoda' | 'booking_com' | 'trip_com' | 'facebook' | 'walk_in';

export interface BookingState {
	id: string;
	room_id: string;
	guest_id: string;
	check_in_date: string;
	check_out_date: string;
	nights_count: number | null;
	booking_source: BookingSource | null;
	status: BookingStatus;
	created_by: string | null;
	created_at: string | null;
	updated_at: string | null;
}

/** All bookings keyed by ID for O(1) lookup */
export const bookingStateStore = writable<Map<string, BookingState>>(new Map());

/** Derived: all bookings as array sorted by check_in_date descending (newest first) */
export const bookingListStore = derived(bookingStateStore, ($bookings) =>
	Array.from($bookings.values()).sort((a, b) => {
		// Sort by check_in_date descending
		return new Date(b.check_in_date).getTime() - new Date(a.check_in_date).getTime();
	})
);

/** Derived: active bookings (confirmed or checked_in) */
export const activeBookingsStore = derived(bookingStateStore, ($bookings) =>
	Array.from($bookings.values())
		.filter((b) => b.status === 'confirmed' || b.status === 'checked_in')
		.sort((a, b) => new Date(a.check_in_date).getTime() - new Date(b.check_in_date).getTime())
);

/** Derived: count by status */
export const bookingStatusCountsStore = derived(bookingStateStore, ($bookings) => {
	const counts = {
		confirmed: 0,
		checked_in: 0,
		checked_out: 0,
		cancelled: 0
	};
	for (const booking of $bookings.values()) {
		if (booking.status in counts) {
			counts[booking.status as BookingStatus]++;
		}
	}
	return counts;
});

/** Initialize the store from server data */
export function initBookingState(bookings: BookingState[]): void {
	const map = new Map<string, BookingState>();
	for (const booking of bookings) {
		map.set(booking.id, booking);
	}
	bookingStateStore.set(map);
}

/** Update a single booking in the store (from Realtime) */
export function updateBookingInStore(booking: BookingState): void {
	bookingStateStore.update((map) => {
		const newMap = new Map(map);
		newMap.set(booking.id, booking);
		return newMap;
	});
}

/** Remove a booking from the store (from Realtime DELETE) */
export function removeBookingFromStore(bookingId: string): void {
	bookingStateStore.update((map) => {
		const newMap = new Map(map);
		newMap.delete(bookingId);
		return newMap;
	});
}
