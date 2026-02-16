// Server-only — never import from .svelte components
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingSource } from '$lib/db/schema';

export type { BookingSource };
export type BookingStatus = 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out';

export interface BookingRow {
	id: string;
	room_id: string;
	guest_id: string;
	check_in_date: string;
	check_out_date: string;
	nights_count: number;
	booking_source: BookingSource | null;
	status: string;
	created_by: string | null;
	created_at: string;
	updated_at: string;
}

export interface BookingInsert {
	room_id: string;
	guest_id: string;
	check_in_date: string; // YYYY-MM-DD
	check_out_date: string; // YYYY-MM-DD
	booking_source: BookingSource;
	created_by: string;
}

/**
 * Create a new booking. Returns the created row.
 * ⚠️ Do NOT include nights_count — it is GENERATED ALWAYS in Postgres.
 */
export async function createBooking(
	supabase: SupabaseClient,
	data: BookingInsert
): Promise<BookingRow> {
	const { data: booking, error } = await supabase
		.from('bookings')
		.insert({
			room_id: data.room_id,
			guest_id: data.guest_id,
			check_in_date: data.check_in_date,
			check_out_date: data.check_out_date,
			booking_source: data.booking_source,
			status: 'confirmed',
			created_by: data.created_by
		})
		.select()
		.single();

	if (error || !booking) {
		throw new Error(`createBooking failed: ${error?.message ?? 'No data returned'}`);
	}

	return booking as BookingRow;
}

/**
 * Fetch all confirmed/checked-in bookings for a given room.
 */
export async function getBookingsByRoom(
	supabase: SupabaseClient,
	roomId: string
): Promise<BookingRow[]> {
	const { data, error } = await supabase
		.from('bookings')
		.select('id, room_id, guest_id, check_in_date, check_out_date, nights_count, booking_source, status, created_by, created_at, updated_at')
		.eq('room_id', roomId)
		.in('status', ['confirmed', 'checked_in'])
		.order('check_in_date', { ascending: false });

	if (error) {
		throw new Error(`getBookingsByRoom failed: ${error.message}`);
	}

	return (data ?? []) as BookingRow[];
}

/**
 * Fetch all bookings (all statuses), ordered by creation date desc.
 * Used for the booking list view (Story 3.4).
 */
export async function getAllBookings(supabase: SupabaseClient): Promise<BookingRow[]> {
	const { data, error } = await supabase
		.from('bookings')
		.select('id, room_id, guest_id, check_in_date, check_out_date, nights_count, booking_source, status, created_by, created_at, updated_at')
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(`getAllBookings failed: ${error.message}`);
	}

	return (data ?? []) as BookingRow[];
}
