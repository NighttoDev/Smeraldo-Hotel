// Reports database queries — Story 6.x
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAllRooms, calculateStatusCounts } from './rooms';
import { getActiveStaff, getAttendanceByMonth } from './attendance';
import type { RoomRow, RoomStatusCounts } from './rooms';
import type { ActiveStaffMember } from '$lib/types/attendance';
import type { OccupancyReportData, DailyOccupancy, AttendanceReportData } from '$lib/types/reports';

export type { RoomRow, RoomStatusCounts };

export interface DashboardData {
	rooms: RoomRow[];
	statusCounts: RoomStatusCounts;
	activeStaff: ActiveStaffMember[];
	/** staffId → shift_value for today only; absent staff have no key (use ?? 0 when reading) */
	attendanceToday: Record<string, number>;
	today: string; // YYYY-MM-DD
}

/**
 * Fetch all data required for the manager dashboard in parallel.
 * - rooms: all 23 rooms with current status
 * - statusCounts: per-status room counts
 * - activeStaff: all active staff members
 * - attendanceToday: map of staffId → shift_value for today (absent staff not present)
 */
export async function getDashboardData(
	supabase: SupabaseClient,
	today: string // YYYY-MM-DD
): Promise<DashboardData> {
	const [year, month] = today.split('-').map(Number);

	const [rooms, activeStaff, allMonthLogs] = await Promise.all([
		getAllRooms(supabase),
		getActiveStaff(supabase),
		getAttendanceByMonth(supabase, year, month)
	]);

	const statusCounts = calculateStatusCounts(rooms);

	// Build staffId → shift_value for today only
	const attendanceToday: Record<string, number> = {};
	for (const log of allMonthLogs) {
		if (log.log_date === today) {
			attendanceToday[log.staff_id] = log.shift_value;
		}
	}

	return { rooms, statusCounts, activeStaff, attendanceToday, today };
}

/**
 * Fetch monthly occupancy report for the specified year and month.
 * Calculates daily occupancy based on bookings table (check_in_date <= date < check_out_date).
 *
 * @param supabase - Supabase client
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns OccupancyReportData with daily breakdown, metrics, peak/quiet days
 */
