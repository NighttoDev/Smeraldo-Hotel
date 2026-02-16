import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getActiveRoomsForBooking } from './rooms';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Mock helpers ──────────────────────────────────────────────────────────────

// Chain: .from() → .select() → .in() → .order(floor) → .order(room_number) [awaited]
const mockOrderFinal = vi.fn(); // second .order() — the awaited one
const mockOrderFirst = vi.fn(); // first .order()
const mockIn = vi.fn();
const mockSelect = vi.fn();

function makeMockSupabase(): SupabaseClient {
	return {
		from: vi.fn(() => ({ select: mockSelect }))
	} as unknown as SupabaseClient;
}

beforeEach(() => {
	vi.resetAllMocks();
	mockSelect.mockReturnValue({ in: mockIn });
	mockIn.mockReturnValue({ order: mockOrderFirst });
	mockOrderFirst.mockReturnValue({ order: mockOrderFinal });
});

// ── getActiveRoomsForBooking ──────────────────────────────────────────────────

describe('getActiveRoomsForBooking', () => {
	it('returns rooms with status available or ready', async () => {
		const mockRooms = [
			{
				id: 'room-1',
				room_number: '101',
				floor: 1,
				room_type: 'standard',
				status: 'available',
				current_guest_name: null,
				created_at: '2026-01-01T00:00:00Z',
				updated_at: '2026-01-01T00:00:00Z'
			},
			{
				id: 'room-2',
				room_number: '102',
				floor: 1,
				room_type: 'deluxe',
				status: 'ready',
				current_guest_name: null,
				created_at: '2026-01-01T00:00:00Z',
				updated_at: '2026-01-01T00:00:00Z'
			}
		];
		mockOrderFinal.mockResolvedValue({ data: mockRooms, error: null });

		const supabase = makeMockSupabase();
		const result = await getActiveRoomsForBooking(supabase);

		expect(result).toHaveLength(2);
		expect(result.every((r) => ['available', 'ready'].includes(r.status))).toBe(true);
		expect(supabase.from).toHaveBeenCalledWith('rooms');
		expect(mockIn).toHaveBeenCalledWith('status', ['available', 'ready']);
	});

	it('returns empty array when no available or ready rooms exist', async () => {
		mockOrderFinal.mockResolvedValue({ data: null, error: null });

		const supabase = makeMockSupabase();
		const result = await getActiveRoomsForBooking(supabase);

		expect(result).toEqual([]);
	});

	it('throws when Supabase returns an error', async () => {
		mockOrderFinal.mockResolvedValue({ data: null, error: { message: 'Connection failed' } });

		const supabase = makeMockSupabase();
		await expect(getActiveRoomsForBooking(supabase)).rejects.toThrow(
			'Failed to fetch rooms for booking: Connection failed'
		);
	});
});
