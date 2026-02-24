import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock modules BEFORE importing the module under test
vi.mock('./rooms', () => ({
	getAllRooms: vi.fn(),
	calculateStatusCounts: vi.fn()
}));

vi.mock('./attendance', () => ({
	getActiveStaff: vi.fn(),
	getAttendanceByMonth: vi.fn()
}));

import { getDashboardData, getMonthlyOccupancyReport } from './reports';
import { getAllRooms, calculateStatusCounts } from './rooms';
import { getActiveStaff, getAttendanceByMonth } from './attendance';

const mockRooms = [
	{ id: 'r1', room_number: '301', floor: 3, room_type: 'standard', status: 'occupied', current_guest_name: 'Alice', created_at: '', updated_at: '' },
	{ id: 'r2', room_number: '302', floor: 3, room_type: 'standard', status: 'available', current_guest_name: null, created_at: '', updated_at: '' },
	{ id: 'r3', room_number: '303', floor: 3, room_type: 'standard', status: 'being_cleaned', current_guest_name: null, created_at: '', updated_at: '' }
];

const mockStatusCounts = { available: 1, occupied: 1, checking_out_today: 0, being_cleaned: 1, ready: 0 };

const mockStaff = [
	{ id: 's1', full_name: 'Alice', role: 'reception' },
	{ id: 's2', full_name: 'Bob', role: 'housekeeping' }
];

const mockAttendanceLogs = [
	{ id: 'a1', staff_id: 's1', log_date: '2026-02-16', shift_value: 1, logged_by: 'u0', created_at: null, updated_at: null, staff_members: { full_name: 'Alice' } },
	{ id: 'a2', staff_id: 's2', log_date: '2026-02-15', shift_value: 0.5, logged_by: 'u0', created_at: null, updated_at: null, staff_members: { full_name: 'Bob' } } // different day
];

const mockSupabase = {} as never;

describe('getDashboardData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getAllRooms).mockResolvedValue(mockRooms as never);
		vi.mocked(calculateStatusCounts).mockReturnValue(mockStatusCounts);
		vi.mocked(getActiveStaff).mockResolvedValue(mockStaff);
		vi.mocked(getAttendanceByMonth).mockResolvedValue(mockAttendanceLogs as never);
	});

	it('calls getAllRooms, getActiveStaff and getAttendanceByMonth', async () => {
		await getDashboardData(mockSupabase, '2026-02-16');

		expect(getAllRooms).toHaveBeenCalledWith(mockSupabase);
		expect(getActiveStaff).toHaveBeenCalledWith(mockSupabase);
		expect(getAttendanceByMonth).toHaveBeenCalledWith(mockSupabase, 2026, 2);
	});

	it('returns rooms, statusCounts, activeStaff and today', async () => {
		const result = await getDashboardData(mockSupabase, '2026-02-16');

		expect(result.rooms).toEqual(mockRooms);
		expect(result.statusCounts).toEqual(mockStatusCounts);
		expect(result.activeStaff).toEqual(mockStaff);
		expect(result.today).toBe('2026-02-16');
	});

	it('filters attendanceToday to only today\'s logs', async () => {
		const result = await getDashboardData(mockSupabase, '2026-02-16');

		// s1 has a log for today (2026-02-16), s2 has a log for yesterday (2026-02-15)
		expect(result.attendanceToday).toEqual({ s1: 1 });
		expect(result.attendanceToday['s2']).toBeUndefined();
	});

	it('returns empty attendanceToday when no logs match today', async () => {
		vi.mocked(getAttendanceByMonth).mockResolvedValue([]);
		const result = await getDashboardData(mockSupabase, '2026-02-16');

		expect(result.attendanceToday).toEqual({});
	});

	it('uses correct year and month from today string', async () => {
		await getDashboardData(mockSupabase, '2026-03-01');

		expect(getAttendanceByMonth).toHaveBeenCalledWith(mockSupabase, 2026, 3);
	});

	it('propagates errors from underlying functions', async () => {
		vi.mocked(getAllRooms).mockRejectedValue(new Error('DB error'));

		await expect(getDashboardData(mockSupabase, '2026-02-16')).rejects.toThrow('DB error');
	});
});

