// Server-only — never import from .svelte components
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingSource, BookingWithGuest, BookingListItem, BookingDetail } from '$lib/db/schema';

export type { BookingSource, BookingWithGuest, BookingListItem, BookingDetail };
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

// BookingWithGuest is re-exported from $lib/db/schema (shared with .svelte files)

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
 * Fetch all confirmed bookings arriving today, for all rooms.
 * Used by the room diagram page to show which rooms have a check-in today.
 */
export async function getTodaysBookings(
	supabase: SupabaseClient,
	todayDate: string // YYYY-MM-DD in VN timezone
): Promise<BookingWithGuest[]> {
	const { data, error } = await supabase
		.from('bookings')
		.select('*, guest:guests(id, full_name)')
		.eq('status', 'confirmed')
		.eq('check_in_date', todayDate);

	if (error) {
		throw new Error(`getTodaysBookings failed: ${error.message}`);
	}

	return (data ?? []) as BookingWithGuest[];
}

/**
 * Mark a booking as checked_in and update the guest's full_name if it was edited.
 */
export async function checkInBooking(
	supabase: SupabaseClient,
	bookingId: string,
	guestId: string,
	guestName: string
): Promise<void> {
	// Update guest name first (if reception edited it in the dialog)
	const { error: guestError } = await supabase
		.from('guests')
		.update({ full_name: guestName })
		.eq('id', guestId);

	if (guestError) {
		throw new Error(`checkInBooking: guest update failed: ${guestError.message}`);
	}

	// Mark booking as checked_in
	const { error: bookingError } = await supabase
		.from('bookings')
		.update({ status: 'checked_in' })
		.eq('id', bookingId);

	if (bookingError) {
		throw new Error(`checkInBooking: booking update failed: ${bookingError.message}`);
	}
}

/**
 * Fetch a single booking by ID. Returns null if not found.
 */
export async function getBookingById(
	supabase: SupabaseClient,
	bookingId: string
): Promise<BookingRow | null> {
	const { data, error } = await supabase
		.from('bookings')
		.select(
			'id, room_id, guest_id, check_in_date, check_out_date, nights_count, booking_source, status, created_by, created_at, updated_at'
		)
		.eq('id', bookingId)
		.maybeSingle();

	if (error) {
		throw new Error(`getBookingById failed: ${error.message}`);
	}

	return data as BookingRow | null;
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

/**
 * Fetch booking list rows with guest + room joins for the bookings index page.
 */
export async function getBookingListItems(supabase: SupabaseClient): Promise<BookingListItem[]> {
	const { data, error } = await supabase
		.from('bookings')
		.select(
			'id, room_id, guest_id, check_in_date, check_out_date, nights_count, booking_source, status, created_at, guest:guests(id, full_name), room:rooms(id, room_number, floor)'
		)
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(`getBookingListItems failed: ${error.message}`);
	}

	return (data ?? []).map((row) => {
		const raw = row as BookingListItem & {
			guest: BookingListItem['guest'][] | BookingListItem['guest'];
			room: BookingListItem['room'][] | BookingListItem['room'];
		};
		const guest = Array.isArray(raw.guest) ? raw.guest[0] : raw.guest;
		const room = Array.isArray(raw.room) ? raw.room[0] : raw.room;
		if (!guest || !room) {
			throw new Error('getBookingListItems failed: Missing guest or room relation');
		}
		return { ...raw, guest, room };
	});
}

/**
 * Fetch a booking detail row by ID with guest + room joins. Returns null if not found.
 */
