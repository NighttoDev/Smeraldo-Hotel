import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createBooking,
	getBookingById,
	getBookingsByRoom,
	getAllBookings,
	getTodaysBookings,
	checkInBooking,
	getOccupiedBookings,
	checkOutBooking,
	rollbackCheckOut,
	validateBookingOwnership
} from './bookings';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Mock helpers ──────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockOrder = vi.fn();

function makeMockSupabase(): SupabaseClient {
	return {
		from: vi.fn(() => ({
			insert: mockInsert,
			select: mockSelect,
			update: mockUpdate
		}))
	} as unknown as SupabaseClient;
}

beforeEach(() => {
	vi.resetAllMocks();
	// insert chain: .insert().select().single()
	mockInsert.mockReturnValue({ select: mockSelect });
	// update chain: .update().eq()
	mockUpdate.mockReturnValue({ eq: mockEq });
	// select chain: .select().eq().in().order() / .maybySingle()
	mockSelect.mockReturnValue({
		single: mockSingle,
		eq: mockEq,
		in: mockIn,
		order: mockOrder
	});
	mockEq.mockReturnValue({ in: mockIn, order: mockOrder, eq: mockEq, maybeSingle: mockMaybeSingle });
	mockIn.mockReturnValue({ order: mockOrder });
	mockOrder.mockReturnValue({ order: mockOrder });
});

// ── createBooking ─────────────────────────────────────────────────────────────

describe('createBooking', () => {
	const baseInsert = {
		room_id: 'room-uuid-1',
		guest_id: 'guest-uuid-1',
		check_in_date: '2026-03-01',
		check_out_date: '2026-03-05',
		booking_source: 'agoda' as const,
		created_by: 'staff-uuid-1'
	};

	it('creates a booking and returns the row', async () => {
		const mockRow = {
			id: 'booking-uuid-1',
			...baseInsert,
			nights_count: 4,
			status: 'confirmed',
			created_at: '2026-02-16T00:00:00Z',
			updated_at: '2026-02-16T00:00:00Z'
		};
		mockSingle.mockResolvedValue({ data: mockRow, error: null });

		const supabase = makeMockSupabase();
		const result = await createBooking(supabase, baseInsert);

		expect(result).toEqual(mockRow);
		expect(result.status).toBe('confirmed');
		// nights_count comes from DB, not the insert
		expect(result.nights_count).toBe(4);
	});

	it('does NOT include nights_count in the insert payload (GENERATED ALWAYS)', async () => {
		mockSingle.mockResolvedValue({ data: { id: 'x', ...baseInsert, nights_count: 4, status: 'confirmed', created_at: '', updated_at: '' }, error: null });

		const supabase = makeMockSupabase();
		await createBooking(supabase, baseInsert);

		// Verify insert was called WITHOUT nights_count
		const insertArg = mockInsert.mock.calls[0][0];
		expect(insertArg).not.toHaveProperty('nights_count');
	});

	it('throws when Supabase returns an error', async () => {
		mockSingle.mockResolvedValue({ data: null, error: { message: 'Room not found' } });

		const supabase = makeMockSupabase();
		await expect(createBooking(supabase, baseInsert)).rejects.toThrow(
			'createBooking failed: Room not found'
		);
	});

	it('throws when Supabase returns null data without error', async () => {
		mockSingle.mockResolvedValue({ data: null, error: null });

		const supabase = makeMockSupabase();
		await expect(createBooking(supabase, baseInsert)).rejects.toThrow(
			'createBooking failed: No data returned'
		);
	});
});

// ── getBookingsByRoom ─────────────────────────────────────────────────────────

describe('getBookingsByRoom', () => {
	it('returns bookings for a room', async () => {
		const mockRows = [
			{
				id: 'booking-uuid-1',
				room_id: 'room-uuid-1',
				guest_id: 'guest-uuid-1',
				check_in_date: '2026-03-01',
				check_out_date: '2026-03-05',
				nights_count: 4,
				booking_source: 'agoda',
				status: 'confirmed',
				created_by: 'staff-uuid-1',
				created_at: '2026-02-16T00:00:00Z',
				updated_at: '2026-02-16T00:00:00Z'
			}
		];
		mockOrder.mockResolvedValue({ data: mockRows, error: null });

		const supabase = makeMockSupabase();
		const result = await getBookingsByRoom(supabase, 'room-uuid-1');

		expect(result).toHaveLength(1);
		expect(result[0].room_id).toBe('room-uuid-1');
	});

	it('returns empty array when no bookings found', async () => {
		mockOrder.mockResolvedValue({ data: null, error: null });

		const supabase = makeMockSupabase();
		const result = await getBookingsByRoom(supabase, 'room-uuid-no-bookings');

		expect(result).toEqual([]);
	});

	it('throws when Supabase returns an error', async () => {
		mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } });

		const supabase = makeMockSupabase();
		await expect(getBookingsByRoom(supabase, 'room-uuid-1')).rejects.toThrow(
			'getBookingsByRoom failed: DB error'
		);
	});
});

// ── getAllBookings ─────────────────────────────────────────────────────────────

