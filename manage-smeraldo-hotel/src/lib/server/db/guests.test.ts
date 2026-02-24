import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGuest, getGuestById, updateGuestNameById } from './guests';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Mock helpers ──────────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();

function makeMockSupabase(): SupabaseClient {
	return {
		from: vi.fn(() => ({
			insert: mockInsert,
			select: mockSelect
		}))
	} as unknown as SupabaseClient;
}

beforeEach(() => {
	vi.resetAllMocks();
	mockInsert.mockReturnValue({ select: mockSelect });
	mockSelect.mockReturnValue({ single: mockSingle, eq: mockEq });
	mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
});

// ── createGuest ───────────────────────────────────────────────────────────────

describe('createGuest', () => {
	it('inserts a guest and returns the row', async () => {
		const mockRow = {
			id: 'guest-uuid-1',
			full_name: 'Nguyễn Văn A',
			phone: null,
			email: null,
			notes: null,
			created_at: '2026-02-16T00:00:00Z',
			updated_at: '2026-02-16T00:00:00Z'
		};
		mockSingle.mockResolvedValue({ data: mockRow, error: null });

		const supabase = makeMockSupabase();
		const result = await createGuest(supabase, { full_name: 'Nguyễn Văn A' });

		expect(result).toEqual(mockRow);
		expect(supabase.from).toHaveBeenCalledWith('guests');
	});

	it('throws when Supabase returns an error', async () => {
		mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } });

		const supabase = makeMockSupabase();
		await expect(createGuest(supabase, { full_name: 'Test' })).rejects.toThrow(
			'createGuest failed: DB error'
		);
	});

	it('throws when Supabase returns null data without error', async () => {
		mockSingle.mockResolvedValue({ data: null, error: null });

		const supabase = makeMockSupabase();
		await expect(createGuest(supabase, { full_name: 'Test' })).rejects.toThrow(
			'createGuest failed: No data returned'
		);
	});
});

// ── getGuestById ──────────────────────────────────────────────────────────────

describe('getGuestById', () => {
	it('returns the guest row when found', async () => {
		const mockRow = {
			id: 'guest-uuid-1',
			full_name: 'Trần Thị B',
			phone: '0901234567',
			email: null,
			notes: null,
			created_at: '2026-02-16T00:00:00Z',
			updated_at: '2026-02-16T00:00:00Z'
		};
		mockMaybeSingle.mockResolvedValue({ data: mockRow, error: null });

		const supabase = makeMockSupabase();
		const result = await getGuestById(supabase, 'guest-uuid-1');

		expect(result).toEqual(mockRow);
	});

	it('returns null when guest not found', async () => {
		mockMaybeSingle.mockResolvedValue({ data: null, error: null });

		const supabase = makeMockSupabase();
		const result = await getGuestById(supabase, 'nonexistent-id');

		expect(result).toBeNull();
	});

	it('throws when Supabase returns an error', async () => {
		mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'Query failed' } });

		const supabase = makeMockSupabase();
		await expect(getGuestById(supabase, 'any-id')).rejects.toThrow(
			'getGuestById failed: Query failed'
		);
	});
});

// ── updateGuestNameById ────────────────────────────────────────────────────────

describe('updateGuestNameById', () => {
	it('updates guest full_name', async () => {
		const mockUpdate = vi.fn(() => ({ eq: mockEq }));
		const supabase = {
			from: vi.fn(() => ({ update: mockUpdate }))
		} as unknown as SupabaseClient;
		mockEq.mockResolvedValue({ data: null, error: null });

		await expect(updateGuestNameById(supabase, 'guest-uuid-1', 'Tên mới')).resolves.toBeUndefined();
		expect(mockUpdate).toHaveBeenCalledWith({ full_name: 'Tên mới' });
	});

	it('throws when update fails', async () => {
		const mockUpdate = vi.fn(() => ({ eq: mockEq }));
		const supabase = {
			from: vi.fn(() => ({ update: mockUpdate }))
		} as unknown as SupabaseClient;
		mockEq.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });

		await expect(updateGuestNameById(supabase, 'guest-uuid-1', 'Tên mới')).rejects.toThrow(
			'updateGuestNameById failed: Permission denied'
		);
	});
});