export async function getBookingDetailById(
	supabase: SupabaseClient,
	bookingId: string
): Promise<BookingDetail | null> {
	const { data, error } = await supabase
		.from('bookings')
		.select(
			'id, room_id, guest_id, check_in_date, check_out_date, nights_count, booking_source, status, created_by, created_at, updated_at, guest:guests(id, full_name), room:rooms(id, room_number, floor, room_type, status)'
		)
		.eq('id', bookingId)
		.maybeSingle();

	if (error) {
		throw new Error(`getBookingDetailById failed: ${error.message}`);
	}
	if (!data) {
		return null;
	}

	const raw = data as BookingDetail & {
		guest: BookingDetail['guest'][] | BookingDetail['guest'];
		room: BookingDetail['room'][] | BookingDetail['room'];
	};
	const guest = Array.isArray(raw.guest) ? raw.guest[0] : raw.guest;
	const room = Array.isArray(raw.room) ? raw.room[0] : raw.room;
	if (!guest || !room) {
		throw new Error('getBookingDetailById failed: Missing guest or room relation');
	}

	return { ...raw, guest, room };
}

/**
 * Fetch all currently checked-in bookings with guest details.
 * Used by the room diagram page for check-out dialog routing.
 */
export async function getOccupiedBookings(
	supabase: SupabaseClient
): Promise<BookingWithGuest[]> {
	const { data, error } = await supabase
		.from('bookings')
		.select('*, guest:guests(id, full_name)')
		.eq('status', 'checked_in');

	if (error) {
		throw new Error(`getOccupiedBookings failed: ${error.message}`);
	}

	return (data ?? []) as BookingWithGuest[];
}

/**
 * Mark a booking as checked_out.
 */
export async function checkOutBooking(
	supabase: SupabaseClient,
	bookingId: string
): Promise<void> {
	const { error } = await supabase
		.from('bookings')
		.update({ status: 'checked_out' })
		.eq('id', bookingId);

	if (error) {
		throw new Error(`checkOutBooking failed: ${error.message}`);
	}
}

/**
 * Update editable booking fields. Nights are recalculated by DB generated column.
 */
export async function updateBookingById(
	supabase: SupabaseClient,
	bookingId: string,
	updates: Pick<BookingInsert, 'room_id' | 'check_in_date' | 'check_out_date' | 'booking_source'>
): Promise<void> {
	const { error } = await supabase
		.from('bookings')
		.update({
			room_id: updates.room_id,
			check_in_date: updates.check_in_date,
			check_out_date: updates.check_out_date,
			booking_source: updates.booking_source
		})
		.eq('id', bookingId);

	if (error) {
		throw new Error(`updateBookingById failed: ${error.message}`);
	}
}

/**
 * Cancel a booking by setting its status to cancelled.
 */
export async function cancelBookingById(
	supabase: SupabaseClient,
	bookingId: string
): Promise<void> {
	const { error } = await supabase
		.from('bookings')
		.update({ status: 'cancelled' })
		.eq('id', bookingId);

	if (error) {
		throw new Error(`cancelBookingById failed: ${error.message}`);
	}
}

/**
 * Rollback a booking from cancelled to a previous status (compensating transaction).
 */
export async function rollbackCancelledBooking(
	supabase: SupabaseClient,
	bookingId: string,
	previousStatus: BookingStatus
): Promise<void> {
	const { error } = await supabase
		.from('bookings')
		.update({ status: previousStatus })
		.eq('id', bookingId);

	if (error) {
		throw new Error(`rollbackCancelledBooking failed: ${error.message}`);
	}
}

/**
 * Rollback a booking from checked_out to checked_in (compensating transaction).
 * Used when check-out fails after booking update.
 */
export async function rollbackCheckOut(
	supabase: SupabaseClient,
	bookingId: string
): Promise<void> {
	const { error } = await supabase
		.from('bookings')
		.update({ status: 'checked_in' })
		.eq('id', bookingId);

	if (error) {
		throw new Error(`rollbackCheckOut failed: ${error.message}`);
	}
}

/**
 * Validate that a booking belongs to the specified room.
 * Returns validation result with error message if invalid.
 */
export function validateBookingOwnership(
	booking: BookingRow | null,
	roomId: string
): { valid: boolean; error?: string } {
	if (!booking) {
		return { valid: false, error: 'Không tìm thấy đặt phòng' };
	}
	if (booking.room_id !== roomId) {
		return { valid: false, error: 'Đặt phòng không khớp với phòng được chọn' };
	}
	return { valid: true };
}