describe('getAllBookings', () => {
	it('returns all bookings ordered by created_at desc', async () => {
		const mockRows = [{ id: 'b2', created_at: '2026-03-02' }, { id: 'b1', created_at: '2026-03-01' }];
		mockOrder.mockResolvedValue({ data: mockRows, error: null });

		const supabase = makeMockSupabase();
		const result = await getAllBookings(supabase);

		expect(result).toHaveLength(2);
	});

	it('throws on Supabase error', async () => {
		mockOrder.mockResolvedValue({ data: null, error: { message: 'Query error' } });

		const supabase = makeMockSupabase();
		await expect(getAllBookings(supabase)).rejects.toThrow('getAllBookings failed: Query error');
	});
});

// ── getBookingById ────────────────────────────────────────────────────────────

describe('getBookingById', () => {
	const mockRow = {
		id: 'booking-uuid-1',
		room_id: 'room-uuid-1',
		guest_id: 'guest-uuid-1',
		check_in_date: '2026-02-16',
		check_out_date: '2026-02-18',
		nights_count: 2,
		booking_source: 'agoda',
		status: 'confirmed',
		created_by: 'staff-uuid-1',
		created_at: '2026-02-01T00:00:00Z',
		updated_at: '2026-02-01T00:00:00Z'
	};

	it('returns a booking row when found', async () => {
		mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
		mockMaybeSingle.mockResolvedValue({ data: mockRow, error: null });

		const supabase = makeMockSupabase();
		const result = await getBookingById(supabase, 'booking-uuid-1');

		expect(result).not.toBeNull();
		expect(result?.id).toBe('booking-uuid-1');
		expect(result?.room_id).toBe('room-uuid-1');
	});

	it('returns null when no booking found', async () => {
		mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
		mockMaybeSingle.mockResolvedValue({ data: null, error: null });

		const supabase = makeMockSupabase();
		const result = await getBookingById(supabase, 'booking-uuid-missing');

		expect(result).toBeNull();
	});

	it('throws on Supabase error', async () => {
		mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
		mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

		const supabase = makeMockSupabase();
		await expect(getBookingById(supabase, 'booking-uuid-1')).rejects.toThrow(
			'getBookingById failed: DB error'
		);
	});
});

// ── getTodaysBookings ──────────────────────────────────────────────────────────

describe('getTodaysBookings', () => {
	const mockRows = [
		{
			id: 'booking-uuid-1',
			room_id: 'room-uuid-1',
			guest_id: 'guest-uuid-1',
			check_in_date: '2026-02-16',
			check_out_date: '2026-02-18',
			nights_count: 2,
			booking_source: 'agoda',
			status: 'confirmed',
			created_by: 'staff-uuid-1',
			created_at: '2026-02-01T00:00:00Z',
			updated_at: '2026-02-01T00:00:00Z',
			guest: { id: 'guest-uuid-1', full_name: 'Nguyễn Văn A' }
		}
	];

	it('returns all bookings arriving today', async () => {
		// Chain: .select().eq().eq() — last eq is awaited
		mockEq.mockReturnValueOnce({ eq: mockEq }).mockResolvedValueOnce({ data: mockRows, error: null });

		const supabase = makeMockSupabase();
		const result = await getTodaysBookings(supabase, '2026-02-16');

		expect(result).toHaveLength(1);
		expect(result[0].guest.full_name).toBe('Nguyễn Văn A');
	});

	it('returns empty array when no bookings today', async () => {
		mockEq.mockReturnValueOnce({ eq: mockEq }).mockResolvedValueOnce({ data: null, error: null });

		const supabase = makeMockSupabase();
		const result = await getTodaysBookings(supabase, '2026-02-16');

		expect(result).toEqual([]);
	});

	it('throws on Supabase error', async () => {
		mockEq.mockReturnValueOnce({ eq: mockEq }).mockResolvedValueOnce({
			data: null,
			error: { message: 'Query failed' }
		});

		const supabase = makeMockSupabase();
		await expect(getTodaysBookings(supabase, '2026-02-16')).rejects.toThrow(
			'getTodaysBookings failed: Query failed'
		);
	});
});

// ── checkInBooking ────────────────────────────────────────────────────────────

describe('checkInBooking', () => {
	it('updates guest name and marks booking as checked_in', async () => {
		// Two sequential update chains: guests.update().eq(), bookings.update().eq()
		mockEq.mockResolvedValue({ data: null, error: null });

		const supabase = makeMockSupabase();
		await expect(
			checkInBooking(supabase, 'booking-uuid-1', 'guest-uuid-1', 'Nguyễn Văn A')
		).resolves.toBeUndefined();

		// Both update calls were made
		expect(mockUpdate).toHaveBeenCalledTimes(2);
		expect(mockUpdate).toHaveBeenNthCalledWith(1, { full_name: 'Nguyễn Văn A' });
		expect(mockUpdate).toHaveBeenNthCalledWith(2, { status: 'checked_in' });
	});

	it('throws when guest update fails', async () => {
		mockEq.mockResolvedValueOnce({ data: null, error: { message: 'Guest not found' } });

		const supabase = makeMockSupabase();
		await expect(
			checkInBooking(supabase, 'booking-uuid-1', 'guest-uuid-bad', 'Name')
		).rejects.toThrow('checkInBooking: guest update failed: Guest not found');
	});

	it('throws when booking update fails', async () => {
		mockEq
			.mockResolvedValueOnce({ data: null, error: null }) // guest update succeeds
			.mockResolvedValueOnce({ data: null, error: { message: 'Booking not found' } }); // booking update fails

		const supabase = makeMockSupabase();
		await expect(
			checkInBooking(supabase, 'booking-uuid-bad', 'guest-uuid-1', 'Name')
		).rejects.toThrow('checkInBooking: booking update failed: Booking not found');
	});
});

