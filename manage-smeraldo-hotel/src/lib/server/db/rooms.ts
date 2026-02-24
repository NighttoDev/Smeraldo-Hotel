// Server-only — never import from .svelte components
import type { SupabaseClient } from '@supabase/supabase-js';

/** Room status enum values */
export type RoomStatus = 'available' | 'occupied' | 'checking_out_today' | 'being_cleaned' | 'ready';

export interface RoomRow {
	id: string;
	room_number: string;
	floor: number;
	room_type: string;
	status: RoomStatus;
	current_guest_name: string | null;
	created_at: string;
	updated_at: string;
}

export interface RoomStatusCounts {
	available: number;
	occupied: number;
	checking_out_today: number;
	being_cleaned: number;
	ready: number;
}

export const BRD_ROOM_NUMBERS = [
	'301',
	'302',
	'303',
	'304',
	'401',
	'402',
	'403',
	'404',
	'501',
	'502',
	'503',
	'504',
	'601',
	'602',
	'603',
	'604',
	'701',
	'702',
	'703',
	'704',
	'801',
	'802',
	'901',
	'902'
] as const;

/**
 * Fetch all rooms ordered by floor ASC, room_number ASC.
 */
export async function getAllRooms(supabase: SupabaseClient): Promise<RoomRow[]> {
	const { data, error } = await supabase
		.from('rooms')
		.select('id, room_number, floor, room_type, status, current_guest_name, created_at, updated_at')
		.order('floor', { ascending: true })
		.order('room_number', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch rooms: ${error.message}`);
	}

	return (data ?? []) as RoomRow[];
}

/**
 * Fetch rooms filtered by floor.
 */
export async function getRoomsByFloor(supabase: SupabaseClient, floor: number): Promise<RoomRow[]> {
	const { data, error } = await supabase
		.from('rooms')
		.select('id, room_number, floor, room_type, status, current_guest_name, created_at, updated_at')
		.eq('floor', floor)
		.order('room_number', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch rooms for floor ${floor}: ${error.message}`);
	}

	return (data ?? []) as RoomRow[];
}

/**
 * Fetch rooms that need cleaning (status = 'checking_out_today' or 'being_cleaned').
 * Used by housekeeping view.
 */
export async function getRoomsNeedingCleaning(supabase: SupabaseClient): Promise<RoomRow[]> {
	const { data, error } = await supabase
		.from('rooms')
		.select('id, room_number, floor, room_type, status, current_guest_name, created_at, updated_at')
		.in('status', ['checking_out_today', 'being_cleaned'])
		.order('floor', { ascending: true })
		.order('room_number', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch rooms needing cleaning: ${error.message}`);
	}

	return (data ?? []) as RoomRow[];
}

/**
 * Update a room's status. Returns the updated room row.
 */
export async function updateRoomStatus(
	supabase: SupabaseClient,
	roomId: string,
	newStatus: RoomStatus,
	guestName?: string | null
): Promise<RoomRow> {
	const updates: Record<string, unknown> = {
		status: newStatus,
		updated_at: new Date().toISOString()
	};
	if (guestName !== undefined) {
		updates.current_guest_name = guestName;
	}
	// Clear guest name when marking available or ready
	if (newStatus === 'available' || newStatus === 'ready') {
		updates.current_guest_name = null;
	}

	const { data, error } = await supabase
		.from('rooms')
		.update(updates)
		.eq('id', roomId)
		.select()
		.single();

	if (error || !data) {
		throw new Error(error?.message ?? 'Failed to update room status');
	}

	return data as RoomRow;
}

/**
 * Get a single room by ID. Returns null if not found.
 */
export async function getRoomById(
	supabase: SupabaseClient,
	id: string
): Promise<RoomRow | null> {
	const { data, error } = await supabase
		.from('rooms')
		.select('id, room_number, floor, room_type, status, current_guest_name, created_at, updated_at')
		.eq('id', id)
		.maybeSingle();

	if (error) {
		throw new Error(`Failed to fetch room: ${error.message}`);
	}

	return data as RoomRow | null;
}

/**
 * Insert a room status log entry (audit trail). Insert-only — never update or delete.
 */
export async function insertRoomStatusLog(
	supabase: SupabaseClient,
	roomId: string,
	previousStatus: RoomStatus | null,
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
			notes: notes ?? null
		});

	if (error) {
		throw new Error(`Failed to insert room status log: ${error.message}`);
	}
}

/**
 * Fetch rooms available for a new booking selection (status = 'available' or 'ready').
 * Ordered by floor ASC, room_number ASC.
 */
export async function getActiveRoomsForBooking(supabase: SupabaseClient): Promise<RoomRow[]> {
	const { data, error } = await supabase
		.from('rooms')
		.select('id, room_number, floor, room_type, status, current_guest_name, created_at, updated_at')
		.in('status', ['available', 'ready'])
		.order('floor', { ascending: true })
		.order('room_number', { ascending: true });

	if (error) {
		throw new Error(`Failed to fetch rooms for booking: ${error.message}`);
	}

	return (data ?? []) as RoomRow[];
}

/**
 * Calculate room status counts from a list of rooms.
 */
export function calculateStatusCounts(rooms: RoomRow[]): RoomStatusCounts {
	const counts: RoomStatusCounts = {
		available: 0,
		occupied: 0,
		checking_out_today: 0,
		being_cleaned: 0,
		ready: 0
	};

	for (const room of rooms) {
		const status = room.status as keyof RoomStatusCounts;
		if (status in counts) {
			counts[status]++;
		}
	}

	return counts;
}