// Story 6.2: Monthly Occupancy Report tests
describe('getMonthlyOccupancyReport', () => {
	// Type-safe mock query builder for bookings
	interface MockBookingsQueryBuilder {
		select: ReturnType<typeof vi.fn>;
		lte: ReturnType<typeof vi.fn>;
		gte: ReturnType<typeof vi.fn>;
		in: ReturnType<typeof vi.fn>;
	}

	// Type-safe mock query builder for room count
	interface MockRoomCountQueryBuilder {
		select: ReturnType<typeof vi.fn>;
	}

	const createMockBookingsQueryBuilder = (data: unknown[], error: unknown = null): MockBookingsQueryBuilder => ({
		select: vi.fn().mockReturnThis(),
		lte: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		in: vi.fn().mockResolvedValue({ data, error })
	});

	const createMockRoomCountQueryBuilder = (count: number | null, error: unknown = null): MockRoomCountQueryBuilder => ({
		select: vi.fn().mockResolvedValue({ count, error })
	});

	const mockSupabaseClient = {
		from: vi.fn()
	} as unknown as SupabaseClient;

	// Helper to set up mock for both room count and bookings queries
	const setupMocks = (bookingsData: unknown[], bookingsError: unknown = null, roomCount = 23) => {
		const mockRoomCount = createMockRoomCountQueryBuilder(roomCount, null);
		const mockBookings = createMockBookingsQueryBuilder(bookingsData, bookingsError);

		vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
			if (table === 'rooms') return mockRoomCount as never;
			if (table === 'bookings') return mockBookings as never;
			throw new Error(`Unexpected table: ${table}`);
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('queries bookings for the specified month date range', async () => {
		setupMocks([]);
		await getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2);

		expect(mockSupabaseClient.from).toHaveBeenCalledWith('rooms');
		expect(mockSupabaseClient.from).toHaveBeenCalledWith('bookings');
	});

	it('returns empty report for month with no bookings', async () => {
		setupMocks([]);
		const result = await getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2);

		// February 2026 has 28 days
		expect(result.dailyBreakdown).toHaveLength(28);
		expect(result.dailyBreakdown[0].occupiedCount).toBe(0);
		expect(result.totalRoomNights).toBe(0);
		expect(result.avgDailyOccupancy).toBe(0);
		expect(result.peakDay).toBe(null);
		expect(result.quietDay).toBe(null);
		expect(result.totalRooms).toBe(23);
	});

	it('calculates daily occupancy correctly for bookings spanning multiple days', async () => {
		const mockBookings = [
			{ check_in_date: '2026-02-01', check_out_date: '2026-02-05', status: 'checked_in' }, // 4 nights (1-4)
			{ check_in_date: '2026-02-03', check_out_date: '2026-02-06', status: 'confirmed' } // 3 nights (3-5)
		];

		setupMocks(mockBookings);
		const result = await getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2);

		// Feb 1: 1 room (booking 1)
		expect(result.dailyBreakdown[0].occupiedCount).toBe(1);
		// Feb 2: 1 room (booking 1)
		expect(result.dailyBreakdown[1].occupiedCount).toBe(1);
		// Feb 3: 2 rooms (booking 1 + booking 2)
		expect(result.dailyBreakdown[2].occupiedCount).toBe(2);
		// Feb 4: 2 rooms (booking 1 + booking 2)
		expect(result.dailyBreakdown[3].occupiedCount).toBe(2);
		// Feb 5: 1 room (booking 2 only, booking 1 checked out)
		expect(result.dailyBreakdown[4].occupiedCount).toBe(1);
		// Feb 6: 0 rooms (booking 2 checked out)
		expect(result.dailyBreakdown[5].occupiedCount).toBe(0);
	});

	it('excludes cancelled bookings from occupancy calculation', async () => {
		// Mock returns only confirmed/checked_in bookings (Supabase filters out cancelled)
		const mockBookings = [
			{ check_in_date: '2026-02-01', check_out_date: '2026-02-03', status: 'confirmed' }
			// cancelled booking filtered out by Supabase .in() clause
		];

		setupMocks(mockBookings);
		const result = await getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2);

		// Only 1 booking should count (the confirmed one)
		expect(result.dailyBreakdown[0].occupiedCount).toBe(1);
	});

	it('calculates totalRoomNights as sum of occupied counts', async () => {
		setupMocks([
			{ check_in_date: '2026-02-01', check_out_date: '2026-02-04', status: 'checked_in' } // 3 nights
		]);
		const result = await getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2);
		expect(result.totalRoomNights).toBe(3); // 3 days occupied
	});

	it('calculates avgDailyOccupancy as percentage correctly', async () => {
		setupMocks([
			{ check_in_date: '2026-02-01', check_out_date: '2026-02-03', status: 'checked_in' } // 2 nights
		]);
		const result = await getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2);

		// totalRoomNights = 2
		// daysInMonth = 28 (Feb 2026)
		// avgDailyOccupancy = (2 / 28 / 23) * 100 ≈ 0.31%
		expect(result.avgDailyOccupancy).toBeCloseTo(0.31, 1);
	});

	it('identifies peakDay correctly', async () => {
		setupMocks([
			{ check_in_date: '2026-02-01', check_out_date: '2026-02-03', status: 'checked_in' },
			{ check_in_date: '2026-02-01', check_out_date: '2026-02-03', status: 'confirmed' },
			{ check_in_date: '2026-02-05', check_out_date: '2026-02-06', status: 'checked_in' }
		]);
		const result = await getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2);

		// Peak should be Feb 1 or Feb 2 with 2 rooms
		expect(result.peakDay?.occupiedCount).toBe(2);
		expect(['2026-02-01', '2026-02-02']).toContain(result.peakDay?.date);
	});

	it('identifies quietDay correctly (excluding zero-occupancy days)', async () => {
		setupMocks([
			{ check_in_date: '2026-02-01', check_out_date: '2026-02-03', status: 'checked_in' },
			{ check_in_date: '2026-02-05', check_out_date: '2026-02-08', status: 'checked_in' },
			{ check_in_date: '2026-02-05', check_out_date: '2026-02-08', status: 'confirmed' }
		]);
		const result = await getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2);

		// Quiet should be a day with 1 room (not 0)
		expect(result.quietDay?.occupiedCount).toBe(1);
	});

	it('formats date in YYYY-MM-DD format', async () => {
		setupMocks([]);
		const result = await getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2);

		// First day should be 2026-02-01
		expect(result.dailyBreakdown[0].date).toBe('2026-02-01');
		// Last day should be 2026-02-28
		expect(result.dailyBreakdown[27].date).toBe('2026-02-28');
	});

	it('calculates percentage correctly for each day', async () => {
		setupMocks([
			{ check_in_date: '2026-02-01', check_out_date: '2026-02-02', status: 'checked_in' }
		]);
		const result = await getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2);

		// Feb 1: 1 room / 23 total = 4.35%
		expect(result.dailyBreakdown[0].percentage).toBeCloseTo(4.35, 1);
		// Feb 2: 0 rooms
		expect(result.dailyBreakdown[1].percentage).toBe(0);
	});

	it('throws error when Supabase query fails', async () => {
		setupMocks([], { message: 'DB connection failed' });
		await expect(getMonthlyOccupancyReport(mockSupabaseClient, 2026, 2)).rejects.toThrow('Failed to fetch monthly occupancy report');
	});
});