// ── getOccupiedBookings ───────────────────────────────────────────────────────

describe('getOccupiedBookings', () => {
	const mockRows = [
		{
			id: 'booking-uuid-1',
			room_id: 'room-uuid-1',
			guest_id: 'guest-uuid-1',
			check_in_date: '2026-02-16',
			check_out_date: '2026-02-18',
			nights_count: 2,
			booking_source: 'agoda',
			status: 'checked_in',
			created_by: 'staff-uuid-1',
			created_at: '2026-02-01T00:00:00Z',
			updated_at: '2026-02-01T00:00:00Z',
			guest: { id: 'guest-uuid-1', full_name: 'Nguyễn Văn A' }
		}
	];

	it('returns all checked-in bookings with guest data', async () => {
		mockEq.mockResolvedValue({ data: mockRows, error: null });

		const supabase = makeMockSupabase();
		const result = await getOccupiedBookings(supabase);

		expect(result).toHaveLength(1);
		expect(result[0].status).toBe('checked_in');
		expect(result[0].guest.full_name).toBe('Nguyễn Văn A');
	});

	it('returns empty array when no checked-in bookings', async () => {
		mockEq.mockResolvedValue({ data: null, error: null });

		const supabase = makeMockSupabase();
		const result = await getOccupiedBookings(supabase);

		expect(result).toEqual([]);
	});

	it('throws on Supabase error', async () => {
		mockEq.mockResolvedValue({ data: null, error: { message: 'DB error' } });

		const supabase = makeMockSupabase();
		await expect(getOccupiedBookings(supabase)).rejects.toThrow(
			'getOccupiedBookings failed: DB error'
		);
	});
});

// ── checkOutBooking ───────────────────────────────────────────────────────────

describe('checkOutBooking', () => {
	it('updates booking status to checked_out', async () => {
		mockEq.mockResolvedValue({ data: null, error: null });

		const supabase = makeMockSupabase();
		await expect(checkOutBooking(supabase, 'booking-uuid-1')).resolves.toBeUndefined();

		expect(mockUpdate).toHaveBeenCalledWith({ status: 'checked_out' });
	});

	it('throws when Supabase returns an error', async () => {
		mockEq.mockResolvedValue({ data: null, error: { message: 'Booking not found' } });

		const supabase = makeMockSupabase();
		await expect(checkOutBooking(supabase, 'booking-uuid-bad')).rejects.toThrow(
			'checkOutBooking failed: Booking not found'
		);
	});
});

// ── rollbackCheckOut ──────────────────────────────────────────────────────────
// FIX #1: Tests for compensating transaction rollback

describe('rollbackCheckOut', () => {
	it('reverts booking status back to checked_in', async () => {
		mockEq.mockResolvedValue({ data: null, error: null });

		const supabase = makeMockSupabase();
		await expect(rollbackCheckOut(supabase, 'booking-uuid-1')).resolves.toBeUndefined();

		expect(mockUpdate).toHaveBeenCalledWith({ status: 'checked_in' });
	});

	it('throws when rollback fails', async () => {
		mockEq.mockResolvedValue({ data: null, error: { message: 'Rollback failed' } });

		const supabase = makeMockSupabase();
		await expect(rollbackCheckOut(supabase, 'booking-uuid-1')).rejects.toThrow(
			'rollbackCheckOut failed: Rollback failed'
		);
	});
});

// ── validateBookingOwnership ──────────────────────────────────────────────────
// FIX #6: Tests for shared validation helper

describe('validateBookingOwnership', () => {
	const mockBooking = {
		id: 'booking-uuid-1',
		room_id: 'room-uuid-1',
		guest_id: 'guest-uuid-1',
		check_in_date: '2026-02-16',
		check_out_date: '2026-02-18',
		nights_count: 2,
		booking_source: 'agoda' as const,
		status: 'confirmed',
		created_by: 'staff-uuid-1',
		created_at: '2026-02-01T00:00:00Z',
		updated_at: '2026-02-01T00:00:00Z'
	};

	it('validates when booking matches room_id', () => {
		const result = validateBookingOwnership(mockBooking, 'room-uuid-1');
		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it('returns error when booking is null', () => {
		const result = validateBookingOwnership(null, 'room-uuid-1');
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Không tìm thấy đặt phòng');
	});

	it('returns error when booking belongs to different room', () => {
		const result = validateBookingOwnership(mockBooking, 'different-room-uuid');
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Đặt phòng không khớp với phòng được chọn');
	});
});
