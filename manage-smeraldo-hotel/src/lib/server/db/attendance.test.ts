import { describe, it, expect, vi } from 'vitest';
import { getAttendanceByMonth, upsertAttendanceLog, getActiveStaff } from './attendance';

function createMockSupabase(responseData: unknown = [], responseError: unknown = null) {
	const chain = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		upsert: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue({ data: responseData, error: responseError })
	};

	// For queries that don't call .single() (list queries)
	chain.order.mockResolvedValue({ data: responseData, error: responseError });

	return {
		from: vi.fn().mockReturnValue(chain),
		_chain: chain
	};
}

describe('getAttendanceByMonth', () => {
	it('fetches attendance logs for the correct date range', async () => {
		const mockData = [
			{ id: '1', staff_id: 's1', log_date: '2026-02-01', shift_value: 1, logged_by: 'u1', created_at: null, updated_at: null, staff_members: { full_name: 'Alice' } }
		];
		const supabase = createMockSupabase(mockData);

		const result = await getAttendanceByMonth(supabase as never, 2026, 2);

		expect(supabase.from).toHaveBeenCalledWith('attendance_logs');
		expect(supabase._chain.gte).toHaveBeenCalledWith('log_date', '2026-02-01');
		expect(supabase._chain.lte).toHaveBeenCalledWith('log_date', '2026-02-28');
		expect(result).toEqual(mockData);
	});

	it('handles months with 31 days correctly', async () => {
		const supabase = createMockSupabase([]);

		await getAttendanceByMonth(supabase as never, 2026, 1);

		expect(supabase._chain.lte).toHaveBeenCalledWith('log_date', '2026-01-31');
	});

	it('throws on error', async () => {
		const supabase = createMockSupabase(null, { message: 'DB error' });

		await expect(getAttendanceByMonth(supabase as never, 2026, 2)).rejects.toThrow('Failed to fetch attendance logs: DB error');
	});
});

describe('upsertAttendanceLog', () => {
	it('uses upsert with onConflict for manager', async () => {
		const mockRow = { id: '1', staff_id: 's1', log_date: '2026-02-15', shift_value: 1, logged_by: 'u1', created_at: null, updated_at: null };
		const supabase = createMockSupabase(mockRow);

		const result = await upsertAttendanceLog(supabase as never, 's1', '2026-02-15', 1, 'u1', true);

		expect(supabase.from).toHaveBeenCalledWith('attendance_logs');
		expect(supabase._chain.upsert).toHaveBeenCalledWith(
			{ staff_id: 's1', log_date: '2026-02-15', shift_value: 1, logged_by: 'u1' },
			{ onConflict: 'staff_id,log_date' }
		);
		expect(result).toEqual(mockRow);
	});

	it('uses insert for reception (non-manager)', async () => {
		const mockRow = { id: '1', staff_id: 's1', log_date: '2026-02-15', shift_value: 1, logged_by: 'u1', created_at: null, updated_at: null };
		const supabase = createMockSupabase(mockRow);

		const result = await upsertAttendanceLog(supabase as never, 's1', '2026-02-15', 1, 'u1', false);

		expect(supabase.from).toHaveBeenCalledWith('attendance_logs');
		expect(supabase._chain.insert).toHaveBeenCalledWith(
			{ staff_id: 's1', log_date: '2026-02-15', shift_value: 1, logged_by: 'u1' }
		);
		expect(result).toEqual(mockRow);
	});

	it('throws on error for manager upsert', async () => {
		const supabase = createMockSupabase(null, { message: 'Upsert failed' });

		await expect(upsertAttendanceLog(supabase as never, 's1', '2026-02-15', 1, 'u1', true)).rejects.toThrow('Upsert failed');
	});

	it('falls back to update when reception insert hits conflict', async () => {
		const mockRow = { id: '1', staff_id: 's1', log_date: '2026-02-15', shift_value: 0.5, logged_by: 'u1', created_at: null, updated_at: null };

		// Insert fails with conflict, update succeeds
		const chain = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			gte: vi.fn().mockReturnThis(),
			lte: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			upsert: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			single: vi.fn()
		};

		// First call (insert) fails, second call (update) succeeds
		let callCount = 0;
		chain.single.mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				return Promise.resolve({ data: null, error: { message: 'duplicate key' } });
			}
			return Promise.resolve({ data: mockRow, error: null });
		});

		const supabase = { from: vi.fn().mockReturnValue(chain), _chain: chain };

		const result = await upsertAttendanceLog(supabase as never, 's1', '2026-02-15', 0.5, 'u1', false);

		expect(result).toEqual(mockRow);
		expect(chain.insert).toHaveBeenCalled();
		expect(chain.update).toHaveBeenCalledWith({ shift_value: 0.5, logged_by: 'u1' });
	});
});

describe('getActiveStaff', () => {
	it('fetches only active staff ordered by full_name', async () => {
		const mockStaff = [
			{ id: 's1', full_name: 'Alice', role: 'reception' },
			{ id: 's2', full_name: 'Bob', role: 'manager' }
		];
		const supabase = createMockSupabase(mockStaff);

		const result = await getActiveStaff(supabase as never);

		expect(supabase.from).toHaveBeenCalledWith('staff_members');
		expect(supabase._chain.eq).toHaveBeenCalledWith('is_active', true);
		expect(result).toEqual(mockStaff);
	});

	it('throws on error', async () => {
		const supabase = createMockSupabase(null, { message: 'Staff error' });

		await expect(getActiveStaff(supabase as never)).rejects.toThrow('Failed to fetch active staff: Staff error');
	});
});