// Story 6.3: Monthly Attendance Report tests
describe('getMonthlyAttendanceReport', () => {
	// Type-safe mock query builders
	interface MockStaffQueryBuilder {
		select: ReturnType<typeof vi.fn>;
		eq: ReturnType<typeof vi.fn>;
		order: ReturnType<typeof vi.fn>;
	}

	interface MockAttendanceLogsQueryBuilder {
		select: ReturnType<typeof vi.fn>;
		gte: ReturnType<typeof vi.fn>;
		lte: ReturnType<typeof vi.fn>;
	}

	const createMockStaffQueryBuilder = (data: unknown[], error: unknown = null): MockStaffQueryBuilder => ({
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		order: vi.fn().mockResolvedValue({ data, error })
	});

	const createMockAttendanceLogsQueryBuilder = (data: unknown[], error: unknown = null): MockAttendanceLogsQueryBuilder => ({
		select: vi.fn().mockReturnThis(),
		gte: vi.fn().mockReturnThis(),
		lte: vi.fn().mockResolvedValue({ data, error })
	});

	const mockSupabaseClient = {
		from: vi.fn()
	} as unknown as SupabaseClient;

	// Helper to set up mocks for both staff and attendance queries
	const setupMocks = (staffData: unknown[], logsData: unknown[], staffError: unknown = null, logsError: unknown = null) => {
		const mockStaff = createMockStaffQueryBuilder(staffData, staffError);
		const mockLogs = createMockAttendanceLogsQueryBuilder(logsData, logsError);

		vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
			if (table === 'staff_members') return mockStaff as never;
			if (table === 'attendance_logs') return mockLogs as never;
			throw new Error(`Unexpected table: ${table}`);
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('queries staff_members and attendance_logs for the specified month', async () => {
		// Import is needed here since we're testing the function
		const { getMonthlyAttendanceReport } = await import('./reports');

		setupMocks([], []);
		await getMonthlyAttendanceReport(mockSupabaseClient, 2026, 2);

		expect(mockSupabaseClient.from).toHaveBeenCalledWith('staff_members');
		expect(mockSupabaseClient.from).toHaveBeenCalledWith('attendance_logs');
	});

	it('returns all active staff even when no attendance logs exist', async () => {
		const { getMonthlyAttendanceReport } = await import('./reports');

		const mockStaff = [
			{ id: 's1', full_name: 'Alice', role: 'manager' },
			{ id: 's2', full_name: 'Bob', role: 'reception' }
		];

		setupMocks(mockStaff, []);
		const result = await getMonthlyAttendanceReport(mockSupabaseClient, 2026, 2);

		expect(result.staffSummary).toHaveLength(2);
		expect(result.staffSummary[0].staffId).toBe('s1');
		expect(result.staffSummary[0].fullName).toBe('Alice');
		expect(result.staffSummary[0].role).toBe('manager');
		expect(result.staffSummary[0].totalDays).toBe(0);
		expect(result.staffSummary[0].dailyShifts.size).toBe(0);
	});

	it('calculates total days worked correctly by summing shift values', async () => {
		const { getMonthlyAttendanceReport } = await import('./reports');

		const mockStaff = [{ id: 's1', full_name: 'Alice', role: 'reception' }];
		const mockLogs = [
			{ staff_id: 's1', log_date: '2026-02-01', shift_value: 1 },
			{ staff_id: 's1', log_date: '2026-02-02', shift_value: 1 },
			{ staff_id: 's1', log_date: '2026-02-03', shift_value: 0.5 }
		];

		setupMocks(mockStaff, mockLogs);
		const result = await getMonthlyAttendanceReport(mockSupabaseClient, 2026, 2);

		expect(result.staffSummary[0].totalDays).toBe(2.5); // 1 + 1 + 0.5
	});

	it('populates dailyShifts map with day-of-month as key', async () => {
		const { getMonthlyAttendanceReport } = await import('./reports');

		const mockStaff = [{ id: 's1', full_name: 'Alice', role: 'reception' }];
		const mockLogs = [
			{ staff_id: 's1', log_date: '2026-02-01', shift_value: 1 },
			{ staff_id: 's1', log_date: '2026-02-15', shift_value: 0.5 }
		];

		setupMocks(mockStaff, mockLogs);
		const result = await getMonthlyAttendanceReport(mockSupabaseClient, 2026, 2);

		const dailyShifts = result.staffSummary[0].dailyShifts;
		expect(dailyShifts.get('1')).toBe(1);
		expect(dailyShifts.get('15')).toBe(0.5);
		expect(dailyShifts.has('2')).toBe(false); // No log for day 2
	});

	it('handles multiple staff members correctly', async () => {
		const { getMonthlyAttendanceReport } = await import('./reports');

		const mockStaff = [
			{ id: 's1', full_name: 'Alice', role: 'manager' },
			{ id: 's2', full_name: 'Bob', role: 'reception' },
			{ id: 's3', full_name: 'Charlie', role: 'housekeeping' }
		];

		const mockLogs = [
			{ staff_id: 's1', log_date: '2026-02-01', shift_value: 1 },
			{ staff_id: 's1', log_date: '2026-02-02', shift_value: 1 },
			{ staff_id: 's2', log_date: '2026-02-01', shift_value: 0.5 },
			{ staff_id: 's3', log_date: '2026-02-03', shift_value: 1 }
		];

		setupMocks(mockStaff, mockLogs);
		const result = await getMonthlyAttendanceReport(mockSupabaseClient, 2026, 2);

		expect(result.staffSummary).toHaveLength(3);

		// Alice: 2 full days
		expect(result.staffSummary[0].totalDays).toBe(2);
		expect(result.staffSummary[0].dailyShifts.get('1')).toBe(1);
		expect(result.staffSummary[0].dailyShifts.get('2')).toBe(1);

		// Bob: 0.5 days
		expect(result.staffSummary[1].totalDays).toBe(0.5);
		expect(result.staffSummary[1].dailyShifts.get('1')).toBe(0.5);

		// Charlie: 1 day
		expect(result.staffSummary[2].totalDays).toBe(1);
		expect(result.staffSummary[2].dailyShifts.get('3')).toBe(1);
	});

	it('filters attendance logs to only the specified month', async () => {
		const { getMonthlyAttendanceReport } = await import('./reports');

		const mockStaff = [{ id: 's1', full_name: 'Alice', role: 'reception' }];
		const mockLogs = [
			{ staff_id: 's1', log_date: '2026-02-01', shift_value: 1 },
			// Logs from other months should be filtered out by Supabase
		];

		setupMocks(mockStaff, mockLogs);
		const result = await getMonthlyAttendanceReport(mockSupabaseClient, 2026, 2);

		// Only Feb logs should be included
		expect(result.staffSummary[0].totalDays).toBe(1);
	});

	it('throws error when staff query fails', async () => {
		const { getMonthlyAttendanceReport } = await import('./reports');

		setupMocks([], [], { message: 'Staff query failed' }, null);
		await expect(getMonthlyAttendanceReport(mockSupabaseClient, 2026, 2)).rejects.toThrow('Failed to fetch staff');
	});

	it('throws error when attendance logs query fails', async () => {
		const { getMonthlyAttendanceReport } = await import('./reports');

		const mockStaff = [{ id: 's1', full_name: 'Alice', role: 'reception' }];
		setupMocks(mockStaff, [], null, { message: 'Logs query failed' });
		await expect(getMonthlyAttendanceReport(mockSupabaseClient, 2026, 2)).rejects.toThrow('Failed to fetch attendance logs');
	});

	it('handles zero shift values correctly', async () => {
		const { getMonthlyAttendanceReport } = await import('./reports');

		const mockStaff = [{ id: 's1', full_name: 'Alice', role: 'reception' }];
		const mockLogs = [
			{ staff_id: 's1', log_date: '2026-02-01', shift_value: 1 },
			{ staff_id: 's1', log_date: '2026-02-02', shift_value: 0 }, // Absent
			{ staff_id: 's1', log_date: '2026-02-03', shift_value: 0.5 }
		];

		setupMocks(mockStaff, mockLogs);
		const result = await getMonthlyAttendanceReport(mockSupabaseClient, 2026, 2);

		expect(result.staffSummary[0].totalDays).toBe(1.5); // 1 + 0 + 0.5
		expect(result.staffSummary[0].dailyShifts.get('2')).toBe(0);
	});

	it('returns empty staffSummary when no active staff exist', async () => {
		const { getMonthlyAttendanceReport } = await import('./reports');

		setupMocks([], []);
		const result = await getMonthlyAttendanceReport(mockSupabaseClient, 2026, 2);

		expect(result.staffSummary).toHaveLength(0);
	});
});