export async function getMonthlyOccupancyReport(
	supabase: SupabaseClient,
	year: number,
	month: number
): Promise<OccupancyReportData> {
	// Get actual room count from database
	const { count: roomCount, error: roomCountError } = await supabase
		.from('rooms')
		.select('*', { count: 'exact', head: true });

	if (roomCountError) {
		throw new Error(`Failed to fetch room count: ${roomCountError.message}`);
	}

	const totalRooms = roomCount ?? 23; // fallback to 23 if count fails

	// Calculate month boundaries
	const endDate = new Date(year, month, 0); // Last day of month
	const daysInMonth = endDate.getDate();

	// Format dates as YYYY-MM-DD for query
	const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
	const monthEnd = new Date(year, month, 1); // First day of next month
	const monthEndStr = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-01`;

	// Query bookings that overlap with this month
	const { data: bookings, error } = await supabase
		.from('bookings')
		.select('check_in_date, check_out_date, status')
		.lte('check_in_date', monthEndStr) // check_in before end of month
		.gte('check_out_date', monthStart) // check_out after start of month
		.in('status', ['confirmed', 'checked_in']);

	if (error) {
		throw new Error(`Failed to fetch monthly occupancy report: ${error.message}`);
	}

	// Initialize daily occupancy map
	const dailyOccupancyMap = new Map<string, number>();
	for (let day = 1; day <= daysInMonth; day++) {
		const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		dailyOccupancyMap.set(dateStr, 0);
	}

	// Count occupancy for each day
	if (bookings && bookings.length > 0) {
		for (const booking of bookings) {
			// Parse booking dates
			const checkIn = new Date(booking.check_in_date);
			const checkOut = new Date(booking.check_out_date);

			// Only iterate through booking's actual date range, not entire month
			const bookingStart = new Date(Math.max(checkIn.getTime(), new Date(year, month - 1, 1).getTime()));
			const bookingEnd = new Date(Math.min(checkOut.getTime(), new Date(year, month, 0, 23, 59, 59).getTime()));

			// Iterate only through days this booking occupies
			for (let d = new Date(bookingStart); d < checkOut && d <= bookingEnd; d.setDate(d.getDate() + 1)) {
				const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

				// Only count if date is within the queried month
				if (dailyOccupancyMap.has(dateStr)) {
					dailyOccupancyMap.set(dateStr, (dailyOccupancyMap.get(dateStr) || 0) + 1);
				}
			}
		}
	}

	// Build daily breakdown array
	const dailyBreakdown: DailyOccupancy[] = [];
	for (let day = 1; day <= daysInMonth; day++) {
		const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		const occupiedCount = dailyOccupancyMap.get(dateStr) || 0;
		const percentage = totalRooms > 0 ? (occupiedCount / totalRooms) * 100 : 0;

		dailyBreakdown.push({
			date: dateStr,
			occupiedCount,
			percentage: Math.round(percentage * 100) / 100 // Round to 2 decimals
		});
	}

	// Calculate metrics
	const totalRoomNights = dailyBreakdown.reduce((sum, day) => sum + day.occupiedCount, 0);
	const avgDailyOccupancy =
		daysInMonth > 0 && totalRooms > 0
			? (totalRoomNights / daysInMonth / totalRooms) * 100
			: 0;

	// Find peak and quiet days (excluding zero-occupancy days for quiet)
	let peakDay: DailyOccupancy | null = null;
	let quietDay: DailyOccupancy | null = null;

	const nonZeroDays = dailyBreakdown.filter((day) => day.occupiedCount > 0);

	if (nonZeroDays.length > 0) {
		peakDay = nonZeroDays.reduce((max, day) =>
			day.occupiedCount > max.occupiedCount ? day : max
		);
		quietDay = nonZeroDays.reduce((min, day) =>
			day.occupiedCount < min.occupiedCount ? day : min
		);
	}

	return {
		dailyBreakdown,
		totalRoomNights,
		avgDailyOccupancy: Math.round(avgDailyOccupancy * 100) / 100, // Round to 2 decimals
		peakDay,
		quietDay,
		totalRooms
	};
}

/**
 * Fetch monthly attendance report for all active staff for the specified year and month.
 * Returns ALL active staff with their daily shift values and total days worked.
 * Staff with no attendance logs will have 0.0 total days and empty dailyShifts map.
 *
 * @param supabase - Supabase client
 * @param year - Year (e.g., 2026)
 * @param month - Month (1-12)
 * @returns AttendanceReportData with staffSummary for all active staff
 */
export async function getMonthlyAttendanceReport(
	supabase: SupabaseClient,
	year: number,
	month: number
): Promise<AttendanceReportData> {
	// Step 1: Get all active staff
	const { data: staffData, error: staffError } = await supabase
		.from('staff_members')
		.select('id, full_name, role')
		.eq('is_active', true)
		.order('full_name');

	if (staffError) {
		throw new Error(`Failed to fetch staff: ${staffError.message}`);
	}

	// Step 2: Get attendance logs for the month
	const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
	const lastDay = new Date(year, month, 0).getDate();
	const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

	const { data: logsData, error: logsError } = await supabase
		.from('attendance_logs')
		.select('staff_id, log_date, shift_value')
		.gte('log_date', startDate)
		.lte('log_date', endDate);

	if (logsError) {
		throw new Error(`Failed to fetch attendance logs: ${logsError.message}`);
	}

	// Step 3: Build staffSummary with dailyShifts map and totalDays
	const staffSummary = (staffData ?? []).map((staff) => {
		const staffLogs = (logsData ?? []).filter((log) => log.staff_id === staff.id);
		const dailyShifts = new Map<string, number>();
		let totalDays = 0;

		staffLogs.forEach((log) => {
			// Extract day-of-month from DATE string (timezone-safe)
			const day = parseInt(log.log_date.split('-')[2], 10);
			dailyShifts.set(String(day), log.shift_value);
			totalDays += log.shift_value;
		});

		return {
			staffId: staff.id,
			fullName: staff.full_name,
			role: staff.role,
			dailyShifts,
			totalDays
		};
	});

	return { staffSummary };
}
