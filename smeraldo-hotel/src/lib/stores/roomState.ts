// Live room map from Supabase Realtime — subscribe in +layout.svelte only
import { writable, derived } from 'svelte/store';

export type RoomStatus = 'available' | 'occupied' | 'checking_out_today' | 'being_cleaned' | 'ready';

export interface RoomState {
	id: string;
	room_number: string;
	floor: number;
	room_type: string;
	status: RoomStatus;
	current_guest_name: string | null;
}

export interface RoomStatusCounts {
	available: number;
	occupied: number;
	checking_out_today: number;
	being_cleaned: number;
	ready: number;
}

/** All rooms keyed by ID for O(1) lookup */
export const roomStateStore = writable<Map<string, RoomState>>(new Map());

/** Derived: all rooms as array sorted by floor, room_number */
export const roomListStore = derived(roomStateStore, ($rooms) =>
	Array.from($rooms.values()).sort((a, b) => {
		if (a.floor !== b.floor) return a.floor - b.floor;
		return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
	})
);

/** Derived: counts per status */
export const roomStatusCountsStore = derived(roomStateStore, ($rooms) => {
	const counts: RoomStatusCounts = {
		available: 0,
		occupied: 0,
		checking_out_today: 0,
		being_cleaned: 0,
		ready: 0
	};
	for (const room of $rooms.values()) {
		if (room.status in counts) {
			counts[room.status]++;
		}
	}
	return counts;
});

/** Derived: unique floors sorted ascending */
export const floorsStore = derived(roomListStore, ($rooms) =>
	[...new Set($rooms.map((r) => r.floor))].sort((a, b) => a - b)
);

/** Initialize the store from server data */
export function initRoomState(rooms: RoomState[]): void {
	const map = new Map<string, RoomState>();
	for (const room of rooms) {
		map.set(room.id, room);
	}
	roomStateStore.set(map);
}

/** Update a single room in the store (from Realtime) */
export function updateRoomInStore(room: RoomState): void {
	roomStateStore.update((map) => {
		const newMap = new Map(map);
		newMap.set(room.id, room);
		return newMap;
	});
}
